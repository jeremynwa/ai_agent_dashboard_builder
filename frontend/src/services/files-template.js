export const baseFiles = {
  'package.json': {
    file: {
      contents: JSON.stringify({
        name: "generated-app",
        private: true,
        version: "0.0.0",
        type: "module",
        scripts: {
          dev: "vite",
          build: "vite build",
          preview: "vite preview"
        },
        dependencies: {
          react: "^18.2.0",
          "react-dom": "^18.2.0",
          recharts: "^2.12.0"
        },
        devDependencies: {
          "@vitejs/plugin-react": "^4.0.0",
          vite: "^5.0.0"
        }
      }, null, 2)
    }
  },
  'vite.config.js': {
    file: {
      contents: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
})
`
    }
  },
  'index.html': {
    file: {
      contents: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Generated App</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`
    }
  },
  'src': {
    directory: {
      'ds.css': {
        file: {
          contents: `/* ================================================
   DESIGN SYSTEM — App Factory
   Utility-class CSS — no build step required
   ================================================ */

/* ---- RESET & BASE ---- */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
body { font-family: 'Inter', system-ui, -apple-system, sans-serif; background: #0B1120; color: #F1F5F9; line-height: 1.5; }

/* ---- CSS VARIABLES ---- */
:root {
  --base: #0B1120;
  --card: #111827;
  --card-hover: #1A2332;
  --card-alt: #0D1526;
  --border: #1E293B;
  --border-active: #2A3A50;
  --text-1: #F1F5F9;
  --text-2: #94A3B8;
  --text-3: #64748B;
  --accent: #06B6D4;
  --magenta: #EC4899;
  --violet: #8B5CF6;
  --amber: #F59E0B;
  --up: #10B981;
  --down: #EF4444;
  --orange: #F97316;
}

/* ---- LAYOUT ---- */
.min-h-screen { min-height: 100vh; }
.h-screen { height: 100vh; }
.w-full { width: 100%; }
.overflow-y-auto { overflow-y: auto; }
.overflow-x-auto { overflow-x: auto; }
.overflow-hidden { overflow: hidden; }
.relative { position: relative; }
.absolute { position: absolute; }
.fixed { position: fixed; }
.inset-0 { top: 0; right: 0; bottom: 0; left: 0; }
.top-0 { top: 0; } .left-0 { left: 0; } .right-0 { right: 0; } .bottom-0 { bottom: 0; }
.z-50 { z-index: 50; } .z-999 { z-index: 999; } .z-1000 { z-index: 1000; }

/* ---- FLEXBOX ---- */
.flex { display: flex; }
.inline-flex { display: inline-flex; }
.flex-col { flex-direction: column; }
.flex-wrap { flex-wrap: wrap; }
.items-center { align-items: center; }
.items-start { align-items: flex-start; }
.items-end { align-items: flex-end; }
.justify-center { justify-content: center; }
.justify-between { justify-content: space-between; }
.justify-end { justify-content: flex-end; }
.flex-1 { flex: 1; }
.shrink-0 { flex-shrink: 0; }

/* ---- GRID ---- */
.grid { display: grid; }
.grid-cols-1 { grid-template-columns: repeat(1, 1fr); }
.grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
.grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
.grid-cols-4 { grid-template-columns: repeat(4, 1fr); }
.grid-cols-5 { grid-template-columns: repeat(5, 1fr); }
.col-span-2 { grid-column: span 2; }

/* ---- GAP ---- */
.gap-1 { gap: 4px; } .gap-2 { gap: 8px; } .gap-3 { gap: 12px; }
.gap-4 { gap: 16px; } .gap-5 { gap: 20px; } .gap-6 { gap: 24px; } .gap-8 { gap: 32px; }

/* ---- PADDING ---- */
.p-0 { padding: 0; } .p-1 { padding: 4px; } .p-2 { padding: 8px; } .p-3 { padding: 12px; }
.p-4 { padding: 16px; } .p-5 { padding: 20px; } .p-6 { padding: 24px; } .p-7 { padding: 28px; } .p-8 { padding: 32px; }
.px-2 { padding-left: 8px; padding-right: 8px; } .px-3 { padding-left: 12px; padding-right: 12px; }
.px-4 { padding-left: 16px; padding-right: 16px; } .px-5 { padding-left: 20px; padding-right: 20px; }
.px-6 { padding-left: 24px; padding-right: 24px; } .px-7 { padding-left: 28px; padding-right: 28px; }
.py-1 { padding-top: 4px; padding-bottom: 4px; } .py-2 { padding-top: 8px; padding-bottom: 8px; }
.py-3 { padding-top: 12px; padding-bottom: 12px; } .py-4 { padding-top: 16px; padding-bottom: 16px; }

/* ---- MARGIN ---- */
.m-0 { margin: 0; }
.mb-1 { margin-bottom: 4px; } .mb-2 { margin-bottom: 8px; } .mb-3 { margin-bottom: 12px; }
.mb-4 { margin-bottom: 16px; } .mb-5 { margin-bottom: 20px; } .mb-6 { margin-bottom: 24px; } .mb-8 { margin-bottom: 32px; }
.mt-2 { margin-top: 8px; } .mt-4 { margin-top: 16px; } .mt-6 { margin-top: 24px; }

/* ---- BACKGROUNDS ---- */
.bg-base { background-color: var(--base); }
.bg-card { background-color: var(--card); }
.bg-card-hover { background-color: var(--card-hover); }
.bg-card-alt { background-color: var(--card-alt); }
.bg-accent { background-color: var(--accent); }
.bg-accent-10 { background-color: rgba(6,182,212,0.1); }
.bg-magenta { background-color: var(--magenta); }
.bg-violet { background-color: var(--violet); }
.bg-amber { background-color: var(--amber); }
.bg-up { background-color: var(--up); }
.bg-up-10 { background-color: rgba(16,185,129,0.1); }
.bg-down { background-color: var(--down); }
.bg-down-10 { background-color: rgba(239,68,68,0.1); }
.bg-black-50 { background-color: rgba(0,0,0,0.5); }
.bg-transparent { background: transparent; }

/* ---- TEXT COLORS ---- */
.text-primary { color: var(--text-1); }
.text-secondary { color: var(--text-2); }
.text-tertiary { color: var(--text-3); }
.text-accent { color: var(--accent); }
.text-magenta { color: var(--magenta); }
.text-violet { color: var(--violet); }
.text-amber { color: var(--amber); }
.text-up { color: var(--up); }
.text-down { color: var(--down); }
.text-white { color: #fff; }

/* ---- BORDERS ---- */
.border { border: 1px solid var(--border); }
.border-b { border-bottom: 1px solid var(--border); }
.border-t { border-top: 1px solid var(--border); }
.border-r { border-right: 1px solid var(--border); }
.border-l { border-left: 1px solid var(--border); }
.border-none { border: none; }

/* ---- BORDER RADIUS ---- */
.rounded { border-radius: 6px; }
.rounded-lg { border-radius: 10px; }
.rounded-xl { border-radius: 14px; }
.rounded-full { border-radius: 9999px; }
.rounded-sm { border-radius: 2px; }

/* ---- TYPOGRAPHY ---- */
.text-xs { font-size: 12px; } .text-sm { font-size: 14px; } .text-base { font-size: 16px; }
.text-lg { font-size: 18px; } .text-xl { font-size: 20px; } .text-2xl { font-size: 24px; } .text-3xl { font-size: 30px; }
.text-11 { font-size: 11px; } .text-13 { font-size: 13px; } .text-15 { font-size: 15px; } .text-28 { font-size: 28px; }
.font-normal { font-weight: 400; } .font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; } .font-bold { font-weight: 700; }
.uppercase { text-transform: uppercase; }
.tracking-wider { letter-spacing: 0.05em; }
.leading-tight { line-height: 1.25; }
.leading-relaxed { line-height: 1.625; }
.text-left { text-align: left; } .text-center { text-align: center; } .text-right { text-align: right; }
.truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* ---- SIZING ---- */
.w-5 { width: 20px; } .w-3 { width: 12px; } .h-full { height: 100%; }

/* ---- TRANSITIONS ---- */
.transition { transition: all 0.2s ease; }
.transition-transform { transition: transform 0.3s ease; }
.transition-colors { transition: background-color 0.2s, color 0.2s, border-color 0.2s; }

/* ---- TRANSFORMS ---- */
.translate-x-0 { transform: translateX(0); }
.-translate-x-full { transform: translateX(-100%); }

/* ---- INTERACTION ---- */
.cursor-pointer { cursor: pointer; }
.select-none { user-select: none; }

/* ---- ANIMATION ---- */
.animate-pulse { animation: ds-pulse 2s cubic-bezier(0.4,0,0.6,1) infinite; }
@keyframes ds-pulse { 0%,100%{opacity:1} 50%{opacity:.5} }

/* ---- TABLE ---- */
table { border-collapse: collapse; }

/* ================================================
   COMPONENT CLASSES
   ================================================ */

.card { background: var(--card); border-radius: 14px; border: 1px solid var(--border); padding: 24px; }
.kpi-card { background: var(--card); border-radius: 14px; border: 1px solid var(--border); padding: 20px; display: flex; flex-direction: column; gap: 6px; }
.kpi-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-3); }
.kpi-value { font-size: 28px; font-weight: 700; color: var(--text-1); line-height: 1.25; }
.kpi-comparison { font-size: 12px; color: var(--text-2); }
.badge-up { font-size: 13px; font-weight: 600; color: var(--up); }
.badge-down { font-size: 13px; font-weight: 600; color: var(--down); }
.section-title { font-size: 15px; font-weight: 600; color: var(--text-1); margin-bottom: 16px; }

/* Header */
.app-header { height: 60px; background: var(--card-alt); border-bottom: 1px solid var(--border); padding: 0 28px; display: flex; align-items: center; gap: 16px; }

/* Navigation */
.nav-item { padding: 10px 14px; border-radius: 10px; font-size: 13px; color: var(--text-2); cursor: pointer; transition: all 0.2s; background: none; border: none; font-family: inherit; }
.nav-item:hover { background: var(--card-hover); color: var(--text-1); }
.nav-item-active { background: rgba(6,182,212,0.1); color: var(--accent); }

/* Tab buttons */
.tab-btn { padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 500; color: var(--text-2); cursor: pointer; transition: all 0.2s; background: none; border: 1px solid transparent; font-family: inherit; }
.tab-btn:hover { background: var(--card-hover); color: var(--text-1); }
.tab-btn-active { background: rgba(6,182,212,0.1); color: var(--accent); border-color: rgba(6,182,212,0.3); }

/* Hamburger */
.hamburger { display: flex; flex-direction: column; gap: 3px; padding: 8px; cursor: pointer; background: none; border: none; }
.hamburger-line { width: 20px; height: 2px; background: var(--text-2); border-radius: 1px; }

/* Overlay & Drawer */
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 999; }
.drawer { position: fixed; top: 0; left: 0; height: 100vh; width: 260px; background: var(--card); border-right: 1px solid var(--border); padding: 20px 12px; z-index: 1000; transition: transform 0.3s ease; }
.drawer-open { transform: translateX(0); }
.drawer-closed { transform: translateX(-100%); }

/* Content */
.content-area { padding: 28px; overflow-y: auto; height: calc(100vh - 60px); }

/* Insights */
.insight-item { display: flex; gap: 12px; padding: 14px 16px; background: var(--card-alt); border-radius: 10px; margin-bottom: 8px; }
.insight-bar { width: 3px; border-radius: 2px; flex-shrink: 0; align-self: stretch; }
.insight-bar-up { background: var(--up); }
.insight-bar-down { background: var(--down); }
.insight-bar-accent { background: var(--accent); }
.insight-text { font-size: 13px; color: var(--text-2); line-height: 1.5; }

/* Table */
.w-full { width: 100%; border-collapse: collapse; border-spacing: 0; }
.table-header-cell { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-3); padding: 10px 16px; text-align: left; white-space: nowrap; border-bottom: 1px solid var(--border); }
.table-cell { padding: 10px 16px; color: var(--text-2); font-size: 13px; white-space: nowrap; border-bottom: 1px solid rgba(30,41,59,0.5); }
.table-row-even { background: var(--card); }
.table-row-odd { background: var(--card-alt); }
.table-cell:first-child { color: var(--text-1); font-weight: 500; }

/* Responsive Grid */
.grid-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; }
.grid-charts-2 { display: grid; grid-template-columns: 1fr; gap: 20px; }
.grid-charts-3 { display: grid; grid-template-columns: 1fr; gap: 20px; }
@media (min-width: 768px) { .grid-charts-2 { grid-template-columns: 1fr 1fr; } .grid-charts-3 { grid-template-columns: 1fr 1fr; } }
@media (min-width: 1200px) { .grid-charts-3 { grid-template-columns: 1fr 1fr 1fr; } }

/* Skeleton */
.skeleton { animation: ds-pulse 2s cubic-bezier(0.4,0,0.6,1) infinite; background: var(--card-hover); border-radius: 8px; }

/* Hover helpers (for table rows etc) */
.hover-card { transition: border-color 0.2s; } .hover-card:hover { border-color: var(--border-active); }
.hover-bg { transition: background 0.2s; } .hover-bg:hover { background: var(--card-hover); }
`
        }
      },
      'main.jsx': {
        file: {
          contents: `import React from 'react'
import ReactDOM from 'react-dom/client'
import './ds.css'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
`
        }
      },
      'App.jsx': {
        file: {
          contents: `function App() {
  return (
    <div className="min-h-screen bg-base p-6">
      <h1 className="text-2xl font-bold text-primary">Hello from Generated App!</h1>
    </div>
  )
}

export default App
`
        }
      }
    }
  }
};