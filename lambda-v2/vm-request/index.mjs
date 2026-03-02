import Anthropic from '@anthropic-ai/sdk';
import { authenticateRequest } from './auth.mjs';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const TEAMS_WEBHOOK_URL = process.env.TEAMS_WEBHOOK_URL || '';
const SERVICEDESK_URL = process.env.SERVICEDESK_URL || '';
const SERVICEDESK_TOKEN = process.env.SERVICEDESK_TOKEN || '';

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

const reply = (code, body) => ({
  statusCode: code,
  headers: HEADERS,
  body: JSON.stringify(body),
});

const VM_SPEC_SYSTEM = `You are a cloud infrastructure advisor. Based on a web application's details, recommend appropriate Azure VM specifications.

Return ONLY a JSON object — no extra text:
{
  "vmSize": "Standard_B2s",
  "cpu": 2,
  "ramGB": 4,
  "storagGB": 30,
  "os": "Ubuntu 22.04 LTS",
  "justification": "Brief technical justification (1 sentence)",
  "estimatedMonthlyCost": "~$35/month"
}

Sizing guide:
- Prototype/demo (<10 users, simple React): Standard_B1ms (1 vCPU, 2GB)
- Internal tool (10-50 users): Standard_B2s (2 vCPU, 4GB)
- Team dashboard (50-200 users): Standard_D2s_v3 (2 vCPU, 8GB)
- Production app (200+ users): Standard_D4s_v3 (4 vCPU, 16GB)`;

async function generateVmSpec({ appName, stack, estimatedUsers, justification }) {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      temperature: 0,
      system: VM_SPEC_SYSTEM,
      messages: [{
        role: 'user',
        content: `App: "${appName}", Stack: ${stack || 'react'}, Estimated users: ${estimatedUsers || 10}, Description: ${justification || 'Internal analytics tool'}`,
      }],
    });

    const text = response.content[0]?.text || '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch (err) {
    console.warn('VM spec generation failed:', err.message);
    return null;
  }
}

async function sendTeamsNotification({
  appName, repoUrl, reviewScore, stack, estimatedUsers,
  vmSize, duration, requester, source, ticketId,
}) {
  if (!TEAMS_WEBHOOK_URL) return false;

  const facts = [
    { name: 'Application', value: appName },
    { name: 'Source', value: source === 'uploaded' ? 'Uploaded & Reviewed' : 'AI Generated' },
    { name: 'Review Score', value: `${reviewScore}/100 ✓` },
    { name: 'Stack', value: stack || 'React' },
    { name: 'Estimated Users', value: String(estimatedUsers || 'N/A') },
    { name: 'VM Requested', value: vmSize || 'TBD' },
    { name: 'Duration', value: duration || 'TBD' },
    { name: 'Requested By', value: requester },
  ];

  if (ticketId) {
    facts.push({ name: 'Ticket ID', value: ticketId });
  }

  const card = {
    '@type': 'MessageCard',
    '@context': 'http://schema.org/extensions',
    themeColor: '06B6D4',
    summary: `New App Deployment Request: ${appName}`,
    sections: [{
      activityTitle: `New App Ready — ${appName}`,
      activitySubtitle: `Submitted by ${requester}`,
      facts,
      markdown: true,
    }],
    potentialAction: repoUrl ? [{
      '@type': 'OpenUri',
      name: 'View GitLab Repository',
      targets: [{ os: 'default', uri: repoUrl }],
    }] : [],
  };

  try {
    const res = await fetch(TEAMS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card),
    });
    return res.ok;
  } catch (err) {
    console.warn('Teams notification failed:', err.message);
    return false;
  }
}

async function submitToServiceDesk(ticketData) {
  if (!SERVICEDESK_URL) return null;

  try {
    const res = await fetch(SERVICEDESK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(SERVICEDESK_TOKEN ? { Authorization: `Bearer ${SERVICEDESK_TOKEN}` } : {}),
      },
      body: JSON.stringify(ticketData),
    });

    if (!res.ok) {
      console.warn(`Service Desk API returned ${res.status}`);
      return null;
    }

    const data = await res.json();
    return data.id || data.ticketId || data.number || data.sys_id || null;
  } catch (err) {
    console.warn('Service Desk submission failed:', err.message);
    return null;
  }
}

export const handler = async (event) => {
  if (event.requestContext?.http?.method === 'OPTIONS') return reply(200, {});

  const { user, error: authError, statusCode } = await authenticateRequest(event);
  if (authError) return reply(statusCode, { error: authError });

  try {
    const {
      appName,
      repoUrl = null,
      stack = 'react',
      estimatedUsers = 10,
      justification = '',
      vmSize = null,
      duration = '3 months',
      reviewScore = 0,
      source = 'generated',
    } = JSON.parse(event.body || '{}');

    if (!appName?.trim()) return reply(400, { error: 'appName is required' });

    const requester = user.email || user.sub;
    console.log(`VM request for "${appName}" by ${requester}`);

    // Generate VM spec if not explicitly provided
    const vmSpec = vmSize
      ? { vmSize, justification }
      : await generateVmSpec({ appName, stack, estimatedUsers, justification }) || { vmSize: 'Standard_B2s', justification: 'Default sizing for React web app' };

    // Build Service Desk ticket payload
    const ticketData = {
      title: `VM Request — ${appName}`,
      short_description: `Infrastructure request for web application: ${appName}`,
      description: [
        `APPLICATION DETAILS`,
        `App Name: ${appName}`,
        `Repository: ${repoUrl || 'N/A'}`,
        `Tech Stack: ${stack}`,
        `Estimated Users: ${estimatedUsers}`,
        `Duration: ${duration}`,
        `Review Score: ${reviewScore}/100`,
        `Business Justification: ${justification || 'Internal analytics tool'}`,
        ``,
        `RECOMMENDED VM CONFIGURATION`,
        `Azure VM Size: ${vmSpec.vmSize}`,
        `CPU: ${vmSpec.cpu || 'N/A'} vCPU`,
        `RAM: ${vmSpec.ramGB || 'N/A'} GB`,
        `Storage: ${vmSpec.storagGB || 30} GB`,
        `OS: ${vmSpec.os || 'Ubuntu 22.04 LTS'}`,
        `Estimated Cost: ${vmSpec.estimatedMonthlyCost || 'TBD'}`,
        `Technical Justification: ${vmSpec.justification || ''}`,
        ``,
        `SUBMITTED BY: ${requester}`,
        `SUBMITTED ON: ${new Date().toISOString()}`,
        `SUBMITTED VIA: AI App Factory`,
      ].join('\n'),
      category: 'Infrastructure',
      subcategory: 'VM Provisioning',
      priority: 'Medium',
      requester,
      appName,
      vmSpec,
      repoUrl,
      duration,
    };

    // Submit to Service Desk and notify Teams concurrently (both best-effort)
    const [ticketId, teamsMessageSent] = await Promise.all([
      submitToServiceDesk(ticketData),
      sendTeamsNotification({ appName, repoUrl, reviewScore, stack, estimatedUsers, vmSize: vmSpec.vmSize, duration, requester, source, ticketId: null }),
    ]);

    return reply(200, {
      success: true,
      ticketId,
      vmSpec,
      teamsMessageSent,
      // Return the full ticket payload if Service Desk is not configured (for manual submission)
      ...(SERVICEDESK_URL ? {} : { ticketPayload: ticketData }),
    });

  } catch (error) {
    console.error('VM request error:', error);
    return reply(500, { error: error.message });
  }
};
