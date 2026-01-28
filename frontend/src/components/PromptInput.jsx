import { useState } from 'react';

function PromptInput({ onGenerate, isLoading }) {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = () => {
    if (prompt.trim() && !isLoading) {
      onGenerate(prompt);
    }
  };

  return (
    <div className="space-y-3">
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Décris l'app que tu veux créer... Ex: Un calculateur d'élasticité des prix"
        className="w-full h-32 bg-gray-800 text-white rounded-lg p-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        onClick={handleSubmit}
        disabled={isLoading || !prompt.trim()}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition"
      >
        {isLoading ? '⏳ Génération...' : '🚀 Générer'}
      </button>
    </div>
  );
}

export default PromptInput;