import { useState, useEffect, useRef } from 'react';
import { WebContainer } from '@webcontainer/api';
import { baseFiles } from './services/files-template';
import { generateApp, publishApp } from './services/api';
import { exportToZip } from './services/export';
import FileUpload from './components/FileUpload';

function App() {
  const [files, setFiles] = useState({});
  const [previewUrl, setPreviewUrl] = useState(null);
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [excelData, setExcelData] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [generatedApp, setGeneratedApp] = useState(null);
  const [savedApps, setSavedApps] = useState([]);
  const [generationStep, setGenerationStep] = useState(0);
  const webcontainerRef = useRef(null);
  const bootedRef = useRef(false);

  const generationSteps = [
    { label: 'Structure', done: generationStep > 0 },
    { label: 'Composants', done: generationStep > 1 },
    { label: 'Visualisations', done: generationStep > 2 },
    { label: 'Donnees', done: generationStep > 3 },
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
        addLog('Environnement pret');
        setIsReady(true);
      })
      .catch((error) => {
        addLog(`Erreur: ${error.message}`);
      });
  }, []);

  const handleDataLoaded = (data) => {
    setExcelData(data);
    addLog(`Fichier charge: ${data.fileName}`);
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || !webcontainerRef.current) return;

    setIsLoading(true);
    setPreviewUrl(null);
    setGenerationStep(0);
    addLog(`Generation: "${prompt}"`);

    try {
      setGenerationStep(1);
      const result = await generateApp(prompt, excelData);
      addLog('Code genere');

      setGenerationStep(2);
      const appFiles = JSON.parse(JSON.stringify(baseFiles));
      
      for (const [path, content] of Object.entries(result.files)) {
        let fileContent = content;
        
        // Injecter les vraies données à la place du placeholder
        if (path === 'src/data.js' && excelData?.fullData) {
          const jsonData = JSON.stringify(excelData.fullData);
          fileContent = fileContent.replace('"__INJECT_DATA__"', jsonData);
        }
        
        const parts = path.split('/');
        if (parts[0] === 'src' && parts.length === 2) {
          appFiles.src.directory[parts[1]] = { file: { contents: fileContent } };
        }
      }

      setFiles(appFiles);
      await webcontainerRef.current.mount(appFiles);
      addLog('Fichiers montes');

      setGenerationStep(3);
      const installProcess = await webcontainerRef.current.spawn('npm', ['install']);
      installProcess.output.pipeTo(new WritableStream({
        write(data) { addLog(data); }
      }));

      await installProcess.exit;
      addLog('Dependances installees');

      setGenerationStep(4);
      await webcontainerRef.current.spawn('npm', ['run', 'dev']);

      webcontainerRef.current.on('server-ready', (port, url) => {
        addLog(`Serveur pret`);
        setPreviewUrl(url);
        setGeneratedApp({ name: prompt.slice(0, 30), prompt, url });
        setSavedApps(prev => [...prev, { id: Date.now(), name: prompt.slice(0, 30), prompt }]);
        setIsLoading(false);
        setGenerationStep(5);
      });

    } catch (error) {
      addLog(`Erreur: ${error.message}`);
      setIsLoading(false);
      setGenerationStep(0);
    }
  };

  const handleExport = async () => {
    if (Object.keys(files).length === 0) return;
    await exportToZip(files);
    addLog('Export telecharge');
  };

  const handlePublish = async () => {
    if (Object.keys(files).length === 0) return;
    setIsLoading(true);
    try {
      const appName = window.prompt('Nom de l\'app:') || `app-${Date.now()}`;
      const result = await publishApp(files, appName);
      addLog(`Publie: ${result.url}`);
      window.open(result.url, '_blank');
    } catch (error) {
      addLog(`Erreur: ${error.message}`);
    }
    setIsLoading(false);
  };

  const handleBackToFactory = () => {
    setGeneratedApp(null);
    setPreviewUrl(null);
    setPrompt('');
    setGenerationStep(0);
  };

  const handleTemplate = (template) => {
    const templates = {
      finance: 'Dashboard financier avec revenus, depenses, profit et tendances mensuelles',
      marketing: 'Dashboard marketing avec performances des campagnes, conversions et audience',
      research: 'Dashboard recherche avec metriques, publications et projets en cours'
    };
    setPrompt(templates[template]);
  };

  // ETAT 3: App Generee (plein ecran)
  if (generatedApp && previewUrl) {
    return (
      <div style={styles.appFullScreen}>
        <div style={styles.floatingActions}>
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

        <iframe
          src={previewUrl}
          style={styles.fullScreenPreview}
          title="Generated App"
        />
      </div>
    );
  }

  // ETAT 1 & 2: Factory Home + Generation
  return (
    <div style={styles.container}>
      <aside style={styles.sidebar}>
        <div style={styles.logo}>FACTORY</div>
        
        <button 
          style={styles.newAppButton}
          onClick={() => { setPrompt(''); setGenerationStep(0); setIsLoading(false); }}
        >
          + New App
        </button>

        <div style={styles.sectionLabel}>Mes Apps</div>
        <nav style={styles.appList}>
          {savedApps.length === 0 ? (
            <div style={styles.emptyState}>Aucune app</div>
          ) : (
            savedApps.map(app => (
              <div key={app.id} style={styles.appItem}>
                {app.name}
              </div>
            ))
          )}
        </nav>

        <div style={styles.sidebarFooter}>
          <div style={styles.settingsItem}>Settings</div>
          <div style={styles.statusDot}>
            <span style={{
              ...styles.dot,
              background: isReady ? '#34D399' : '#F59E0B'
            }}></span>
            {isReady ? 'Pret' : 'Chargement...'}
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
                  width: `${(generationStep / 4) * 100}%`
                }}></div>
              </div>

              <div style={styles.generationTitle}>Construction de votre app...</div>

              <div style={styles.stepsList}>
                {generationSteps.map((step, index) => (
                  <div key={index} style={styles.stepItem}>
                    <span style={{
                      ...styles.stepIcon,
                      color: step.done ? '#34D399' : generationStep === index + 1 ? '#F59E0B' : '#52525B'
                    }}>
                      {step.done ? '✓' : generationStep === index + 1 ? '◐' : '○'}
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
              
              <FileUpload onDataLoaded={handleDataLoaded} />
              {excelData && (
              <div style={styles.fileInfo}>
                Fichier: {excelData.fileName} ({excelData.totalRows} lignes)
              </div>
              )}

              <button 
                style={{
                  ...styles.generateButton,
                  opacity: (!prompt.trim() || !isReady) ? 0.5 : 1
                }}
                onClick={handleGenerate}
                disabled={!prompt.trim() || !isReady}
              >
                Generer l'App →
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
  appList: {
    flex: 1,
  },
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
  settingsItem: {
    padding: '10px 12px',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#71717A',
    cursor: 'pointer',
    marginBottom: '12px',
  },
  statusDot: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    fontSize: '12px',
    color: '#71717A',
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  main: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
  },
  centerContent: {
    maxWidth: '600px',
    width: '100%',
  },
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
  fileInfo: {
    fontSize: '12px',
    color: '#71717A',
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
  templateName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: '4px',
  },
  templateDesc: {
    fontSize: '12px',
    color: '#71717A',
  },
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
  logLine: {
    padding: '2px 0',
  },
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
    minWidth: '320px',
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
    marginBottom: '32px',
  },
  stepsList: {
    textAlign: 'left',
  },
  stepItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 0',
  },
  stepIcon: {
    fontSize: '16px',
    width: '20px',
    textAlign: 'center',
  },
  stepLabel: {
    fontSize: '14px',
  },
  appFullScreen: {
    position: 'relative',
    width: '100vw',
    height: '100vh',
    background: '#0F0F12',
  },
  floatingActions: {
    position: 'fixed',
    bottom: '16px',
    left: '16px',
    zIndex: 1000,
    display: 'flex',
    gap: '8px',
  },
  floatingButton: {
    background: 'rgba(22, 22, 26, 0.95)',
    backdropFilter: 'blur(8px)',
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
  fullScreenPreview: {
    width: '100%',
    height: '100%',
    border: 'none',
    paddingBottom: '60px',
    boxSizing: 'border-box',
  },
};

export default App;