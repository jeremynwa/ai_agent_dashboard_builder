# Mode Excel / CSV

Quand l'utilisateur uploade un fichier Excel ou CSV, suivre ces regles.

## Fichier a Creer

`src/data.js`:
```javascript
export const DATA = "__INJECT_DATA__";
```

Le placeholder `"__INJECT_DATA__"` sera remplace automatiquement par le tableau de donnees reelles.

## Dans App.jsx

```javascript
import { DATA } from './data';
```

## Regles

1. Creer `src/data.js` avec le placeholder exact `"__INJECT_DATA__"`
2. Dans App.jsx: `import { DATA } from './data';`
3. KPIs **CALCULES** dynamiquement depuis les donnees
4. Le placeholder est remplace automatiquement par le backend
5. **JAMAIS** hardcoder des donnees d'exemple
