import { useState } from 'react';
import PromptInput from './components/PromptInput';
import AppPreview from './components/AppPreview';
import FileExplorer from './components/FileExplorer';
import Terminal from './components/Terminal';
import { baseFiles } from './services/files-template';

function App() {
  const [files, setFiles] = useState({});
  const [previewUrl, setPreviewUrl] = useState(null);
  const [logs, setLogs] = useState(['🚀 AI App Builder prêt']);
  const [isLoading, setIsLoading] = useState(false);

  const addLog = (message) => {
    setLogs(prev => [...prev, message]);
  };

  const handleGenerate = async (prompt) => {
    setIsLoading(true);
    addLog(`\n📝 Prompt: "${prompt}"`);
    addLog('⏳ Génération en cours...');

    // Pour l'instant, on affiche juste les fichiers de base
    // Plus tard, on appellera Claude API
    setTimeout(() => {
      setFiles(baseFiles);
      addLog('✅ Fichiers générés !');
      addLog('📦 Installation des dépendances...');
      
      // Simulation
      setTimeout(() => {
        addLog('✅ Dépendances installées');
        addLog('🚀 Démarrage du serveur...');
        setIsLoading(false);
      }, 1500);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <h1 className="text-3xl font-bold text-white mb-6">🚀 AI App Builder</h1>
      
      <div className="grid grid-cols-2 gap-6 h-[calc(100vh-120px)]">
        {/* Colonne gauche */}
        <div className="space-y-4">
          <PromptInput onGenerate={handleGenerate} isLoading={isLoading} />
          <FileExplorer files={files} />
          <Terminal logs={logs} />
        </div>
        
        {/* Colonne droite */}
        <div className="h-full">
          <AppPreview url={previewUrl} />
        </div>
      </div>
    </div>
  );
}

export default App;