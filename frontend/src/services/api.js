const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const GENERATE_URL = import.meta.env.VITE_GENERATE_URL || (API_BASE + '/generate');

export async function generateApp(prompt, excelData = null) {
  const dataForApi = excelData ? {
    fileName: excelData.fileName,
    headers: excelData.headers,
    data: excelData.sample,
    totalRows: excelData.totalRows,
  } : null;

  const res = await fetch(GENERATE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, useRules: true, excelData: dataForApi }),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Generation failed');
  return res.json();
}

export async function publishApp(builtFiles, appName) {
  const res = await fetch(API_BASE + '/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ builtFiles, appName }),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Publish failed');
  return res.json();
}

export async function getRules() {
  const res = await fetch(API_BASE + '/rules');
  if (!res.ok) throw new Error('Failed to load rules');
  return res.json();
}