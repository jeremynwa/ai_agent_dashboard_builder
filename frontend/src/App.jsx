// frontend/src/App.jsx — WebContainer API auth integration
import { useState, useEffect, useRef, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WebContainer, configureAPIKey } from '@webcontainer/api';
import { baseFiles } from './services/files-template';
import { generateApp, visionAnalyze, publishApp, exportApp, API_BASE, DB_PROXY_URL } from './services/api';
import { exportToZip } from './services/export';
import FileUpload from './components/FileUpload';
import DbConnect from './components/DbConnect';
import AuthProvider, { useAuth } from './components/AuthProvider';
import Login from './components/Login';
import MatrixRain from './components/MatrixRain';

const MAX_FIX_ATTEMPTS = 3;
const SCREENSHOT_DELAY = 4000;
const SCREENSHOT_TIMEOUT = 10000;

// ============ AGENT PROMPTS (stay in French — Claude understands both) ============
const REVIEW_PROMPT = `Review et améliore ce code React. Vérifie et corrige SYSTÉMATIQUEMENT :

1. LABELS: Chaque graphique a un titre clair et une légende explicite
2. UNITÉS: Les KPIs affichent les unités correctes (EUR, %, unités, etc.)
3. FORMATAGE: Les nombres sont formatés (séparateurs de milliers, décimales appropriées)
4. ESPACEMENT: Le layout est aéré, pas de contenus collés ou trop serrés
5. COULEURS: Le design system est respecté (fond #0B1120, cards #111827, accent cyan #06B6D4)
6. RESPONSIVE: Les graphiques et tableaux s'adaptent à la largeur disponible
7. HOVER STATES: Tous les éléments cliquables ont un état hover
8. CHARGEMENT: Si données async, afficher "Chargement..." pendant le fetch
9. VIDE: Gérer les cas où les données sont vides ou undefined (pas de crash)
10. LISIBILITÉ: Les textes secondaires utilisent #A1A1AA, pas du blanc pur

Retourne le JSON complet avec TOUS les fichiers améliorés.`;

const CAPTURE_SCRIPT = `
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"><\/script>
<script>
window.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'capture') {
    setTimeout(function() {
      html2canvas(document.body, {
        backgroundColor: '#0B1120',
        scale: 0.5,
        logging: false,
        useCORS: true,
      }).then(function(canvas) {
        var base64 = canvas.toDataURL('image/png').split(',')[1];
        window.parent.postMessage({ type: 'screenshot', data: base64 }, '*');
      }).catch(function(err) {
        window.parent.postMessage({ type: 'screenshot_error', error: err.message }, '*');
      });
    }, 500);
  }
});
<\/script>`;

// ============ I18N ============
const translations = {
  en: {
    title: 'What do you want to build?',
    subtitle: 'Describe your dashboard or app — AI generates it in seconds.',
    promptPlaceholder: 'Describe your dashboard... e.g. sales KPIs with monthly trends, churn analysis by cohort...',
    generateApp: 'Generate App',
    tryPrompt: 'Try a prompt',
    addDataSource: '+ Add data source',
    hideDataSource: '− Hide data source',
    newApp: 'New App',
    recents: 'Recents',
    engineReady: 'Engine ready',
    booting: 'Booting...',
    logout: 'Log out',
    poweredBy: 'Powered by AI',
    buildingApp: 'Building your app',
    generatingCode: 'Generating code...',
    compiling: 'Compiling...',
    recompiling: 'Recompiling...',
    qualityReview: 'Quality review...',
    visualAnalysis: 'Visual analysis...',
    finalRecompile: 'Final recompilation...',
    modifying: 'Modifying...',
    starting: 'Starting...',
    autoFix: 'Auto-fix ({n}/{max})...',
    stepGeneration: 'Code generation',
    stepCompilation: 'Compilation',
    stepReview: 'Quality review',
    stepVision: 'Visual analysis',
    stepFinalize: 'Finalization',
    factory: '← Factory',
    export: 'Export',
    publish: 'Publish',
    appNamePrompt: 'App name:',
    refinePlaceholder: "Modify the app... e.g. add a chart, change colors...",
    send: 'Send',
    errorPrefix: 'Error: ',
    rows: 'rows',
    tables: 'tables',
    suggestions: {
      salesKpis: 'Sales KPIs',
      churnAnalysis: 'Churn Analysis',
      revenueTrends: 'Revenue Trends',
      marketingRoi: 'Marketing ROI',
      hrAnalytics: 'HR Analytics',
      supplyChain: 'Supply Chain',
    },
    industryLabel: 'Industry',
    industries: {
      none: 'General',
      finance: 'Finance',
      ecommerce: 'E-commerce',
      saas: 'SaaS / Tech',
      logistics: 'Logistics',
    },
    exportXlsx: 'Export XLSX',
    exportPptx: 'Export PPTX',
    exportPdf: 'Export PDF',
    exporting: 'Exporting...',
  },
  fr: {
    title: 'Que voulez-vous construire ?',
    subtitle: "Décrivez votre dashboard ou app — l'IA le génère en quelques secondes.",
    promptPlaceholder: 'Décrivez votre dashboard... ex: KPIs ventes avec tendances mensuelles, analyse du churn par cohorte...',
    generateApp: "Générer l'App",
    tryPrompt: 'Essayez un prompt',
    addDataSource: '+ Ajouter une source de données',
    hideDataSource: '− Masquer la source de données',
    newApp: 'Nouvelle App',
    recents: 'Récents',
    engineReady: 'Moteur prêt',
    booting: 'Démarrage...',
    logout: 'Déconnexion',
    poweredBy: 'Propulsé par IA',
    buildingApp: 'Construction de votre app',
    generatingCode: 'Génération du code...',
    compiling: 'Compilation...',
    recompiling: 'Recompilation...',
    qualityReview: 'Review qualité...',
    visualAnalysis: 'Analyse visuelle...',
    finalRecompile: 'Recompilation finale...',
    modifying: 'Modification...',
    starting: 'Démarrage...',
    autoFix: 'Correction auto ({n}/{max})...',
    stepGeneration: 'Génération du code',
    stepCompilation: 'Compilation',
    stepReview: 'Review qualité',
    stepVision: 'Analyse visuelle',
    stepFinalize: 'Finalisation',
    factory: '← Factory',
    export: 'Exporter',
    publish: 'Publier',
    appNamePrompt: "Nom de l'app :",
    refinePlaceholder: "Modifie l'app... ex: ajoute un graphique, change les couleurs...",
    send: 'Envoyer',
    errorPrefix: 'Erreur : ',
    rows: 'lignes',
    tables: 'tables',
    suggestions: {
      salesKpis: 'KPIs Ventes',
      churnAnalysis: 'Analyse Churn',
      revenueTrends: 'Tendances Revenus',
      marketingRoi: 'ROI Marketing',
      hrAnalytics: 'Analytics RH',
      supplyChain: 'Supply Chain',
    },
    industryLabel: 'Secteur',
    industries: {
      none: 'Généraliste',
      finance: 'Finance',
      ecommerce: 'E-commerce',
      saas: 'SaaS / Tech',
      logistics: 'Logistique',
    },
    exportXlsx: 'Export XLSX',
    exportPptx: 'Export PPTX',
    exportPdf: 'Export PDF',
    exporting: 'Export en cours...',
  },
};

const PROMPT_SUGGESTIONS = [
  { key: 'salesKpis', prompt: 'Dashboard des ventes avec KPIs revenus, marge, panier moyen et tendances mensuelles' },
  { key: 'churnAnalysis', prompt: "Dashboard d'analyse du churn avec cohortes, taux de rétention et prédictions" },
  { key: 'revenueTrends', prompt: 'Dashboard revenus avec évolution MRR/ARR, segments clients et forecasting' },
  { key: 'marketingRoi', prompt: "Dashboard marketing avec ROI par canal, funnel de conversion et coût d'acquisition" },
  { key: 'hrAnalytics', prompt: 'Dashboard RH avec effectifs, turnover, recrutement et satisfaction employés' },
  { key: 'supplyChain', prompt: 'Dashboard supply chain avec stocks, délais livraison et performance fournisseurs' },
];

// ============ LANG CONTEXT ============
const LangContext = createContext({ lang: 'en', setLang: () => {}, t: (k) => k });

function LangProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem('factory-lang') || 'en'; } catch { return 'en'; }
  });

  const t = (key) => {
    const keys = key.split('.');
    let val = translations[lang];
    for (const k of keys) val = val?.[k];
    return val || key;
  };

  useEffect(() => {
    try { localStorage.setItem('factory-lang', lang); } catch {}
  }, [lang]);

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

function useLang() {
  return useContext(LangContext);
}

// ============ AUTH GATE ============
function App() {
  return (
    <LangProvider>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </LangProvider>
  );
}

function AuthGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <motion.div
          style={styles.loadingSpinner}
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    );
  }

  if (!user) return <Login />;
  return <Factory />;
}

// ============ HELPER: Flatten WebContainer file tree to flat map ============
function flattenFiles(obj, path = '') {
  const result = {};
  for (const [name, value] of Object.entries(obj)) {
    const fullPath = path ? `${path}/${name}` : name;
    if (value.directory) {
      Object.assign(result, flattenFiles(value.directory, fullPath));
    } else if (value.file) {
      result[fullPath] = value.file.contents;
    }
  }
  return result;
}

// ============ SVG ICONS ============
const Icons = {
  logo: () => (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="6" fill="#06B6D4" fillOpacity="0.15"/>
      <path d="M8 10h12M8 14h8M8 18h10" stroke="#06B6D4" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="21" cy="18" r="2.5" stroke="#06B6D4" strokeWidth="1.5"/>
    </svg>
  ),
  sparkle: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginRight: '8px' }}>
      <path d="M8 1l1.5 4.5L14 7l-4.5 1.5L8 13l-1.5-4.5L2 7l4.5-1.5L8 1z" fill="currentColor" fillOpacity="0.9"/>
    </svg>
  ),
  upload: () => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ marginRight: '6px', flexShrink: 0 }}>
      <path d="M8 2v8M4.5 5.5L8 2l3.5 3.5M3 11v2h10v-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  database: () => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ marginRight: '6px', flexShrink: 0 }}>
      <ellipse cx="8" cy="4" rx="5" ry="2" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M3 4v8c0 1.1 2.24 2 5 2s5-.9 5-2V4" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M3 8c0 1.1 2.24 2 5 2s5-.9 5-2" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  ),
  app: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="1" width="12" height="12" rx="3" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M1 5h12" stroke="currentColor" strokeWidth="1.2"/>
      <circle cx="3.5" cy="3" r="0.7" fill="currentColor"/>
      <circle cx="5.5" cy="3" r="0.7" fill="currentColor"/>
    </svg>
  ),
};

// ============ LANG TOGGLE ============
function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <div style={styles.langToggle}>
      <button
        style={{ ...styles.langButton, ...(lang === 'en' ? styles.langButtonActive : {}) }}
        onClick={() => setLang('en')}
      >EN</button>
      <button
        style={{ ...styles.langButton, ...(lang === 'fr' ? styles.langButtonActive : {}) }}
        onClick={() => setLang('fr')}
      >FR</button>
    </div>
  );
}

// ============ MOTION HELPERS ============
const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.05 } },
};

const staggerItem = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
};

// ============ MAIN FACTORY ============
function Factory() {
  const { user, logout } = useAuth();
  const { t } = useLang();

  const [files, setFiles] = useState({});
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [bootError, setBootError] = useState(null);
  const [excelData, setExcelData] = useState(null);
  const [dbData, setDbData] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [generatedApp, setGeneratedApp] = useState(null);
  const [savedApps, setSavedApps] = useState([]);
  const [generationStep, setGenerationStep] = useState(0);
  const [agentStatus, setAgentStatus] = useState('');
  const [feedback, setFeedback] = useState('');
  const [currentFiles, setCurrentFiles] = useState({});
  const [showDataSource, setShowDataSource] = useState(false);
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [exportingFormat, setExportingFormat] = useState(null);
  const webcontainerRef = useRef(null);
  const bootedRef = useRef(false);
  const iframeRef = useRef(null);
  const devProcessRef = useRef(null);
  const serverReadyCleanupRef = useRef(null);
  const logsRef = useRef([]);

  const generationSteps = [
    { label: t('stepGeneration'), done: generationStep > 0 },
    { label: t('stepCompilation'), done: generationStep > 1 },
    { label: t('stepReview'), done: generationStep > 2 },
    { label: t('stepVision'), done: generationStep > 3 },
    { label: t('stepFinalize'), done: generationStep > 4 },
  ];

  const addLog = (message) => {
    logsRef.current = [...logsRef.current, message];
  };

  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;

    // Configure WebContainer API key for production (must be called before boot)
    const clientId = import.meta.env.VITE_WEBCONTAINER_CLIENT_ID;
    if (clientId) {
      console.log('[Boot] Configuring WebContainer API key...');
      configureAPIKey(clientId);
    } else {
      console.log('[Boot] No VITE_WEBCONTAINER_CLIENT_ID — running in localhost mode');
    }

    console.log('[Boot] crossOriginIsolated:', window.crossOriginIsolated);
    console.log('[Boot] SharedArrayBuffer:', typeof SharedArrayBuffer !== 'undefined' ? 'available' : 'MISSING');

    const bootTimeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('WebContainer boot timeout (30s)')), 30000)
    );

    Promise.race([
      WebContainer.boot({ coep: 'credentialless' }),
      bootTimeout,
    ])
      .then((wc) => {
        webcontainerRef.current = wc;
        setIsReady(true);
      })
      .catch((error) => {
        console.error('WebContainer boot failed:', error);
        addLog(`Error: ${error.message}`);
        setBootError(error.message);
      });
  }, []);

  const handleDataLoaded = (data) => {
    setExcelData(data);
    setDbData(null);
    cachedAnalysisRef.current = null;
    cachedDataHashRef.current = null;
    addLog(`File loaded: ${data.fileName}`);
  };

  const handleSchemaLoaded = (data) => {
    setDbData(data);
    setExcelData(null);
    cachedAnalysisRef.current = null;
    cachedDataHashRef.current = null;
    addLog(`DB connected: ${data.totalTables} tables`);
  };

  const injectData = (resultFiles) => {
    const injected = {};
    for (const [path, content] of Object.entries(resultFiles)) {
      let fileContent = content;
      if (path === 'src/data.js' && excelData?.fullData) {
        fileContent = fileContent.replace('"__INJECT_DATA__"', JSON.stringify(excelData.fullData));
      }
      if (path === 'src/db.js' && dbData) {
        fileContent = fileContent.replace('"__DB_PROXY_URL__"', JSON.stringify(DB_PROXY_URL));
        fileContent = fileContent.replace('"__DB_CREDENTIALS__"', JSON.stringify(dbData.credentials));
      }
      injected[path] = fileContent;
    }
    return injected;
  };

  const injectCaptureScript = (appFiles) => {
    if (appFiles['index.html'] && appFiles['index.html'].file) {
      const html = appFiles['index.html'].file.contents;
      appFiles['index.html'].file.contents = html.replace('</body>', CAPTURE_SCRIPT + '\n</body>');
    }
    return appFiles;
  };

  const tryCompile = async (resultFiles) => {
    const injectedFiles = injectData(resultFiles);
    let appFiles = JSON.parse(JSON.stringify(baseFiles));

    for (const [path, content] of Object.entries(injectedFiles)) {
      const parts = path.split('/');
      if (parts[0] === 'src' && parts.length === 2) {
        appFiles.src.directory[parts[1]] = { file: { contents: content } };
      }
    }

    appFiles = injectCaptureScript(appFiles);
    setFiles(appFiles);
    await webcontainerRef.current.mount(appFiles);

    if (devProcessRef.current) {
      try { devProcessRef.current.kill(); } catch (_) {}
      devProcessRef.current = null;
    }

    const installProcess = await webcontainerRef.current.spawn('npm', ['install']);
    let installOutput = '';
    installProcess.output.pipeTo(new WritableStream({
      write(data) { installOutput += data; addLog(data); }
    }));
    const installExit = await installProcess.exit;
    if (installExit !== 0) {
      return { success: false, error: `npm install failed:\n${installOutput.slice(-500)}` };
    }

    const devProcess = await webcontainerRef.current.spawn('npm', ['run', 'dev']);
    devProcessRef.current = devProcess;
    let devOutput = '';
    devProcess.output.pipeTo(new WritableStream({
      write(data) { devOutput += data; addLog(data); }
    }));

    return new Promise((resolve) => {
      let resolved = false;

      if (serverReadyCleanupRef.current) {
        serverReadyCleanupRef.current();
        serverReadyCleanupRef.current = null;
      }

      const onServerReady = (port, url) => {
        if (resolved) return;
        resolved = true;
        resolve({ success: true, url });
      };

      webcontainerRef.current.on('server-ready', onServerReady);
      serverReadyCleanupRef.current = () => {
        webcontainerRef.current.off('server-ready', onServerReady);
      };

      setTimeout(() => {
        if (resolved) return;
        resolved = true;
        webcontainerRef.current.off('server-ready', onServerReady);
        serverReadyCleanupRef.current = null;
        const errorLines = devOutput.split('\n')
          .filter(line => /error|failed|cannot|unexpected|not defined|not found/i.test(line))
          .slice(-10)
          .join('\n');
        resolve({ success: false, error: errorLines || devOutput.slice(-500) || 'Timeout: server not started after 30s' });
      }, 30000);
    });
  };

  const captureScreenshot = () => {
    return new Promise((resolve) => {
      const handler = (e) => {
        if (e.data && e.data.type === 'screenshot') {
          window.removeEventListener('message', handler);
          resolve(e.data.data);
        }
        if (e.data && e.data.type === 'screenshot_error') {
          window.removeEventListener('message', handler);
          resolve(null);
        }
      };
      window.addEventListener('message', handler);
      setTimeout(() => {
        if (iframeRef.current && iframeRef.current.contentWindow) {
          iframeRef.current.contentWindow.postMessage({ type: 'capture' }, '*');
        }
      }, SCREENSHOT_DELAY);
      setTimeout(() => {
        window.removeEventListener('message', handler);
        resolve(null);
      }, SCREENSHOT_DELAY + SCREENSHOT_TIMEOUT);
    });
  };

  const stripDataFiles = (codeFiles) => {
    const stripped = {};
    for (const [path, code] of Object.entries(codeFiles)) {
      if (path !== 'src/data.js' && path !== 'src/db.js') stripped[path] = code;
    }
    return stripped;
  };

  // For review/vision: only send App.jsx (other files never change)
  const stripToAppOnly = (codeFiles) => {
    if (codeFiles['src/App.jsx']) return { 'src/App.jsx': codeFiles['src/App.jsx'] };
    return stripDataFiles(codeFiles);
  };

  // Cache data analysis result to avoid re-analyzing same dataset
  const cachedAnalysisRef = useRef(null);
  const cachedDataHashRef = useRef(null);

  // ============ FULL AGENT LOOP ============
  const agentGenerate = async (userPrompt, existingCode = null, skipReview = false, skipVision = false) => {
    const dbContext = dbData ? { type: dbData.type, schema: dbData.schema } : null;
    let currentCode = existingCode;
    let lastError = null;
    let latestUrl = null;

    // Compute a simple hash of current data to detect dataset changes
    const dataHash = excelData ? `${excelData.fileName}_${excelData.totalRows}` : dbContext ? JSON.stringify(dbContext.schema).slice(0, 100) : null;
    const hasCachedAnalysis = dataHash && dataHash === cachedDataHashRef.current && cachedAnalysisRef.current;

    for (let attempt = 0; attempt <= MAX_FIX_ATTEMPTS; attempt++) {
      if (attempt === 0) {
        setAgentStatus(t('generatingCode'));
        setGenerationStep(1);
        const result = await generateApp(userPrompt, excelData, currentCode, dbContext, selectedIndustry || null, {
          cachedAnalysis: hasCachedAnalysis ? cachedAnalysisRef.current : undefined,
        });
        currentCode = result.files;
        // Cache analysis result for subsequent calls with same dataset
        if (result._analysisResult) {
          cachedAnalysisRef.current = result._analysisResult;
          cachedDataHashRef.current = dataHash;
        }
      } else {
        setAgentStatus(t('autoFix').replace('{n}', attempt).replace('{max}', MAX_FIX_ATTEMPTS));
        const fixPrompt = `L'application a une erreur de compilation. Corrige le code.\n\nERREUR:\n${lastError}\n\nCorrige cette erreur et retourne le JSON complet avec TOUS les fichiers.`;
        const result = await generateApp(fixPrompt, excelData, stripDataFiles(currentCode), dbContext, selectedIndustry || null);
        currentCode = result.files;
      }

      setAgentStatus(attempt === 0 ? t('compiling') : t('recompiling'));
      setGenerationStep(2);

      const compileResult = await tryCompile(currentCode);

      if (compileResult.success) {
        latestUrl = compileResult.url;
        setPreviewUrl(compileResult.url);

        // Conditional review: NEVER skip when data is involved (anti-hallucination)
        const hasData = !!(excelData || dbContext);
        const isSimple = !hasData && userPrompt.split(' ').length < 50;
        const shouldReview = !skipReview && !isSimple;

        if (shouldReview) {
          setAgentStatus(t('qualityReview'));
          setGenerationStep(3);
          try {
            const reviewResult = await generateApp(REVIEW_PROMPT, excelData, stripToAppOnly(currentCode), dbContext, null, { modelHint: 'review' });
            setAgentStatus(t('recompiling'));
            const reviewCompile = await tryCompile(reviewResult.files);
            if (reviewCompile.success) {
              currentCode = reviewResult.files;
              latestUrl = reviewCompile.url;
              setPreviewUrl(reviewCompile.url);
            }
          } catch (reviewError) {
            addLog(`Review failed: ${reviewError.message}`);
          }
        }

        if (!skipVision) {
          setAgentStatus(t('visualAnalysis'));
          setGenerationStep(4);
          const screenshot = await captureScreenshot();
          if (screenshot) {
            try {
              const visionResult = await visionAnalyze(screenshot, stripToAppOnly(currentCode), excelData, dbContext);
              setAgentStatus(t('finalRecompile'));
              const visionCompile = await tryCompile(visionResult.files);
              if (visionCompile.success) {
                currentCode = visionResult.files;
                latestUrl = visionCompile.url;
                setPreviewUrl(visionCompile.url);
              }
            } catch (visionError) {
              addLog(`Vision failed: ${visionError.message}`);
            }
          }
        }

        setCurrentFiles(currentCode);
        return { success: true, url: latestUrl };
      }

      lastError = compileResult.error;
      if (attempt === MAX_FIX_ATTEMPTS) {
        return { success: false, error: lastError };
      }
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || !webcontainerRef.current) return;
    setIsLoading(true);
    setPreviewUrl(null);
    setGenerationStep(0);
    setAgentStatus(t('starting'));
    try {
      const result = await agentGenerate(prompt);
      if (result.success) {
        setGenerationStep(5);
        setAgentStatus('');
        setGeneratedApp({ name: prompt.slice(0, 30), prompt, url: result.url });
        setSavedApps(prev => [...prev, { id: Date.now(), name: prompt.slice(0, 30), prompt }]);
      } else {
        setAgentStatus(`${t('errorPrefix')}${result.error.slice(0, 200)}`);
      }
      setIsLoading(false);
    } catch (error) {
      addLog(`Error: ${error.message}`);
      setAgentStatus('');
      setIsLoading(false);
      setGenerationStep(0);
    }
  };

  const handleRefine = async () => {
    if (!feedback.trim() || !webcontainerRef.current) return;
    setIsLoading(true);
    setAgentStatus(t('modifying'));
    try {
      const dbContext = dbData ? { type: dbData.type, schema: dbData.schema } : null;
      const result = await generateApp(feedback, excelData, stripDataFiles(currentFiles), dbContext, selectedIndustry || null, {
        cachedAnalysis: cachedAnalysisRef.current || undefined,
      });
      const compileResult = await tryCompile(result.files);
      if (compileResult.success) {
        setCurrentFiles(result.files);
        setPreviewUrl(compileResult.url);
      } else {
        const fixResult = await agentGenerate(feedback, result.files, true, true);
        if (!fixResult.success) addLog(`Fix failed: ${fixResult.error.slice(0, 100)}`);
      }
      setIsLoading(false);
      setFeedback('');
      setAgentStatus('');
    } catch (error) {
      addLog(`Error: ${error.message}`);
      setIsLoading(false);
      setAgentStatus('');
    }
  };

  const handleExport = async () => {
    if (Object.keys(files).length === 0) return;
    await exportToZip(files);
  };

  const handleExportFormat = async (format) => {
    if (!excelData && !dbData) return;
    setExportingFormat(format);
    try {
      const data = excelData?.data || [];
      const title = generatedApp?.name || 'Dashboard';
      const result = await exportApp(format, data, title);
      if (result.base64) {
        const mimeTypes = { xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', pdf: 'application/pdf' };
        const byteCharacters = atob(result.base64);
        const byteArray = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) byteArray[i] = byteCharacters.charCodeAt(i);
        const blob = new Blob([byteArray], { type: mimeTypes[format] });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      addLog(`Export error: ${error.message}`);
    }
    setExportingFormat(null);
  };

  // ============ PUBLISH (build first, then upload dist/) ============
  const handlePublish = async () => {
    if (Object.keys(files).length === 0) return;
    setIsLoading(true);
    setAgentStatus('Build en cours...');
    try {
      const appName = window.prompt('Nom de l\'app:') || `app-${Date.now()}`;

      // 1. Run build in WebContainer
      addLog('Publish: build en cours...');
      const buildProcess = await webcontainerRef.current.spawn('npm', ['run', 'build']);
      let buildOutput = '';
      await buildProcess.output.pipeTo(new WritableStream({
        write(data) { buildOutput += data; }
      }));
      const buildExit = await buildProcess.exit;
      if (buildExit !== 0) {
        throw new Error(`Build failed:\n${buildOutput.slice(-500)}`);
      }
      addLog('Publish: build OK');

      // 2. Read built files from dist/
      setAgentStatus('Lecture des fichiers...');
      const builtFiles = {};
      
      async function readDir(dirPath, prefix = '') {
        const entries = await webcontainerRef.current.fs.readdir(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = dirPath + '/' + entry.name;
          const relativePath = prefix ? prefix + '/' + entry.name : entry.name;
          if (entry.isDirectory()) {
            await readDir(fullPath, relativePath);
          } else {
            const content = await webcontainerRef.current.fs.readFile(fullPath, 'utf-8');
            builtFiles[relativePath] = content;
          }
        }
      }

      await readDir('dist');
      addLog(`Publish: ${Object.keys(builtFiles).length} fichiers à publier`);

      // 3. Upload to S3
      setAgentStatus('Publication...');
      const result = await publishApp(builtFiles, appName);
      addLog(`Publié : ${result.url}`);
      setAgentStatus('');
      window.open(result.url, '_blank');
    } catch (error) {
      addLog(`Erreur publish: ${error.message}`);
      setAgentStatus('');
    }
    setIsLoading(false);
  };

  const handleBackToFactory = () => {
    setGeneratedApp(null);
    setPreviewUrl(null);
    setPrompt('');
    setFeedback('');
    setCurrentFiles({});
    setFiles({});
    logsRef.current = [];
    setGenerationStep(0);
    setAgentStatus('');
    if (devProcessRef.current) {
      try { devProcessRef.current.kill(); } catch (_) {}
      devProcessRef.current = null;
    }
  };

  // ============ GENERATED APP VIEW (fullscreen) ============
  if (generatedApp && previewUrl) {
    return (
      <div style={styles.appFullScreen}>
        <iframe
          ref={iframeRef}
          src={previewUrl}
          style={styles.fullScreenPreview}
          title="Generated App"
        />
        <motion.div
          style={styles.bottomBar}
          initial={{ y: 60 }}
          animate={{ y: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          <div style={styles.bottomActions}>
            <button onClick={handleBackToFactory} style={styles.floatingButton}>
              {t('factory')}
            </button>
            <button onClick={handleExport} style={styles.floatingButton}>
              {t('export')}
            </button>
            {(excelData || dbData) && (
              <>
                <button onClick={() => handleExportFormat('xlsx')} style={styles.floatingButton} disabled={!!exportingFormat}>
                  {exportingFormat === 'xlsx' ? t('exporting') : t('exportXlsx')}
                </button>
                <button onClick={() => handleExportFormat('pptx')} style={styles.floatingButton} disabled={!!exportingFormat}>
                  {exportingFormat === 'pptx' ? t('exporting') : t('exportPptx')}
                </button>
                <button onClick={() => handleExportFormat('pdf')} style={styles.floatingButton} disabled={!!exportingFormat}>
                  {exportingFormat === 'pdf' ? t('exporting') : t('exportPdf')}
                </button>
              </>
            )}
            <button onClick={handlePublish} style={styles.floatingButtonPrimary}>
              {t('publish')}
            </button>
          </div>
          <div style={styles.feedbackContainer}>
            <input
              style={styles.feedbackInput}
              placeholder={t('refinePlaceholder')}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
              disabled={isLoading}
            />
            <button
              style={{...styles.floatingButtonPrimary, opacity: (isLoading || !feedback.trim()) ? 0.5 : 1}}
              onClick={handleRefine}
              disabled={isLoading || !feedback.trim()}
            >
              {isLoading ? '...' : t('send')}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ============ DATA SOURCE INDICATOR ============
  const dataSourceLabel = excelData
    ? `${excelData.fileName} — ${excelData.totalRows} ${t('rows')}`
    : dbData
    ? `${dbData.totalTables} ${t('tables')} (${dbData.tableNames.slice(0, 3).join(', ')}${dbData.tableNames.length > 3 ? '...' : ''})`
    : null;

  // ============ FACTORY HOME / GENERATION ============
  return (
    <motion.div
      style={styles.container}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div style={styles.gridPattern} />

      {previewUrl && isLoading && (
        <iframe ref={iframeRef} src={previewUrl} style={styles.hiddenIframe} title="Capture" />
      )}

      {/* ---- SIDEBAR ---- */}
      <aside style={styles.sidebar}>
        <div style={styles.logoRow}>
          <Icons.logo />
          <span style={styles.logoText}>Factory</span>
          <span style={styles.versionBadge}>beta</span>
        </div>

        <button
          style={styles.newAppButton}
          onClick={() => { setPrompt(''); setGenerationStep(0); setIsLoading(false); setAgentStatus(''); }}
        >
          <span style={{ marginRight: '6px', fontSize: '16px' }}>+</span>
          {t('newApp')}
        </button>

        <AnimatePresence>
          {savedApps.length > 0 && (
            <motion.div {...fadeIn} transition={{ duration: 0.2 }}>
              <div style={styles.sectionLabel}>{t('recents')}</div>
              <nav style={styles.appList}>
                {savedApps.slice(-8).reverse().map((app, i) => (
                  <motion.div
                    key={app.id}
                    style={styles.appItem}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.25 }}
                  >
                    <span style={{ marginRight: '8px', opacity: 0.5 }}><Icons.app /></span>
                    <span style={styles.appItemText}>{app.name}</span>
                  </motion.div>
                ))}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={styles.sidebarFooter}>
          <div style={styles.userRow}>
            <div style={styles.userAvatar}>
              {(user?.email || '?')[0].toUpperCase()}
            </div>
            <span style={styles.userEmail}>{user?.email}</span>
            <button onClick={logout} style={styles.logoutButton} title={t('logout')}>↗</button>
          </div>
          <div style={styles.footerMeta}>
            <div style={styles.statusRow}>
              <motion.span
                style={{ ...styles.dot, background: isReady ? '#34D399' : bootError ? '#EF4444' : '#F59E0B' }}
                animate={isReady || bootError ? {} : { opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              />
              <span style={styles.statusText}>
                {isReady ? t('engineReady') : bootError ? 'Boot failed' : t('booting')}
              </span>
            </div>
            <LangToggle />
          </div>
        </div>
      </aside>

      {/* ---- MAIN CONTENT ---- */}
      <main style={styles.main}>
        <AnimatePresence mode="wait">
          {isLoading ? (
            /* ---- GENERATION STATE ---- */
            <motion.div
              key="generation"
              style={styles.generationScreen}
              {...fadeUp}
              transition={{ duration: 0.35 }}
            >
              <div style={styles.generationCard}>
                <div style={styles.progressBar}>
                  <motion.div
                    style={styles.progressFill}
                    animate={{ width: `${(generationStep / 5) * 100}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
                <MatrixRain step={generationStep} />
                <motion.div
                  style={styles.generationTitle}
                  {...fadeUp}
                  transition={{ delay: 0.1, duration: 0.3 }}
                >
                  {t('buildingApp')}
                </motion.div>
                <AnimatePresence mode="wait">
                  {agentStatus && (
                    <motion.div
                      key={agentStatus}
                      style={styles.agentStatus}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.2 }}
                    >
                      {agentStatus}
                    </motion.div>
                  )}
                </AnimatePresence>
                <div style={styles.stepsList}>
                  {generationSteps.map((step, index) => (
                    <motion.div
                      key={index}
                      style={styles.stepItem}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.08, duration: 0.3 }}
                    >
                      <motion.span
                        style={{
                          ...styles.stepIcon,
                          color: step.done ? '#34D399' : generationStep === index + 1 ? '#06B6D4' : '#3F3F46',
                        }}
                        animate={generationStep === index + 1 ? { scale: [1, 1.3, 1] } : {}}
                        transition={{ duration: 0.6, repeat: generationStep === index + 1 ? Infinity : 0 }}
                      >
                        {step.done ? '✓' : generationStep === index + 1 ? '●' : '○'}
                      </motion.span>
                      <span style={{
                        ...styles.stepLabel,
                        color: step.done ? '#E4E4E7' : generationStep === index + 1 ? '#FFFFFF' : '#52525B'
                      }}>
                        {step.label}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            /* ---- HOME STATE ---- */
            <motion.div
              key="home"
              style={styles.centerContent}
              {...fadeUp}
              transition={{ duration: 0.4 }}
            >
              <motion.div
                style={styles.heroSection}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <h1 style={styles.title}>{t('title')}</h1>
                <p style={styles.subtitle}>{t('subtitle')}</p>
              </motion.div>

              <motion.div
                style={styles.promptContainer}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <textarea
                  style={styles.promptInput}
                  placeholder={t('promptPlaceholder')}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleGenerate();
                    }
                  }}
                  rows={3}
                />

                {/* Industry selector */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  <span style={{ color: '#71717A', fontSize: '12px', alignSelf: 'center', marginRight: '4px' }}>{t('industryLabel')}</span>
                  {['none', 'finance', 'ecommerce', 'saas', 'logistics'].map((ind) => (
                    <button
                      key={ind}
                      onClick={() => setSelectedIndustry(ind === 'none' ? '' : ind)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '16px',
                        border: (ind === 'none' ? !selectedIndustry : selectedIndustry === ind)
                          ? '1px solid #06B6D4'
                          : '1px solid rgba(63, 63, 70, 0.3)',
                        background: (ind === 'none' ? !selectedIndustry : selectedIndustry === ind)
                          ? 'rgba(6, 182, 212, 0.15)'
                          : 'rgba(24, 24, 27, 0.4)',
                        color: (ind === 'none' ? !selectedIndustry : selectedIndustry === ind)
                          ? '#06B6D4'
                          : '#A1A1AA',
                        fontSize: '13px',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {t(`industries.${ind}`)}
                    </button>
                  ))}
                </div>

                {/* Data source */}
                <div style={styles.dataRow}>
                  {dataSourceLabel ? (
                    <motion.div
                      style={styles.dataChip}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: 'spring', damping: 20 }}
                    >
                      {excelData ? <Icons.upload /> : <Icons.database />}
                      <span style={styles.dataChipText}>{dataSourceLabel}</span>
                      <button
                        style={styles.dataChipRemove}
                        onClick={() => { setExcelData(null); setDbData(null); setShowDataSource(false); }}
                      >×</button>
                    </motion.div>
                  ) : (
                    <button
                      style={styles.dataSourceToggle}
                      onClick={() => setShowDataSource(!showDataSource)}
                    >
                      {showDataSource ? t('hideDataSource') : t('addDataSource')}
                    </button>
                  )}
                </div>

                <AnimatePresence>
                  {showDataSource && !dataSourceLabel && (
                    <motion.div
                      style={styles.dataSourcePanel}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                    >
                      <div>
                        <FileUpload onDataLoaded={(data) => { handleDataLoaded(data); setShowDataSource(false); }} />
                      </div>
                      <div style={styles.dataSeparator}>
                        <span style={styles.separatorLine} />
                        <span style={styles.separatorText}>or</span>
                        <span style={styles.separatorLine} />
                      </div>
                      <div>
                        <DbConnect onSchemaLoaded={(data) => { handleSchemaLoaded(data); setShowDataSource(false); }} apiBase={API_BASE} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button
                  style={{
                    ...styles.generateButton,
                    opacity: (!prompt.trim() || !isReady) ? 0.4 : 1,
                    cursor: (!prompt.trim() || !isReady) ? 'default' : 'pointer',
                  }}
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || !isReady}
                  whileHover={prompt.trim() && isReady ? { scale: 1.015 } : {}}
                  whileTap={prompt.trim() && isReady ? { scale: 0.985 } : {}}
                >
                  <Icons.sparkle />
                  {t('generateApp')}
                </motion.button>
              </motion.div>

              {/* Suggestions */}
              <motion.div
                style={styles.suggestionsSection}
                initial="initial"
                animate="animate"
                variants={staggerContainer}
              >
                <motion.div
                  style={styles.suggestionsLabel}
                  variants={staggerItem}
                  transition={{ duration: 0.3, delay: 0.3 }}
                >
                  {t('tryPrompt')}
                </motion.div>
                <div style={styles.suggestionsGrid}>
                  {PROMPT_SUGGESTIONS.map((s, i) => (
                    <motion.button
                      key={s.key}
                      style={styles.suggestionChip}
                      onClick={() => setPrompt(s.prompt)}
                      variants={staggerItem}
                      transition={{ duration: 0.3, delay: 0.35 + i * 0.05 }}
                      whileHover={{ scale: 1.04, borderColor: 'rgba(6, 182, 212, 0.3)' }}
                      whileTap={{ scale: 0.97 }}
                    >
                      {t(`suggestions.${s.key}`)}
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              <motion.div
                style={styles.footerRow}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                <span style={styles.footerText}>{t('poweredBy')}</span>
                <span style={styles.footerDot}>·</span>
                <span style={styles.footerText}>v0.1-beta</span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </motion.div>
  );
}

// ============ STYLES ============
const styles = {
  loadingScreen: {
    minHeight: '100vh',
    background: '#09090B',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingSpinner: {
    width: '24px',
    height: '24px',
    border: '2px solid #27272A',
    borderTop: '2px solid #06B6D4',
    borderRadius: '50%',
  },
  container: {
    display: 'grid',
    gridTemplateColumns: '260px 1fr',
    minHeight: '100vh',
    background: '#09090B',
    fontFamily: "'DM Sans', 'Inter', system-ui, -apple-system, sans-serif",
    color: '#FAFAFA',
    position: 'relative',
    overflow: 'hidden',
  },
  gridPattern: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundImage:
      'linear-gradient(rgba(6, 182, 212, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(6, 182, 212, 0.03) 1px, transparent 1px)',
    backgroundSize: '64px 64px',
    pointerEvents: 'none',
    zIndex: 0,
  },
  sidebar: {
    background: '#0F0F12',
    borderRight: '1px solid rgba(63, 63, 70, 0.4)',
    padding: '20px 14px',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 1,
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '0 8px',
    marginBottom: '24px',
  },
  logoText: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#FAFAFA',
    letterSpacing: '-0.01em',
  },
  versionBadge: {
    fontSize: '9px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#06B6D4',
    background: 'rgba(6, 182, 212, 0.1)',
    padding: '2px 6px',
    borderRadius: '4px',
    marginLeft: 'auto',
  },
  newAppButton: {
    background: 'rgba(6, 182, 212, 0.1)',
    color: '#06B6D4',
    border: '1px solid rgba(6, 182, 212, 0.2)',
    padding: '10px 14px',
    borderRadius: '8px',
    fontWeight: '500',
    fontSize: '13px',
    cursor: 'pointer',
    marginBottom: '28px',
    transition: 'all 0.15s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'inherit',
  },
  sectionLabel: {
    fontSize: '10px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: '#52525B',
    padding: '0 8px',
    marginBottom: '8px',
  },
  appList: { flex: 1, overflow: 'auto' },
  appItem: {
    padding: '8px 10px',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#A1A1AA',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    marginBottom: '2px',
    display: 'flex',
    alignItems: 'center',
  },
  appItemText: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  sidebarFooter: {
    marginTop: 'auto',
    paddingTop: '16px',
    borderTop: '1px solid rgba(63, 63, 70, 0.4)',
  },
  userRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 8px',
    marginBottom: '8px',
  },
  userAvatar: {
    width: '24px',
    height: '24px',
    borderRadius: '6px',
    background: 'rgba(6, 182, 212, 0.15)',
    color: '#06B6D4',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: '600',
    flexShrink: 0,
  },
  userEmail: {
    fontSize: '12px',
    color: '#71717A',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
  },
  logoutButton: {
    background: 'none',
    border: 'none',
    color: '#52525B',
    fontSize: '14px',
    cursor: 'pointer',
    padding: '2px 6px',
    borderRadius: '4px',
    transition: 'color 0.15s',
    flexShrink: 0,
    fontFamily: 'inherit',
  },
  footerMeta: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 8px',
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  dot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    flexShrink: 0,
    display: 'inline-block',
  },
  statusText: {
    fontSize: '11px',
    color: '#52525B',
  },
  langToggle: {
    display: 'flex',
    border: '1px solid rgba(63, 63, 70, 0.3)',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  langButton: {
    background: 'none',
    border: 'none',
    color: '#52525B',
    fontSize: '10px',
    fontWeight: '600',
    letterSpacing: '0.03em',
    padding: '3px 8px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.15s ease',
  },
  langButtonActive: {
    background: 'rgba(6, 182, 212, 0.12)',
    color: '#06B6D4',
  },
  main: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 24px',
    zIndex: 1,
    position: 'relative',
  },
  centerContent: { maxWidth: '580px', width: '100%' },
  heroSection: { textAlign: 'center', marginBottom: '36px' },
  title: {
    fontSize: '28px',
    fontWeight: '600',
    color: '#FAFAFA',
    marginBottom: '10px',
    letterSpacing: '-0.02em',
    lineHeight: '1.2',
  },
  subtitle: {
    fontSize: '14px',
    color: '#71717A',
    lineHeight: '1.5',
  },
  promptContainer: {
    background: '#0F0F12',
    borderRadius: '14px',
    padding: '20px',
    border: '1px solid rgba(63, 63, 70, 0.4)',
    marginBottom: '28px',
    overflow: 'hidden',
  },
  promptInput: {
    width: '100%',
    background: 'rgba(24, 24, 27, 0.6)',
    border: '1px solid rgba(63, 63, 70, 0.3)',
    borderRadius: '10px',
    padding: '14px 16px',
    color: '#FAFAFA',
    fontSize: '14px',
    resize: 'none',
    marginBottom: '12px',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
    lineHeight: '1.5',
    transition: 'border-color 0.15s',
  },
  dataRow: { marginBottom: '12px' },
  dataSourceToggle: {
    background: 'none',
    border: 'none',
    color: '#52525B',
    fontSize: '12px',
    cursor: 'pointer',
    padding: '4px 0',
    fontFamily: 'inherit',
    transition: 'color 0.15s',
  },
  dataChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    background: 'rgba(6, 182, 212, 0.08)',
    border: '1px solid rgba(6, 182, 212, 0.15)',
    borderRadius: '6px',
    padding: '6px 10px',
    fontSize: '12px',
    color: '#06B6D4',
  },
  dataChipText: {
    maxWidth: '300px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  dataChipRemove: {
    background: 'none',
    border: 'none',
    color: '#06B6D4',
    fontSize: '14px',
    cursor: 'pointer',
    padding: '0 2px',
    marginLeft: '4px',
    opacity: 0.6,
    fontFamily: 'inherit',
  },
  dataSourcePanel: {
    background: 'rgba(24, 24, 27, 0.4)',
    borderRadius: '10px',
    padding: '14px',
    marginBottom: '12px',
    border: '1px solid rgba(63, 63, 70, 0.2)',
    overflow: 'hidden',
  },
  dataSeparator: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    margin: '10px 0',
  },
  separatorLine: { flex: 1, height: '1px', background: 'rgba(63, 63, 70, 0.3)' },
  separatorText: {
    fontSize: '11px',
    color: '#3F3F46',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  generateButton: {
    width: '100%',
    background: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
    color: 'white',
    border: 'none',
    padding: '13px 24px',
    borderRadius: '10px',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'inherit',
    letterSpacing: '-0.01em',
  },
  suggestionsSection: { marginBottom: '40px' },
  suggestionsLabel: {
    fontSize: '11px',
    fontWeight: '500',
    color: '#3F3F46',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '10px',
  },
  suggestionsGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  suggestionChip: {
    background: 'rgba(24, 24, 27, 0.6)',
    border: '1px solid rgba(63, 63, 70, 0.3)',
    borderRadius: '20px',
    padding: '7px 14px',
    fontSize: '12px',
    color: '#A1A1AA',
    cursor: 'pointer',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
  },
  footerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  footerText: { fontSize: '11px', color: '#27272A' },
  footerDot: { color: '#27272A', fontSize: '11px' },
  generationScreen: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  generationCard: {
    background: '#0F0F12',
    borderRadius: '16px',
    padding: '40px',
    border: '1px solid rgba(63, 63, 70, 0.4)',
    textAlign: 'center',
    minWidth: '400px',
    maxWidth: '480px',
  },
  progressBar: {
    height: '3px',
    background: '#18181B',
    borderRadius: '2px',
    marginBottom: '32px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #06B6D4, #22D3EE)',
    borderRadius: '2px',
  },
  generationTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#FAFAFA',
    marginBottom: '8px',
    letterSpacing: '-0.02em',
  },
  agentStatus: {
    fontSize: '12px',
    color: '#06B6D4',
    marginBottom: '24px',
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    opacity: 0.8,
  },
  stepsList: { textAlign: 'left' },
  stepItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '7px 0',
  },
  stepIcon: {
    fontSize: '12px',
    width: '18px',
    textAlign: 'center',
    fontFamily: 'inherit',
  },
  stepLabel: { fontSize: '13px' },
  appFullScreen: {
    position: 'relative',
    width: '100vw',
    height: '100vh',
    background: '#09090B',
  },
  fullScreenPreview: {
    width: '100%',
    height: 'calc(100% - 56px)',
    border: 'none',
  },
  hiddenIframe: {
    position: 'fixed',
    top: 0, left: 0,
    width: '1280px',
    height: '800px',
    opacity: 0,
    pointerEvents: 'none',
    zIndex: -1,
  },
  bottomBar: {
    position: 'fixed',
    bottom: 0, left: 0, right: 0,
    height: '56px',
    background: 'rgba(15, 15, 18, 0.92)',
    backdropFilter: 'blur(12px)',
    borderTop: '1px solid rgba(63, 63, 70, 0.3)',
    padding: '0 14px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    zIndex: 1000,
  },
  bottomActions: {
    display: 'flex',
    gap: '6px',
    flexShrink: 0,
  },
  feedbackContainer: {
    display: 'flex',
    gap: '6px',
    flex: 1,
  },
  feedbackInput: {
    flex: 1,
    background: 'rgba(24, 24, 27, 0.6)',
    border: '1px solid rgba(63, 63, 70, 0.3)',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#FAFAFA',
    fontSize: '13px',
    fontFamily: 'inherit',
    outline: 'none',
  },
  floatingButton: {
    background: 'rgba(24, 24, 27, 0.8)',
    color: '#A1A1AA',
    border: '1px solid rgba(63, 63, 70, 0.3)',
    padding: '9px 14px',
    borderRadius: '8px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    fontFamily: 'inherit',
  },
  floatingButtonPrimary: {
    background: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
    color: 'white',
    border: 'none',
    padding: '9px 16px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    fontFamily: 'inherit',
  },
};

export default App;