/**
 * manage-skills.mjs — CLI for managing Anthropic Agent Skills
 *
 * Commands:
 *   node manage-skills.mjs list              List all custom skills
 *   node manage-skills.mjs get <skill-id>    Retrieve skill details
 *   node manage-skills.mjs upload <folder>   Upload a new skill from folder
 *   node manage-skills.mjs delete <skill-id> Delete a skill (and all versions)
 *
 * API key: loaded from ANTHROPIC_API_KEY env var or backend/.env
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import { createReadStream, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Load API key ─────────────────────────────────────────────
if (!process.env.ANTHROPIC_API_KEY) {
  try {
    const envPath = path.resolve(__dirname, '..', 'backend', '.env');
    const envContent = readFileSync(envPath, 'utf-8');
    const match = envContent.match(/ANTHROPIC_API_KEY=(.+)/);
    if (match) {
      process.env.ANTHROPIC_API_KEY = match[1].trim().replace(/^["']|["']$/g, '');
      console.log('API key loaded from backend/.env\n');
    }
  } catch {
    console.error('No ANTHROPIC_API_KEY found. Set it or create backend/.env');
    process.exit(1);
  }
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const BETA_HEADER = 'skills-2025-10-02';
const API_BASE = 'https://api.anthropic.com/v1';

function apiHeaders(extra = {}) {
  return {
    'x-api-key': process.env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
    'anthropic-beta': BETA_HEADER,
    ...extra
  };
}

// ─── List Skills ──────────────────────────────────────────────

async function listSkills() {
  console.log('Listing all skills...\n');

  try {
    // Try SDK first
    const skills = await anthropic.beta.skills.list({
      betas: [BETA_HEADER]
    });

    if (skills.data && skills.data.length > 0) {
      console.log(`Found ${skills.data.length} skill(s):\n`);
      for (const skill of skills.data) {
        console.log(`  ${skill.id}`);
        console.log(`    Title: ${skill.display_title}`);
        console.log(`    Source: ${skill.source}`);
        console.log(`    Version: ${skill.latest_version}`);
        console.log(`    Created: ${skill.created_at}`);
        console.log(`    Updated: ${skill.updated_at}`);
        console.log();
      }
    } else {
      console.log('  No custom skills found.\n');
    }

    return skills;
  } catch (sdkErr) {
    console.log(`SDK method failed (${sdkErr.message}), trying HTTP...\n`);

    const response = await fetch(`${API_BASE}/skills`, {
      headers: apiHeaders()
    });
    const data = await response.json();

    if (!response.ok) {
      console.error('Error:', JSON.stringify(data, null, 2));
      return;
    }

    console.log(JSON.stringify(data, null, 2));
    return data;
  }
}

// ─── Get Skill ────────────────────────────────────────────────

async function getSkill(skillId) {
  console.log(`Retrieving skill ${skillId}...\n`);

  try {
    const skill = await anthropic.beta.skills.retrieve(skillId, {
      betas: [BETA_HEADER]
    });

    console.log(JSON.stringify(skill, null, 2));
    return skill;
  } catch (sdkErr) {
    console.log(`SDK method failed (${sdkErr.message}), trying HTTP...\n`);

    const response = await fetch(`${API_BASE}/skills/${skillId}`, {
      headers: apiHeaders()
    });
    const data = await response.json();

    if (!response.ok) {
      console.error('Error:', JSON.stringify(data, null, 2));
      return;
    }

    console.log(JSON.stringify(data, null, 2));
    return data;
  }
}

// ─── Upload Skill ─────────────────────────────────────────────

async function uploadSkill(skillPath) {
  const absPath = path.resolve(skillPath);
  console.log(`Uploading skill from ${absPath}...\n`);

  // 1. Verify SKILL.md exists
  const skillMdPath = path.join(absPath, 'SKILL.md');
  try {
    await fs.access(skillMdPath);
  } catch {
    console.error(`Error: SKILL.md not found in ${absPath}`);
    process.exit(1);
  }

  // 2. Parse SKILL.md frontmatter
  const skillMd = await fs.readFile(skillMdPath, 'utf-8');
  const frontmatterMatch = skillMd.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatterMatch) {
    console.error('Error: SKILL.md must have YAML frontmatter (---\\nname: ...\\n---)');
    process.exit(1);
  }

  const frontmatter = frontmatterMatch[1];
  const name = frontmatter.match(/name:\s*(.+)/)?.[1]?.trim();
  const description = frontmatter.match(/description:\s*(.+)/)?.[1]?.trim();

  if (!name) {
    console.error('Error: "name" not found in SKILL.md frontmatter');
    process.exit(1);
  }

  console.log(`  Name: ${name}`);
  if (description) console.log(`  Description: ${description.substring(0, 80)}...`);

  // 3. Collect all files recursively
  const allFiles = await collectFiles(absPath, absPath);
  console.log(`  Files: ${allFiles.length}`);
  for (const f of allFiles) {
    console.log(`    - ${f}`);
  }
  console.log();

  // 4. Check if a skill with the same name already exists — delete it first
  {
    try {
      const existing = await anthropic.beta.skills.list({ betas: [BETA_HEADER] });
      const duplicate = existing.data?.find(s => s.display_title === name);
      if (duplicate) {
        console.log(`  Existing skill found: ${duplicate.id} — deleting to replace...`);
        await deleteSkill(duplicate.id);
      }
    } catch (e) {
      console.warn(`  Warning: could not check for existing skills: ${e.message}`);
    }
  }

  // 5. Upload via SDK using createReadStream
  //    File paths must include a top-level directory prefix (like Python SDK)
  //    e.g. "dashboard-generator/SKILL.md", "dashboard-generator/references/charts.md"
  {
    const skillDirName = name; // Must match SKILL.md frontmatter name (API enforces this)

    // SKILL.md must be first
    const sortedFiles = [...allFiles].sort((a, b) => {
      if (a === 'SKILL.md') return -1;
      if (b === 'SKILL.md') return 1;
      return a.localeCompare(b);
    });

    const uploadFiles = [];
    for (const file of sortedFiles) {
      const filePath = path.join(absPath, file);
      const content = await fs.readFile(filePath);
      // Prefix with top-level dir name so API sees "dashboard-generator/SKILL.md"
      const uploadName = `${skillDirName}/${file}`;
      console.log(`  Uploading as: ${uploadName}`);
      const uploadable = await Anthropic.toFile(content, uploadName);
      uploadFiles.push(uploadable);
    }

    const skill = await anthropic.beta.skills.create({
      display_title: name,
      files: uploadFiles,
      betas: [BETA_HEADER]
    });

    console.log('\nSkill created successfully!\n');
    console.log(`  ID: ${skill.id}`);
    console.log(`  Title: ${skill.display_title}`);
    console.log(`  Version: ${skill.latest_version}`);
    console.log(`  Created: ${skill.created_at}\n`);

    return skill;
  }
}

async function collectFiles(dir, rootDir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(rootDir, fullPath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      const subFiles = await collectFiles(fullPath, rootDir);
      files.push(...subFiles);
    } else {
      files.push(relPath);
    }
  }

  return files;
}

// ─── Delete Skill ─────────────────────────────────────────────

async function deleteSkill(skillId) {
  console.log(`Deleting skill ${skillId}...\n`);

  // Step 1: List and delete all versions first
  try {
    const versionsResp = await fetch(`${API_BASE}/skills/${skillId}/versions?beta=true`, {
      headers: apiHeaders()
    });
    if (versionsResp.ok) {
      const versionsData = await versionsResp.json();
      const versions = versionsData.data || versionsData.versions || [];
      if (versions.length > 0) {
        console.log(`  Found ${versions.length} version(s) to delete...`);
        for (const v of versions) {
          const versionId = v.version || v.id || v;
          const delV = await fetch(`${API_BASE}/skills/${skillId}/versions/${versionId}?beta=true`, {
            method: 'DELETE',
            headers: apiHeaders()
          });
          if (delV.ok) {
            console.log(`  Deleted version ${versionId}`);
          } else {
            const err = await delV.json().catch(() => ({}));
            console.warn(`  Warning: version ${versionId} delete failed:`, JSON.stringify(err));
          }
        }
      }
    }
  } catch (e) {
    console.warn(`  Warning: could not list versions: ${e.message}`);
  }

  // Step 2: Delete the skill itself
  const response = await fetch(`${API_BASE}/skills/${skillId}?beta=true`, {
    method: 'DELETE',
    headers: apiHeaders()
  });

  if (response.ok) {
    console.log('  Skill deleted successfully.\n');
  } else {
    const error = await response.json();
    console.error('  Delete failed:', JSON.stringify(error, null, 2));
  }
}

// ─── CLI ──────────────────────────────────────────────────────

const [,, command, ...args] = process.argv;

switch (command) {
  case 'list':
    await listSkills();
    break;

  case 'get':
    if (!args[0]) {
      console.error('Usage: node manage-skills.mjs get <skill-id>');
      process.exit(1);
    }
    await getSkill(args[0]);
    break;

  case 'upload':
    if (!args[0]) {
      console.error('Usage: node manage-skills.mjs upload <skill-folder-path>');
      process.exit(1);
    }
    await uploadSkill(args[0]);
    break;

  case 'delete':
    if (!args[0]) {
      console.error('Usage: node manage-skills.mjs delete <skill-id>');
      process.exit(1);
    }
    await deleteSkill(args[0]);
    break;

  default:
    console.log('Skills Management CLI\n');
    console.log('Commands:');
    console.log('  list                      List all custom skills');
    console.log('  get <skill-id>            Retrieve skill details');
    console.log('  upload <folder>           Upload a new skill from folder');
    console.log('  delete <skill-id>         Delete a skill\n');
    console.log('Examples:');
    console.log('  node manage-skills.mjs list');
    console.log('  node manage-skills.mjs upload skills/dashboard-generator');
    console.log('  node manage-skills.mjs get skill_01AbCdEf');
    console.log('  node manage-skills.mjs delete skill_01AbCdEf\n');
    process.exit(0);
}
