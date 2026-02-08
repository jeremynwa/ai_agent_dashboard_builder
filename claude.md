# 🧠 CLAUDE.md — App Factory (AI App Builder)

## 📋 Résumé du Projet

**Nom**: `ai_app_builder` / **App Factory**

**Objectif**: SaaS permettant aux clients de générer des applications React via prompt. L'app générée tourne directement dans le browser du client (WebContainers).

**Architecture**: WebContainers (browser) + AWS minimal (backend)

**Design System**: SK Design System (vert #00765F, fond sombre #0F0F12)

---

## ✅ État Actuel du Projet

### Complété

- [x] Frontend React + Vite + Tailwind
- [x] WebContainer intégration
- [x] Backend Express + Claude API
- [x] Génération d'apps React via prompt
- [x] Interface App Factory (3 états)
- [x] Upload fichiers Excel/CSV
- [x] Export .zip avec Dockerfile
- [x] Publication S3
- [x] SK Design System intégré
- [x] Écran de génération avec progress

### En cours / À faire

- [ ] Déployer backend sur AWS Lambda
- [ ] MCP Servers (Filesystem, SQLite, Terminal)
- [ ] Authentification users
- [ ] Sauvegarde des apps
- [ ] Templates marketplace

---

## 🎯 Le Concept Core — App Factory

```
┌─────────────────────────────────────────────────────────────────┐
│                        APP FACTORY                              │
│                                                                 │
│   "Une meta-application qui génère des applications"            │
│                                                                 │
│   L'interface se TRANSFORME:                                    │
│   - État 1: Factory Home (créer/sélectionner)                  │
│   - État 2: Génération en cours (progress)                     │
│   - État 3: App générée (plein écran)                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎨 Interface — 3 États

### État 1: Factory Home

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  ┌────────────┬────────────────────────────────────────────────┐   │
│  │            │                                                │   │
│  │  FACTORY   │      Quelle analyse voulez-vous               │   │
│  │  ────────  │           créer aujourd'hui ?                 │   │
│  │            │                                                │   │
│  │  + New App │      ┌─────────────────────────────┐          │   │
│  │            │      │ Ex: "Dashboard des ventes   │          │   │
│  │  ────────  │      │ Q4 avec KPIs et tendances"  │          │   │
│  │  Mes Apps  │      └─────────────────────────────┘          │   │
│  │            │                                                │   │
│  │  Sales...  │      [ Importer Excel/CSV ]                   │   │
│  │  Churn...  │                                                │   │
│  │  Invent... │      [ Générer l'App → ]                      │   │
│  │            │                                                │   │
│  │  ────────  │      ┌────────┐ ┌────────┐ ┌────────┐        │   │
│  │  Settings  │      │Finance │ │Marketing│ │Research│        │   │
│  │  ● Prêt    │      │Template│ │Template │ │Template│        │   │
│  │            │      └────────┘ └────────┘ └────────┘        │   │
│  └────────────┴────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### État 2: Génération en cours

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  ┌────────────┬────────────────────────────────────────────────┐   │
│  │            │                                                │   │
│  │  FACTORY   │         ┌────────────────────┐                │   │
│  │  ────────  │         │ ░░░░░░░░░░░░░░░░░░ │                │   │
│  │            │         │                    │                │   │
│  │  + New App │         │  Construction de   │                │   │
│  │            │         │  votre app...      │                │   │
│  │  ────────  │         │                    │                │   │
│  │  Mes Apps  │         │  ✓ Structure       │                │   │
│  │            │         │  ✓ Composants      │                │   │
│  │  Sales...  │         │  ◐ Visualisations  │                │   │
│  │  Churn...  │         │  ○ Données         │                │   │
│  │            │         │                    │                │   │
│  │  ────────  │         └────────────────────┘                │   │
│  │  Settings  │                                                │   │
│  │  ● Prêt    │                                                │   │
│  └────────────┴────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### État 3: App Générée (Plein Écran)

```
┌─────────────────────────────────────────────────────────────────────┐
│  [← Factory] [Exporter] [Publier]                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌────────────┬─────────────────────────────────────────────────┐  │
│  │            │                                                 │  │
│  │  DASHBOARD │   Revenue      Users       Conversion           │  │
│  │  ────────  │   ┌───────┐   ┌───────┐   ┌───────┐            │  │
│  │            │   │ $2.4M │   │ 48,291│   │ 3.24% │            │  │
│  │  Overview  │   │ ↑12.3%│   │ ↑ 8.7%│   │ ↓ 0.5%│            │  │
│  │  Analytics │   └───────┘   └───────┘   └───────┘            │  │
│  │  Reports   │                                                 │  │
│  │  Settings  │   Revenue Trend                                 │  │
│  │            │   ┌─────────────────────────────────────┐      │  │
│  │            │   │    ╭─╮                              │      │  │
│  │            │   │   ╭╯ ╰╮   ╭──╮                     │      │  │
│  │            │   │  ╭╯   ╰──╮╯  ╰╮  ╭──               │      │  │
│  │            │   │ ─╯        ╰    ╰──╯                │      │  │
│  │            │   └─────────────────────────────────────┘      │  │
│  │            │                                                 │  │
│  └────────────┴─────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

Note: L'app générée a SA PROPRE sidebar. Les boutons Factory/Exporter/Publier
sont flottants en haut à gauche pour éviter une double sidebar.
```

---

## 🎨 SK Design System

### Couleurs

```javascript
colors: {
  // Surfaces
  'surface-base': '#0F0F12',      // Background principal
  'surface-raised': '#16161A',    // Cards, sidebar
  'surface-overlay': '#1C1C21',   // Inputs, modals
  'surface-subtle': '#232329',    // Hover states
  'surface-border': '#2E2E36',    // Borders
  'surface-muted': '#3D3D47',     // Disabled

  // Texte
  'text-primary': '#FFFFFF',
  'text-secondary': '#A1A1AA',
  'text-tertiary': '#71717A',
  'text-muted': '#52525B',

  // Accent principal (vert SK)
  'sk-green': '#00765F',
  'sk-green-hover': '#00A382',
  'sk-green-muted': 'rgba(0, 118, 95, 0.15)',

  // Accents secondaires
  'accent-amber': '#F59E0B',
  'accent-emerald': '#34D399',
  'accent-sky': '#38BDF8',
  'accent-coral': '#EF6461',
  'accent-violet': '#A78BFA',

  // Status
  'status-success': '#34D399',
  'status-warning': '#F59E0B',
  'status-error': '#EF4444',
}
```

### Composants Styles

```javascript
// Card
card: {
  background: '#16161A',
  borderRadius: '16px',
  padding: '24px',
  border: '1px solid #2E2E36',
  boxShadow: '0 4px 24px -4px rgba(0, 0, 0, 0.4)'
}

// KPI Card
kpiCard: {
  label: { fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#71717A' },
  value: { fontSize: '28px', fontWeight: '600', color: '#FFFFFF' },
  change: { fontSize: '12px', color: '#34D399' } // ou #EF4444 si négatif
}

// Button Primary
button: {
  background: '#00765F',
  color: 'white',
  padding: '10px 20px',
  borderRadius: '8px',
  fontWeight: '500',
  transition: 'all 0.2s ease'
}

// Input
input: {
  background: '#1C1C21',
  border: '1px solid #2E2E36',
  borderRadius: '8px',
  padding: '12px 16px',
  color: '#FFFFFF'
}

// Sidebar Nav Item
navItem: {
  padding: '10px 12px',
  borderRadius: '8px',
  color: '#A1A1AA',
  cursor: 'pointer'
}
navItemActive: {
  background: 'rgba(0, 118, 95, 0.15)',
  color: '#00765F'
}
```

### Typography

```javascript
typography: {
  fontFamily: 'Inter, system-ui, sans-serif',
  fontDisplay: 'Sora, system-ui, sans-serif',  // Titres
  fontMono: 'JetBrains Mono, monospace',       // Code/logs
}
```

### Règles Design

- JAMAIS d'emojis
- JAMAIS d'icônes unicode
- Hover states sur tous les éléments cliquables
- Transitions: `all 0.2s ease`
- Border radius: 8px (boutons), 16px (cards)
- Espacement généreux

---

## 🏗️ Architecture Technique

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  BROWSER DU CLIENT                                                          │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                         WEBCONTAINER                                   │ │
│  │                   (Node.js dans le browser)                           │ │
│  │                                                                        │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │ │
│  │  │ Filesystem  │  │    Vite     │  │ Hot Reload  │  │   Preview   │  │ │
│  │  │   isolé     │  │   Build     │  │  instantané │  │    live     │  │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│         ▲                                                                   │
│         │ Code généré par Claude                                           │
└─────────┼───────────────────────────────────────────────────────────────────┘
          │
┌─────────┴───────────────────────────────────────────────────────────────────┐
│  BACKEND (Express local → migrer vers AWS Lambda)                           │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Endpoints:                                                          │   │
│  │  • POST /generate → Claude API → retourne code React                │   │
│  │  • POST /publish → build + upload S3 → retourne URL                 │   │
│  │  • GET /rules → lit règles JSON locales                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                          │                                                  │
│         ┌────────────────┼────────────────┐                                │
│         ▼                ▼                ▼                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                        │
│  │     S3      │  │ Claude API  │  │   Rules/    │                        │
│  │  (publish)  │  │  (génère)   │  │  Templates  │                        │
│  └─────────────┘  └─────────────┘  └─────────────┘                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Structure du Projet (Actuelle)

```
ai_agent_dashboard_builder/
│
├── 📁 frontend/
│   ├── src/
│   │   ├── App.jsx                    # App principale (3 états)
│   │   ├── components/
│   │   │   ├── FileUpload.jsx         # Upload Excel/CSV
│   │   │   ├── PromptInput.jsx        # (legacy, intégré dans App.jsx)
│   │   │   ├── AppPreview.jsx         # (legacy)
│   │   │   ├── Terminal.jsx           # (legacy)
│   │   │   └── FileExplorer.jsx       # (legacy)
│   │   ├── services/
│   │   │   ├── api.js                 # Appels backend
│   │   │   ├── webcontainer.js        # Init WebContainer
│   │   │   ├── files-template.js      # Template React de base
│   │   │   └── export.js              # Export .zip
│   │   └── index.css                  # Tailwind
│   ├── vite.config.js                 # Config Vite + COOP/COEP headers
│   ├── tailwind.config.js
│   └── package.json
│
├── 📁 backend/
│   ├── server.mjs                     # Express server
│   ├── .env                           # ANTHROPIC_API_KEY (gitignored!)
│   ├── rules/
│   │   ├── sk-design.json             # SK Design System
│   │   └── app-factory.json           # App Factory specs
│   ├── bucket-policy.json             # Policy S3
│   └── package.json
│
├── .gitignore                         # Inclut .env, node_modules
├── CLAUDE.md                          # Ce fichier
└── README.md
```

---

## 🔧 Configuration

### Frontend (vite.config.js)

```javascript
// Headers requis pour WebContainer (SharedArrayBuffer)
server: {
  headers: {
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
  }
}

// Base path pour S3 publish
base: './',
```

### Backend (.env)

```
ANTHROPIC_API_KEY=sk-ant-...
```

⚠️ **IMPORTANT**: Ne JAMAIS commit le .env !

### S3 Bucket

```
Bucket: ai-app-builder-sk-2026
Region: eu-north-1
Website hosting: enabled
Public access: enabled (via bucket policy)
```

---

## 🚀 Lancer le Projet

### Terminal 1 — Backend

```bash
cd backend
npm start
# → http://localhost:3001
```

### Terminal 2 — Frontend

```bash
cd frontend
npm run dev
# → http://localhost:5173
```

---

## 📤 Options Output

| Action       | Résultat              | Client peut modifier ? |
| ------------ | --------------------- | ---------------------- |
| **Exporter** | .zip avec Dockerfile  | ✅ Oui                 |
| **Publier**  | URL S3 (app compilée) | ❌ Non                 |

### Contenu Export .zip

```
export.zip
├── src/
│   └── App.jsx
├── package.json
├── vite.config.js
├── Dockerfile
├── docker-compose.yml
└── README.md
```

### URL Publiée

```
http://ai-app-builder-sk-2026.s3-website.eu-north-1.amazonaws.com/{app-name}/
```

---

## 🔄 Flow Génération

```
1. User ouvre App Factory (localhost:5173)
   → WebContainer s'initialise
   → État: "Prêt"

2. User écrit son prompt + (optionnel) upload Excel

3. User clique "Générer l'App →"
   → État 2: Génération en cours
   → Progress: Structure → Composants → Visualisations → Données

4. Backend:
   → Lit les rules JSON
   → Appelle Claude API avec le prompt + rules + data
   → Claude génère du code React (JSON)
   → Backend corrige les erreurs JSX courantes

5. Frontend:
   → Reçoit le code
   → Monte les fichiers dans WebContainer
   → npm install
   → npm run dev
   → Hot reload

6. App générée s'affiche (État 3)
   → Plein écran
   → Boutons flottants: Factory, Exporter, Publier
```

---

## 🔧 MCP Servers (À implémenter)

| MCP            | Rôle            | Status     |
| -------------- | --------------- | ---------- |
| Filesystem MCP | Écrire fichiers | ⏳ À faire |
| SQLite MCP     | DB locale       | ⏳ À faire |
| Terminal MCP   | Error catching  | ⏳ À faire |

---

## ☁️ AWS (À implémenter)

### Services prévus

| Service    | Usage                 | Status     |
| ---------- | --------------------- | ---------- |
| S3         | Rules + apps publiées | ✅ Fait    |
| Lambda     | Backend serverless    | ⏳ À faire |
| CloudFront | CDN                   | ⏳ À faire |
| DynamoDB   | Users + metadata      | ⏳ À faire |

### Coûts estimés

```
S3:         ~$1-5/mois
CloudFront: ~$1-2/mois
Lambda:     ~$0-5/mois
DynamoDB:   ~$0-1/mois
─────────────────────────
Total:      ~$5-15/mois
```

---

## 📅 Planning Restant

| Phase | Tâche               | Durée estimée |
| ----- | ------------------- | ------------- |
| 5     | Déployer Lambda     | 2-3 jours     |
| 6     | MCP Servers         | 2-3 jours     |
| 7     | Auth + Users        | 2-3 jours     |
| 8     | Polish + Production | 1-2 jours     |

---

## 🛠️ Technologies

| Composant    | Techno                         |
| ------------ | ------------------------------ |
| Frontend     | React + Vite + Tailwind        |
| WebContainer | @webcontainer/api (StackBlitz) |
| Backend      | Express (→ Lambda)             |
| Storage      | S3                             |
| IA           | Claude API (claude-sonnet-4)   |
| Export       | JSZip                          |
| Excel/CSV    | xlsx                           |

---

## ⚠️ Limitations WebContainers

| Device/Browser     | Support   |
| ------------------ | --------- |
| Chrome/Edge récent | ✅        |
| Firefox récent     | ✅        |
| Safari             | ⚠️ Limité |
| Mobile             | ⚠️ Lourd  |

---

## 📝 Notes de Dev

```
[Date] - Note
──────────────
- Design: App Factory avec 3 états
- SK Design System (vert #00765F, fond #0F0F12)
- WebContainer pour preview live
- Backend Express (à migrer vers Lambda)
- S3 bucket: ai-app-builder-sk-2026 (eu-north-1)
- JAMAIS commit les clés API !
```

---

## 🔗 Ressources

- [WebContainer API](https://webcontainers.io/)
- [Claude API](https://docs.anthropic.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [AWS S3](https://aws.amazon.com/s3/)
