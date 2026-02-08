// frontend/src/services/api.js
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function generateApp(prompt, excelData = null) {
  const res = await fetch(`${API_BASE}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, useRules: true, excelData }),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Generation failed');
  return res.json();
}

// Now expects a flat map: { "index.html": "...", "assets/index.js": "..." }
export async function publishApp(builtFiles, appName) {
  const res = await fetch(`${API_BASE}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ builtFiles, appName }),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Publish failed');
  return res.json();
}

export async function getRules() {
  const res = await fetch(`${API_BASE}/rules`);
  if (!res.ok) throw new Error('Failed to load rules');
  return res.json();
}
