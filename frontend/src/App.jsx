// frontend/src/App.jsx
import { useState, useEffect, useRef } from 'react';
import { WebContainer } from '@webcontainer/api';
import { baseFiles } from './services/files-template';
import { generateApp, visionAnalyze, publishApp, API_BASE, DB_PROXY_URL } from './services/api';
import { exportToZip } from './services/export';
import FileUpload from './components/FileUpload';
import DbConnect from './components/DbConnect';
import AuthProvider, { useAuth } from './components/AuthProvider';
import Login from './components/Login';
import MatrixRain from './components/MatrixRain';

const MAX_FIX_ATTEMPTS = 3;
const SCREENSHOT_DELAY = 4000;
const SCREENSHOT_TIMEOUT = 10000;

const REVIEW_PROMPT = `Review et améliore ce code React. Vérifie et corrige SYSTÉMATIQUEMENT :

1. LABELS: Chaque graphique a un titre clair et une légende explicite
2. UNITÉS: Les KPIs affichent les unités correctes (EUR, %, unités, etc.)
3. FORMATAGE: Les nombres sont formatés (séparateurs de milliers, décimales appropriées)
4. ESPACEMENT: Le layout est aéré, pas de contenus collés ou trop serrés
5. COULEURS: Le design system est respecté (fond #0F0F12, cards #16161A, accent #00765F)
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
        backgroundColor: '#0F0F12',
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

// ============ AUTH GATE ============
// Wraps entire app — shows Login if not authenticated
function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}

function AuthGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.loadingText}>Chargement...</div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return <Factory />;
}

// ============ MAIN FACTORY (previously the entire App) ============
function Factory() {
  const { user, logout } = useAuth();

  const [files, setFiles] = useState({});
  const [previewUrl, setPreviewUrl] = useState(null);
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [excelData, setExcelData] = useState(null);
  const [dbData, setDbData] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [generatedApp, setGeneratedApp] = useState(null);
  const [savedApps, setSavedApps] = useState([]);
  const [generationStep, setGenerationStep] = useState(0);
  const [agentStatus, setAgentStatus] = useState('');
  const [feedback, setFeedback] = useState('');
  const [currentFiles, setCurrentFiles] = useState({});
  const webcontainerRef = useRef(null);
  const bootedRef = useRef(false);
  const iframeRef = useRef(null);
  const devProcessRef = useRef(null);
  const serverReadyCleanupRef = useRef(null);

  const generationSteps = [
    { label: 'Génération du code', done: generationStep > 0 },
    { label: 'Compilation', done: generationStep > 1 },
    { label: 'Review qualité', done: generationStep > 2 },
    { label: 'Analyse visuelle', done: generationStep > 3 },
    { label: 'Finalisation', done: generationStep > 4 },
  ];

  const addLog = (message) => {
    setLogs(prev => [...prev, message]);
  };

  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    addLog('Initialisation...');
    WebContainer.boot()
      .then((wc) => {
        webcontainerRef.current = wc;
        addLog('Environnement prêt');
        setIsReady(true);
      })
      .catch((error) => {
        addLog(`Erreur : ${error.message}`);
      });
  }, []);

  const handleDataLoaded = (data) => {
    setExcelData(data);
    setDbData(null);
    addLog(`Fichier chargé : ${data.fileName}`);
  };

  const handleSchemaLoaded = (data) => {
    setDbData(data);
    setExcelData(null);
    addLog(`DB connectée : ${data.totalTables} tables`);
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

    // Kill previous dev server
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
        resolve({ success: false, error: errorLines || devOutput.slice(-500) || 'Timeout : serveur non démarré après 30s' });
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

  // ============ FULL AGENT LOOP ============
  const agentGenerate = async (userPrompt, existingCode = null, skipReview = false, skipVision = false) => {
    const dbContext = dbData ? { type: dbData.type, schema: dbData.schema } : null;
    let currentCode = existingCode;
    let lastError = null;
    let latestUrl = null;

    for (let attempt = 0; attempt <= MAX_FIX_ATTEMPTS; attempt++) {
      if (attempt === 0) {
        setAgentStatus('Génération du code...');
        setGenerationStep(1);
        addLog('Agent : génération initiale');
        const result = await generateApp(userPrompt, excelData, currentCode, dbContext);
        currentCode = result.files;
        addLog('Agent : code généré');
      } else {
        setAgentStatus(`Correction automatique (tentative ${attempt}/${MAX_FIX_ATTEMPTS})...`);
        addLog(`Agent : correction tentative ${attempt}/${MAX_FIX_ATTEMPTS}`);
        const fixPrompt = `L'application a une erreur de compilation. Corrige le code.\n\nERREUR:\n${lastError}\n\nCorrige cette erreur et retourne le JSON complet avec TOUS les fichiers.`;
        const result = await generateApp(fixPrompt, excelData, stripDataFiles(currentCode), dbContext);
        currentCode = result.files;
        addLog('Agent : code corrigé');
      }

      setAgentStatus(attempt === 0 ? 'Compilation...' : `Recompilation (tentative ${attempt})...`);
      setGenerationStep(2);
      addLog('Agent : compilation...');

      const compileResult = await tryCompile(currentCode);

      if (compileResult.success) {
        addLog(`Agent : compilation réussie${attempt > 0 ? ` (après ${attempt} corrections)` : ''}`);
        latestUrl = compileResult.url;
        setPreviewUrl(compileResult.url);

        // PHASE 2: Quality Review
        if (!skipReview) {
          setAgentStatus('Review qualité en cours...');
          setGenerationStep(3);
          addLog('Agent : review qualité...');
          try {
            const reviewResult = await generateApp(REVIEW_PROMPT, excelData, stripDataFiles(currentCode), dbContext);
            addLog('Agent : code amélioré');
            setAgentStatus('Recompilation après review...');
            const reviewCompile = await tryCompile(reviewResult.files);
            if (reviewCompile.success) {
              currentCode = reviewResult.files;
              latestUrl = reviewCompile.url;
              setPreviewUrl(reviewCompile.url);
              addLog('Agent : review compilée avec succès');
            } else {
              addLog('Agent : review a cassé le code, version pré-review gardée');
            }
          } catch (reviewError) {
            addLog(`Agent : review échouée (${reviewError.message}), version pré-review gardée`);
          }
        }

        // PHASE 3: Vision Analysis
        if (!skipVision) {
          setAgentStatus('Capture du screenshot...');
          setGenerationStep(4);
          addLog('Agent : capture screenshot...');
          const screenshot = await captureScreenshot();
          if (screenshot) {
            addLog('Agent : screenshot capturé, analyse visuelle...');
            setAgentStatus('Analyse visuelle par l\'IA...');
            try {
              const visionResult = await visionAnalyze(screenshot, stripDataFiles(currentCode), excelData, dbContext);
              addLog('Agent : améliorations visuelles reçues');
              setAgentStatus('Recompilation après analyse visuelle...');
              const visionCompile = await tryCompile(visionResult.files);
              if (visionCompile.success) {
                currentCode = visionResult.files;
                latestUrl = visionCompile.url;
                setPreviewUrl(visionCompile.url);
                addLog('Agent : version visuelle compilée avec succès');
              } else {
                addLog('Agent : corrections visuelles ont cassé le code, version précédente gardée');
              }
            } catch (visionError) {
              addLog(`Agent : analyse visuelle échouée (${visionError.message}), version précédente gardée`);
            }
          } else {
            addLog('Agent : screenshot échoué, phase vision ignorée');
          }
        }

        setCurrentFiles(currentCode);
        return { success: true, url: latestUrl };
      }

      lastError = compileResult.error;
      addLog(`Agent : erreur détectée — ${lastError.slice(0, 100)}...`);
      if (attempt === MAX_FIX_ATTEMPTS) {
        addLog(`Agent : échec après ${MAX_FIX_ATTEMPTS} tentatives`);
        return { success: false, error: lastError };
      }
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || !webcontainerRef.current) return;
    setIsLoading(true);
    setPreviewUrl(null);
    setGenerationStep(0);
    setAgentStatus('Démarrage de l\'agent...');
    addLog(`Agent: "${prompt}"`);
    try {
      const result = await agentGenerate(prompt);
      if (result.success) {
        setGenerationStep(5);
        setAgentStatus('');
        setGeneratedApp({ name: prompt.slice(0, 30), prompt, url: result.url });
        setSavedApps(prev => [...prev, { id: Date.now(), name: prompt.slice(0, 30), prompt }]);
      } else {
        setAgentStatus(`Erreur : ${result.error.slice(0, 200)}`);
        addLog(`Erreur finale : ${result.error}`);
      }
      setIsLoading(false);
    } catch (error) {
      addLog(`Erreur : ${error.message}`);
      setAgentStatus('');
      setIsLoading(false);
      setGenerationStep(0);
    }
  };

  const handleRefine = async () => {
    if (!feedback.trim() || !webcontainerRef.current) return;
    setIsLoading(true);
    setAgentStatus('Modification en cours...');
    addLog(`Agent refine: "${feedback}"`);
    try {
      const dbContext = dbData ? { type: dbData.type, schema: dbData.schema } : null;
      const result = await generateApp(feedback, excelData, stripDataFiles(currentFiles), dbContext);
      const compileResult = await tryCompile(result.files);
      if (compileResult.success) {
        setCurrentFiles(result.files);
        setPreviewUrl(compileResult.url);
        addLog('Agent : modification réussie');
      } else {
        addLog('Agent : erreur sur le refine, tentative de correction...');
        const fixResult = await agentGenerate(feedback, result.files, true, true);
        if (!fixResult.success) {
          addLog(`Agent : échec de la correction — ${fixResult.error.slice(0, 100)}`);
        }
      }
      setIsLoading(false);
      setFeedback('');
      setAgentStatus('');
    } catch (error) {
      addLog(`Erreur : ${error.message}`);
      setIsLoading(false);
      setAgentStatus('');
    }
  };

  const handleExport = async () => {
    if (Object.keys(files).length === 0) return;
    await exportToZip(files);
    addLog('Export téléchargé');
  };

  const handlePublish = async () => {
    if (Object.keys(files).length === 0) return;
    setIsLoading(true);
    try {
      const appName = window.prompt('Nom de l\'app:') || `app-${Date.now()}`;
      const result = await publishApp(files, appName);
      addLog(`Publié : ${result.url}`);
      window.open(result.url, '_blank');
    } catch (error) {
      addLog(`Erreur : ${error.message}`);
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
    setLogs([]);
    setGenerationStep(0);
    setAgentStatus('');
    if (devProcessRef.current) {
      try { devProcessRef.current.kill(); } catch (_) {}
      devProcessRef.current = null;
    }
  };

  const handleTemplate = (template) => {
    const templates = {
      finance: 'Dashboard financier avec revenus, dépenses, profit et tendances mensuelles',
      marketing: 'Dashboard marketing avec performances des campagnes, conversions et audience',
      research: 'Dashboard recherche avec métriques, publications et projets en cours'
    };
    setPrompt(templates[template]);
  };

  // ============ ETAT 3: App Generee (plein ecran) ============
  if (generatedApp && previewUrl) {
    return (
      <div style={styles.appFullScreen}>
        <iframe
          ref={iframeRef}
          src={previewUrl}
          style={styles.fullScreenPreview}
          title="Generated App"
        />
        <div style={styles.bottomBar}>
          <div style={styles.bottomActions}>
            <button onClick={handleBackToFactory} style={styles.floatingButton}>
              ← Factory
            </button>
            <button onClick={handleExport} style={styles.floatingButton}>
              Exporter
            </button>
            <button onClick={handlePublish} style={styles.floatingButtonPrimary}>
              Publier
            </button>
          </div>
          <div style={styles.feedbackContainer}>
            <input
              style={styles.feedbackInput}
              placeholder="Modifie l'app... ex: ajoute un graphique, change les couleurs..."
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
              {isLoading ? 'Modification...' : 'Envoyer'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============ ETAT 1 & 2: Factory Home / Generation ============
  return (
    <div style={styles.container}>
      {previewUrl && isLoading && (
        <iframe ref={iframeRef} src={previewUrl} style={styles.hiddenIframe} title="Capture" />
      )}

      <aside style={styles.sidebar}>
        <div style={styles.logo}>FACTORY</div>

        <button
          style={styles.newAppButton}
          onClick={() => { setPrompt(''); setGenerationStep(0); setIsLoading(false); setAgentStatus(''); }}
        >
          + New App
        </button>

        <div style={styles.sectionLabel}>Mes Apps</div>
        <nav style={styles.appList}>
          {savedApps.length === 0 ? (
            <div style={styles.emptyState}>Aucune app</div>
          ) : (
            savedApps.map(app => (
              <div key={app.id} style={styles.appItem}>{app.name}</div>
            ))
          )}
        </nav>

        <div style={styles.sidebarFooter}>
          {/* USER INFO + LOGOUT */}
          <div style={styles.userRow}>
            <span style={styles.userEmail}>{user?.email}</span>
            <button onClick={logout} style={styles.logoutButton}>
              Déconnexion
            </button>
          </div>
          <div style={styles.statusDot}>
            <span style={{
              ...styles.dot,
              background: isReady ? '#34D399' : '#F59E0B'
            }}></span>
            {isReady ? 'Prêt' : 'Chargement...'}
          </div>
        </div>
      </aside>

      <main style={styles.main}>
        {isLoading ? (
          <div style={styles.generationScreen}>
            <div style={styles.generationCard}>
              <div style={styles.progressBar}>
                <div style={{
                  ...styles.progressFill,
                  width: `${(generationStep / 5) * 100}%`
                }}></div>
              </div>
              <MatrixRain step={generationStep} />
              <div style={styles.generationTitle}>Agent IA en action</div>
              {agentStatus && <div style={styles.agentStatus}>{agentStatus}</div>}
              <div style={styles.stepsList}>
                {generationSteps.map((step, index) => (
                  <div key={index} style={styles.stepItem}>
                    <span style={{
                      ...styles.stepIcon,
                      color: step.done ? '#34D399' : generationStep === index + 1 ? '#F59E0B' : '#52525B'
                    }}>
                      {step.done ? 'V' : generationStep === index + 1 ? 'O' : 'o'}
                    </span>
                    <span style={{
                      ...styles.stepLabel,
                      color: step.done ? '#FFFFFF' : generationStep === index + 1 ? '#FFFFFF' : '#52525B'
                    }}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={styles.centerContent}>
            <h1 style={styles.title}>Quelle analyse voulez-vous créer ?</h1>
            <div style={styles.promptContainer}>
              <textarea
                style={styles.promptInput}
                placeholder='Ex: "Dashboard des ventes Q4 avec KPIs, tendances et alertes"'
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
              />
              <div style={styles.dataSourceLabel}>Source de données</div>
              <FileUpload onDataLoaded={handleDataLoaded} />
              <div style={styles.dataSeparator}>
                <span style={styles.separatorLine}></span>
                <span style={styles.separatorText}>ou</span>
                <span style={styles.separatorLine}></span>
              </div>
              <DbConnect onSchemaLoaded={handleSchemaLoaded} apiBase={API_BASE} />
              {excelData && (
                <div style={styles.fileInfo}>
                  Fichier: {excelData.fileName} ({excelData.totalRows} lignes)
                </div>
              )}
              {dbData && (
                <div style={styles.fileInfo}>
                  DB: {dbData.totalTables} tables ({dbData.tableNames.join(', ')})
                </div>
              )}
              <button
                style={{ ...styles.generateButton, opacity: (!prompt.trim() || !isReady) ? 0.5 : 1 }}
                onClick={handleGenerate}
                disabled={!prompt.trim() || !isReady}
              >
                Générer l'App
              </button>
            </div>
            <div style={styles.templates}>
              <div style={styles.templateCard} onClick={() => handleTemplate('finance')}>
                <div style={styles.templateIcon}>$</div>
                <div style={styles.templateName}>Finance</div>
                <div style={styles.templateDesc}>Template</div>
              </div>
              <div style={styles.templateCard} onClick={() => handleTemplate('marketing')}>
                <div style={styles.templateIcon}>M</div>
                <div style={styles.templateName}>Marketing</div>
                <div style={styles.templateDesc}>Template</div>
              </div>
              <div style={styles.templateCard} onClick={() => handleTemplate('research')}>
                <div style={styles.templateIcon}>R</div>
                <div style={styles.templateName}>Research</div>
                <div style={styles.templateDesc}>Template</div>
              </div>
            </div>
            {logs.length > 0 && (
              <div style={styles.logsContainer}>
                <div style={styles.logsTitle}>Logs</div>
                <div style={styles.logs}>
                  {logs.slice(-5).map((log, i) => (
                    <div key={i} style={styles.logLine}>{log}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  // Auth loading screen
  loadingScreen: {
    minHeight: '100vh',
    background: '#0F0F12',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#71717A',
    fontSize: '14px',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  // Main layout
  container: {
    display: 'grid',
    gridTemplateColumns: '260px 1fr',
    minHeight: '100vh',
    background: '#0F0F12',
    fontFamily: 'Inter, system-ui, sans-serif',
    color: '#FFFFFF',
  },
  sidebar: {
    background: '#16161A',
    borderRight: '1px solid #2E2E36',
    padding: '24px 16px',
    display: 'flex',
    flexDirection: 'column',
  },
  logo: {
    fontSize: '12px',
    fontWeight: '700',
    letterSpacing: '0.1em',
    color: '#FFFFFF',
    marginBottom: '24px',
    paddingLeft: '12px',
  },
  newAppButton: {
    background: '#00765F',
    color: 'white',
    border: 'none',
    padding: '12px 16px',
    borderRadius: '8px',
    fontWeight: '500',
    fontSize: '14px',
    cursor: 'pointer',
    marginBottom: '32px',
    transition: 'all 0.2s ease',
  },
  sectionLabel: {
    fontSize: '10px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#52525B',
    padding: '8px 12px',
    marginBottom: '8px',
  },
  appList: { flex: 1 },
  appItem: {
    padding: '10px 12px',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#A1A1AA',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginBottom: '4px',
  },
  emptyState: {
    padding: '12px',
    fontSize: '13px',
    color: '#52525B',
    fontStyle: 'italic',
  },
  sidebarFooter: {
    marginTop: 'auto',
    paddingTop: '16px',
    borderTop: '1px solid #2E2E36',
  },
  userRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    marginBottom: '8px',
  },
  userEmail: {
    fontSize: '12px',
    color: '#A1A1AA',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '140px',
  },
  logoutButton: {
    background: 'none',
    border: '1px solid #2E2E36',
    color: '#71717A',
    fontSize: '11px',
    padding: '4px 10px',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    flexShrink: 0,
  },
  statusDot: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    fontSize: '12px',
    color: '#71717A',
  },
  dot: { width: '8px', height: '8px', borderRadius: '50%' },
  main: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
  },
  centerContent: { maxWidth: '600px', width: '100%' },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: '32px',
    color: '#FFFFFF',
  },
  promptContainer: {
    background: '#16161A',
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid #2E2E36',
    marginBottom: '32px',
  },
  promptInput: {
    width: '100%',
    background: '#1C1C21',
    border: '1px solid #2E2E36',
    borderRadius: '8px',
    padding: '16px',
    color: '#FFFFFF',
    fontSize: '14px',
    resize: 'none',
    marginBottom: '16px',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
  },
  dataSourceLabel: {
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#52525B',
    marginBottom: '12px',
  },
  dataSeparator: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: '12px 0',
  },
  separatorLine: { flex: 1, height: '1px', background: '#2E2E36' },
  separatorText: { fontSize: '12px', color: '#52525B' },
  fileInfo: {
    fontSize: '12px',
    color: '#71717A',
    marginTop: '12px',
    marginBottom: '16px',
    padding: '8px 12px',
    background: '#232329',
    borderRadius: '6px',
  },
  generateButton: {
    width: '100%',
    background: '#00765F',
    color: 'white',
    border: 'none',
    padding: '14px 24px',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginTop: '16px',
  },
  templates: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    marginBottom: '32px',
  },
  templateCard: {
    background: '#16161A',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #2E2E36',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  templateIcon: {
    width: '40px',
    height: '40px',
    background: '#232329',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 12px',
    fontSize: '16px',
    color: '#A1A1AA',
  },
  templateName: { fontSize: '14px', fontWeight: '500', color: '#FFFFFF', marginBottom: '4px' },
  templateDesc: { fontSize: '12px', color: '#71717A' },
  logsContainer: {
    background: '#16161A',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid #2E2E36',
  },
  logsTitle: {
    fontSize: '10px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#52525B',
    marginBottom: '12px',
  },
  logs: {
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: '11px',
    color: '#71717A',
    maxHeight: '100px',
    overflow: 'auto',
  },
  logLine: { padding: '2px 0' },
  generationScreen: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  generationCard: {
    background: '#16161A',
    borderRadius: '16px',
    padding: '40px',
    border: '1px solid #2E2E36',
    textAlign: 'center',
    minWidth: '400px',
    maxWidth: '500px',
  },
  progressBar: {
    height: '4px',
    background: '#232329',
    borderRadius: '2px',
    marginBottom: '32px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #00765F, #00A382)',
    borderRadius: '2px',
    transition: 'width 0.5s ease',
  },
  generationTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: '12px',
  },
  agentStatus: {
    fontSize: '13px',
    color: '#F59E0B',
    marginBottom: '24px',
    fontFamily: 'JetBrains Mono, monospace',
  },
  stepsList: { textAlign: 'left', marginBottom: '24px' },
  stepItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 0',
  },
  stepIcon: { fontSize: '16px', width: '20px', textAlign: 'center' },
  stepLabel: { fontSize: '14px' },
  appFullScreen: {
    position: 'relative',
    width: '100vw',
    height: '100vh',
    background: '#0F0F12',
  },
  fullScreenPreview: {
    width: '100%',
    height: 'calc(100% - 60px)',
    border: 'none',
  },
  hiddenIframe: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '1280px',
    height: '800px',
    opacity: 0,
    pointerEvents: 'none',
    zIndex: -1,
  },
  bottomBar: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60px',
    background: 'rgba(22, 22, 26, 0.95)',
    backdropFilter: 'blur(8px)',
    borderTop: '1px solid #2E2E36',
    padding: '0 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    zIndex: 1000,
  },
  bottomActions: {
    display: 'flex',
    gap: '8px',
    flexShrink: 0,
  },
  feedbackContainer: {
    display: 'flex',
    gap: '8px',
    flex: 1,
  },
  feedbackInput: {
    flex: 1,
    background: '#1C1C21',
    border: '1px solid #2E2E36',
    borderRadius: '8px',
    padding: '10px 16px',
    color: '#FFFFFF',
    fontSize: '13px',
    fontFamily: 'inherit',
    outline: 'none',
  },
  floatingButton: {
    background: 'rgba(22, 22, 26, 0.95)',
    color: '#A1A1AA',
    border: '1px solid #2E2E36',
    padding: '10px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  floatingButtonPrimary: {
    background: '#00765F',
    color: 'white',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
};

export default App;