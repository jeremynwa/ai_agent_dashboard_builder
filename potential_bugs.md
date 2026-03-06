# Potential Bugs & Fixes

Bugs rencontrés et corrigés qui pourraient revenir. Consulter ce fichier avant de debugger.

---

## BUG-001 : `deploy.ps1` échoue — `npm` / `node` not found

**Symptome** : `deploy.ps1` échoue avec `npm: command not found` ou `The term 'npm' is not recognized`.

**Cause** : Node.js n'est pas dans le PATH de la session PowerShell courante. L'installation est portable (zip extrait manuellement car MSI/winget bloqués par l'IT).

**Fix** : Ajouter au PATH en début de session PowerShell :
```powershell
$env:PATH += ";C:\Users\13287\nodejs\node-v20.18.0-win-x64"
```

**Fix permanent** (une seule fois) :
```powershell
[Environment]::SetEnvironmentVariable("PATH", $env:PATH + ";C:\Users\13287\nodejs\node-v20.18.0-win-x64", "User")
```

**Localisation Node.js** : `C:\Users\13287\nodejs\node-v20.18.0-win-x64\node.exe`

---

## BUG-002 : `deploy.ps1` échoue — `sam` not found

**Symptome** : `sam: command not found` ou `The term 'sam' is not recognized`.

**Cause** : SAM CLI installé via pip, pas dans le PATH de la session courante.

**Fix** :
```powershell
$env:PATH += ";$env:APPDATA\Python\Python313\Scripts"
```

---

## BUG-003 : `cd` échoue — chemin avec espaces

**Symptome** : `Set-Location: A positional parameter cannot be found that accepts argument 'Code\ai_agent...'`

**Cause** : Le chemin du projet contient des espaces (`VS Code`). PowerShell interprète l'espace comme un séparateur d'arguments.

**Fix** : Toujours mettre les chemins entre guillemets :
```powershell
# WRONG
cd C:\Users\13287\Documents\VS Code\ai_agent_dashboard_builder\...
# CORRECT
cd "C:\Users\13287\Documents\VS Code\ai_agent_dashboard_builder\..."
```

---

## BUG-004 : `deploy.ps1` bloqué — Execution Policy

**Symptome** : `File deploy.ps1 cannot be loaded because running scripts is disabled on this system.`

**Cause** : PowerShell execution policy par défaut = Restricted.

**Fix** (une seule fois) :
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

---

## BUG-005 : Generate silencieux (pas d'erreur affichée)

**Symptome** : Le bouton Generate tourne ~15s puis revient à l'état initial sans message d'erreur ni résultat.

**Cause** : Les variables `VITE_*` ne sont pas configurées dans Azure Static Web Apps Application Settings. Le frontend fallback sur `http://localhost:3001/generate` qui timeout silencieusement.

**Fix** : Azure Portal > Static Web App > Configuration > Application Settings > ajouter :
- `VITE_API_URL`
- `VITE_GENERATE_URL`
- `VITE_DB_PROXY_URL`
- `VITE_REVIEW_CODE_URL`
- `VITE_GIT_PUSH_URL`
- `VITE_COGNITO_USER_POOL_ID`
- `VITE_COGNITO_CLIENT_ID`

Valeurs : voir CloudFormation Outputs du stack `app-factory`.

**Fix code** : `lastGenerateError` state dans `App.jsx` affiche l'erreur en rouge sous le bouton Generate.
