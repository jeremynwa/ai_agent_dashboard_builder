// tools/http.mjs — call_api tool for generic HTTP requests
export const callApiTool = {
  name: 'call_api',
  category: 'data',
  displayName: 'Appeler une API',
  icon: '\u{1F310}',
  description: 'Make an HTTP request to an external API. Supports GET, POST, PUT, DELETE with custom headers and body.',
  input_schema: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'Full URL to call' },
      method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], description: 'HTTP method (default: GET)' },
      headers: { type: 'object', description: 'HTTP headers as key-value pairs (optional)' },
      body: { type: 'string', description: 'Request body as JSON string (for POST/PUT/PATCH)' },
    },
    required: ['url'],
  },
  requiredSecrets: [],
  execute: async (input) => {
    const method = input.method || 'GET';

    // Block requests to internal/private networks
    const urlObj = new URL(input.url);
    const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '169.254.169.254'];
    if (blockedHosts.includes(urlObj.hostname)) {
      throw new Error(`Blocked request to internal host: ${urlObj.hostname}`);
    }

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...input.headers,
      },
    };

    if (['POST', 'PUT', 'PATCH'].includes(method) && input.body) {
      options.body = input.body;
    }

    const res = await fetch(input.url, options);
    const contentType = res.headers.get('content-type') || '';
    let data;

    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      const text = await res.text();
      // Truncate large responses
      data = text.length > 10000 ? text.slice(0, 10000) + '... (truncated)' : text;
    }

    return {
      success: res.ok,
      status: res.status,
      statusText: res.statusText,
      data,
    };
  },
};
