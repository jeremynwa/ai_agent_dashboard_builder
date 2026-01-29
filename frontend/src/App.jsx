import { useState, useEffect, useRef } from 'react';
import { WebContainer } from '@webcontainer/api';
import PromptInput from './components/PromptInput';
import AppPreview from './components/AppPreview';
import Terminal from './components/Terminal';
import FileUpload from './components/FileUpload.jsx';
import { baseFiles } from './services/files-template';
import { generateApp, publishApp } from './services/api';
import { exportToZip } from './services/export';

function App() {
  const [files, setFiles] = useState({});
  const [previewUrl, setPreviewUrl] = useState(null);
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [excelData, setExcelData] = useState(null);
  const webcontainerRef = useRef(null);
  const bootedRef = useRef(false);

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
        addLog(`Erreur: ${error.message}`);
      });
  }, []);

  const handleDataLoaded = (data) => {
    setExcelData(data);
    addLog(`Fichier chargé: ${data.fileName} (${data.data.length} lignes)`);
  };

  const handleGenerate = async (prompt) => {
    if (!webcontainerRef.current) {
      addLog('Environnement pas encore prêt');
      return;
    }

    setIsLoading(true);
    setPreviewUrl(null);
    addLog(`Prompt: "${prompt}"`);
    addLog('Génération du code...');

    try {
      const result = await generateApp(prompt, excelData);
      addLog('Code généré');

      const appFiles = JSON.parse(JSON.stringify(baseFiles));
      
      for (const [path, content] of Object.entries(result.files)) {
        const parts = path.split('/');
        if (parts[0] === 'src' && parts.length === 2) {
          appFiles.src.directory[parts[1]] = { file: { contents: content } };
        }
      }

      setFiles(appFiles);
      await webcontainerRef.current.mount(appFiles);
      addLog('Fichiers montés');

      addLog('Installation des dépendances...');
      const installProcess = await webcontainerRef.current.spawn('npm', ['install']);
      
      installProcess.output.pipeTo(new WritableStream({
        write(data) {
          addLog(data);
        }
      }));

      const exitCode = await installProcess.exit;
      if (exitCode !== 0) {
        throw new Error('Installation échouée');
      }
      addLog('Dépendances installées');

      addLog('Démarrage du serveur...');
      await webcontainerRef.current.spawn('npm', ['run', 'dev']);

      webcontainerRef.current.on('server-ready', (port, url) => {
        addLog(`Serveur prêt: ${url}`);
        setPreviewUrl(url);
        setIsLoading(false);
      });

    } catch (error) {
      addLog(`Erreur: ${error.message}`);
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    if (Object.keys(files).length === 0) {
      addLog('Aucun fichier à exporter');
      return;
    }
    addLog('Export en cours...');
    await exportToZip(files);
    addLog('Export téléchargé');
  };

  const handlePublish = async () => {
    if (Object.keys(files).length === 0) {
      addLog('Aucun fichier à publier');
      return;
    }
    
    setIsLoading(true);
    addLog('Publication en cours...');
    
    try {
      const appName = prompt('Nom de l\'app:') || `app-${Date.now()}`;
      const result = await publishApp(files, appName);
      addLog('App publiée');
      addLog(`URL: ${result.url}`);
      window.open(result.url, '_blank');
    } catch (error) {
      addLog(`Erreur: ${error.message}`);
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white tracking-tight">
            App Builder
          </h1>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isReady ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
            <span className="text-sm text-slate-400">
              {isReady ? 'Prêt' : 'Chargement...'}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-2 gap-6 h-[calc(100vh-100px)]">
          
          <div className="flex flex-col gap-4">
            <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
              <FileUpload onDataLoaded={handleDataLoaded} />
              {excelData && (
                <div className="mt-3 text-xs text-slate-400">
                  Colonnes: {excelData.headers.join(', ')}
                </div>
              )}
            </div>

            <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
              <PromptInput onGenerate={handleGenerate} isLoading={isLoading || !isReady} />
            </div>
            
            <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50 flex-1">
              <h2 className="text-sm font-medium text-slate-400 mb-3">Logs</h2>
              <Terminal logs={logs} />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 flex-1 overflow-hidden">
              <div className="bg-slate-900/50 px-4 py-2 border-b border-slate-700/50 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-500/80"></span>
                  <span className="w-3 h-3 rounded-full bg-amber-500/80"></span>
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80"></span>
                </div>
                <span className="text-sm text-slate-500 ml-2">Preview</span>
              </div>
              <div className="h-[calc(100%-40px)]">
                <AppPreview url={previewUrl} />
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleExport}
                disabled={Object.keys(files).length === 0}
                className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-white font-medium py-3 px-6 rounded-lg transition-all"
              >
                Exporter
              </button>
              <button
                onClick={handlePublish}
                disabled={Object.keys(files).length === 0 || isLoading}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-medium py-3 px-6 rounded-lg transition-all"
              >
                Publier
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;