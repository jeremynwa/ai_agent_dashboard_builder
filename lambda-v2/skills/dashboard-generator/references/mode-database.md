# Mode Base de Donnees

Quand l'utilisateur connecte une base de donnees (PostgreSQL/MySQL), suivre ces regles.

## Fichier a Creer

`src/db.js`:
```javascript
const PROXY_URL = "__DB_PROXY_URL__";
const DB_CREDENTIALS = "__DB_CREDENTIALS__";

export async function queryDb(sql) {
  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credentials: DB_CREDENTIALS, sql })
  });
  if (!res.ok) throw new Error('Query failed');
  return (await res.json()).rows;
}
```

Les placeholders `"__DB_PROXY_URL__"` et `"__DB_CREDENTIALS__"` sont remplaces par le backend.

## Dans App.jsx

```javascript
import { queryDb } from './db';
import { useState, useEffect } from 'react';

// Charger les donnees
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  queryDb('SELECT * FROM table_name LIMIT 1000')
    .then(rows => setData(rows))
    .catch(console.error)
    .finally(() => setLoading(false));
}, []);
```

## Loading State

```jsx
<div className="skeleton" style={{height:'32px', width:'100%'}}></div>
```

## Regles

1. Creer `src/db.js` avec les placeholders exacts
2. `import { queryDb } from './db';`
3. `useEffect` + `useState` pour le chargement
4. Afficher un loading state pendant le fetch
5. **NE JAMAIS** hardcoder les credentials ou les donnees
