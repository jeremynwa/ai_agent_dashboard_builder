import { authenticateRequest } from './auth.mjs';

const GITLAB_URL = (process.env.GITLAB_URL || '').replace(/\/$/, '');
const GITLAB_TOKEN = process.env.GITLAB_TOKEN || '';
const GITLAB_GROUP_ID = process.env.GITLAB_GROUP_ID || '';
const GITLAB_TEAM_MEMBERS = (process.env.GITLAB_TEAM_MEMBERS || '').split(',').map(s => s.trim()).filter(Boolean);
const GITLAB_MEMBER_ACCESS_LEVEL = 40; // Developer

// ─── CI/CD Pipeline Templates ────────────────────────────────────────────────

function detectStack(files) {
  const pkgRaw = files['package.json'] || files['./package.json'];
  if (pkgRaw) {
    try {
      const pkg = JSON.parse(pkgRaw);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (deps['next']) return 'next';
      if (deps['nuxt']) return 'nuxt';
      if (deps['@sveltejs/kit']) return 'sveltekit';
      if (deps['svelte']) return 'svelte';
      if (deps['@angular/core']) return 'angular';
      if (deps['vue']) return 'vue';
      if (deps['react']) return 'react';
      if (deps['vite']) return 'vite';
    } catch {}
  }
  // Fallback via file extensions
  const paths = Object.keys(files);
  if (paths.some(p => p.endsWith('.vue'))) return 'vue';
  if (paths.some(p => p.endsWith('.svelte'))) return 'svelte';
  if (paths.some(p => p.endsWith('.jsx') || p.endsWith('.tsx'))) return 'react';
  return 'node';
}

function getBuildCommand(stack) {
  return 'npm run build';
}

function getDistDir(stack) {
  if (stack === 'next') return '.next';
  if (stack === 'nuxt') return '.output/public';
  if (stack === 'sveltekit') return 'build';
  if (stack === 'angular') return 'dist';
  return 'dist'; // react, vue, svelte, vite, node
}

function gitlabCiYaml(stack) {
  const distDir = getDistDir(stack);
  const buildCmd = getBuildCommand(stack);

  if (stack === 'next') {
    return `# GitLab CI/CD — Next.js
# Builds and deploys to GitLab Pages (static export)
# Requires: next.config.js output: 'export'

image: node:20-alpine

variables:
  NODE_ENV: production

cache:
  key: \${CI_COMMIT_REF_SLUG}
  paths:
    - node_modules/
    - .next/cache/

stages:
  - build
  - deploy

build:
  stage: build
  script:
    - npm ci
    - ${buildCmd}
  artifacts:
    paths:
      - out/
    expire_in: 1 hour

pages:
  stage: deploy
  script:
    - cp -r out public
  artifacts:
    paths:
      - public
  only:
    - main
`;
  }

  return `# GitLab CI/CD — ${stack.charAt(0).toUpperCase() + stack.slice(1)}
# Builds and deploys to GitLab Pages

image: node:20-alpine

variables:
  NODE_ENV: production

cache:
  key: \${CI_COMMIT_REF_SLUG}
  paths:
    - node_modules/

stages:
  - build
  - deploy

build:
  stage: build
  script:
    - npm ci
    - ${buildCmd}
  artifacts:
    paths:
      - ${distDir}/
    expire_in: 1 hour

pages:
  stage: deploy
  script:
    - mv ${distDir} public
  artifacts:
    paths:
      - public
  only:
    - main
`;
}

function azurePipelinesYaml(stack, projectName) {
  const distDir = getDistDir(stack);
  const buildCmd = getBuildCommand(stack);

  return `# Azure Pipelines — ${stack.charAt(0).toUpperCase() + stack.slice(1)}
# Builds and deploys to Azure Static Web Apps
# Configure: AZURE_STATIC_WEB_APPS_API_TOKEN in pipeline variables

trigger:
  branches:
    include:
      - main

pool:
  vmImage: ubuntu-latest

variables:
  NODE_VERSION: '20'

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '\$(NODE_VERSION)'
    displayName: 'Install Node.js'

  - script: npm ci
    displayName: 'Install dependencies'

  - script: ${buildCmd}
    displayName: 'Build application'

  - task: AzureStaticWebApp@0
    inputs:
      app_location: '/'
      output_location: '${distDir}'
      azure_static_web_apps_api_token: '\$(AZURE_STATIC_WEB_APPS_API_TOKEN)'
    displayName: 'Deploy to Azure Static Web Apps'
`;
}

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

const reply = (code, body) => ({
  statusCode: code,
  headers: HEADERS,
  body: JSON.stringify(body),
});

async function gitlabApi(path, method = 'GET', body = null) {
  const url = `${GITLAB_URL}/api/v4${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Private-Token': GITLAB_TOKEN,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`GitLab API ${method} ${path} → ${res.status}: ${JSON.stringify(data?.message || data)}`);
  }
  return data;
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
}

export const handler = async (event) => {
  if (event.requestContext?.http?.method === 'OPTIONS') return reply(200, {});

  const { user, error: authError, statusCode } = await authenticateRequest(event);
  if (authError) return reply(statusCode, { error: authError });

  if (!GITLAB_URL || !GITLAB_TOKEN) {
    return reply(503, { error: 'GitLab integration not configured — set GITLAB_URL and GITLAB_TOKEN' });
  }

  try {
    const {
      files: rawFiles,
      projectName,
      description = `Generated by AI App Factory — ${new Date().toISOString().slice(0, 10)}`,
      generateCI = false,
    } = JSON.parse(event.body || '{}');

    if (!rawFiles || Object.keys(rawFiles).length === 0) {
      return reply(400, { error: 'files is required (flat map of path -> content)' });
    }
    if (!projectName?.trim()) {
      return reply(400, { error: 'projectName is required' });
    }

    // Inject CI/CD files if requested
    const files = { ...rawFiles };
    let ciFilesAdded = [];
    if (generateCI) {
      const stack = detectStack(files);
      files['.gitlab-ci.yml'] = gitlabCiYaml(stack);
      files['azure-pipelines.yml'] = azurePipelinesYaml(stack, projectName);
      ciFilesAdded = ['.gitlab-ci.yml', 'azure-pipelines.yml'];
      console.log(`CI/CD generated for stack: ${stack}`);
    }

    const slug = slugify(projectName);
    const requester = user.email || user.sub;
    console.log(`GitLab push: "${slug}" by ${requester} (CI: ${generateCI})`);

    // Build project creation payload
    const projectPayload = {
      name: projectName,
      path: slug,
      description,
      visibility: 'private',
      initialize_with_readme: false,
      default_branch: 'main',
    };

    if (GITLAB_GROUP_ID) {
      projectPayload.namespace_id = parseInt(GITLAB_GROUP_ID, 10);
    }

    // Create the project (repo)
    let project;
    try {
      project = await gitlabApi('/projects', 'POST', projectPayload);
    } catch (err) {
      // If project already exists under this namespace, try with a timestamp suffix
      if (err.message.includes('has already been taken')) {
        const fallbackSlug = `${slug}-${Date.now().toString(36)}`;
        projectPayload.path = fallbackSlug;
        projectPayload.name = `${projectName} (${new Date().toISOString().slice(0, 10)})`;
        project = await gitlabApi('/projects', 'POST', projectPayload);
      } else {
        throw err;
      }
    }

    // Build commit actions (one per file)
    const actions = Object.entries(files)
      .filter(([, content]) => typeof content === 'string')
      .map(([filePath, content]) => ({
        action: 'create',
        file_path: filePath.startsWith('/') ? filePath.slice(1) : filePath,
        content,
        encoding: 'text',
      }));

    if (actions.length === 0) {
      return reply(400, { error: 'No valid text files to commit' });
    }

    // Commit all files in one push
    await gitlabApi(`/projects/${project.id}/repository/commits`, 'POST', {
      branch: 'main',
      commit_message: `Initial commit — AI App Factory\n\nApp: ${projectName}\nSubmitted by: ${requester}\nTimestamp: ${new Date().toISOString()}`,
      actions,
    });

    // Add team members as Developers (best effort — don't fail if a user isn't found)
    const collaboratorsAdded = [];
    for (const username of GITLAB_TEAM_MEMBERS) {
      try {
        const users = await gitlabApi(`/users?username=${encodeURIComponent(username)}`);
        const gitlabUser = users[0];
        if (gitlabUser) {
          await gitlabApi(`/projects/${project.id}/members`, 'POST', {
            user_id: gitlabUser.id,
            access_level: GITLAB_MEMBER_ACCESS_LEVEL,
          });
          collaboratorsAdded.push(username);
        } else {
          console.warn(`GitLab user not found: ${username}`);
        }
      } catch (err) {
        // Non-fatal: log and continue
        console.warn(`Could not add collaborator "${username}": ${err.message}`);
      }
    }

    return reply(200, {
      success: true,
      repoUrl: project.http_url_to_repo,
      webUrl: project.web_url,
      projectId: project.id,
      projectName: project.name,
      filesCommitted: actions.length,
      collaboratorsAdded,
      pendingCollaborators: GITLAB_TEAM_MEMBERS.filter(m => !collaboratorsAdded.includes(m)),
      ciFilesAdded,
    });

  } catch (error) {
    console.error('Git push error:', error);
    return reply(500, { error: error.message });
  }
};
