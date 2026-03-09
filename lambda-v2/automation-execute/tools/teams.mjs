// tools/teams.mjs — send_teams_message tool via webhook
export const sendTeamsMessageTool = {
  name: 'send_teams_message',
  category: 'communication',
  displayName: 'Poster sur Teams',
  icon: '\u{1F4AC}',
  description: 'Post a message to a Microsoft Teams channel via incoming webhook. Supports Adaptive Card format or simple text.',
  input_schema: {
    type: 'object',
    properties: {
      message: { type: 'string', description: 'Message text to post (markdown supported)' },
      title: { type: 'string', description: 'Optional card title for rich formatting' },
    },
    required: ['message'],
  },
  requiredSecrets: ['TEAMS_WEBHOOK_URL'],
  execute: async (input, secrets) => {
    const webhookUrl = secrets.TEAMS_WEBHOOK_URL;
    if (!webhookUrl) throw new Error('TEAMS_WEBHOOK_URL not configured');

    // Build Adaptive Card payload
    const card = {
      type: 'message',
      attachments: [{
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.4',
          body: [
            ...(input.title ? [{
              type: 'TextBlock',
              text: input.title,
              weight: 'Bolder',
              size: 'Medium',
            }] : []),
            {
              type: 'TextBlock',
              text: input.message,
              wrap: true,
            },
          ],
        },
      }],
    };

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Teams webhook error ${res.status}: ${errText}`);
    }

    return {
      success: true,
      message: `Message posted to Teams${input.title ? ` with title "${input.title}"` : ''}`,
    };
  },
};
