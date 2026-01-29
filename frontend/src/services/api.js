const API_URL = 'http://localhost:3001';

export async function generateApp(prompt, excelData = null) {
  const response = await fetch(`${API_URL}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, excelData }),
  });
  
  if (!response.ok) {
    throw new Error('Erreur génération');
  }
  
  return response.json();
}

export async function publishApp(files, appName) {
  const response = await fetch(`${API_URL}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files, appName }),
  });
  
  if (!response.ok) {
    throw new Error('Erreur publication');
  }
  
  return response.json();
}