function FileExplorer({ files }) {
  const renderTree = (obj, path = '') => {
    return Object.entries(obj).map(([name, value]) => {
      const fullPath = path ? `${path}/${name}` : name;
      
      if (value.directory) {
        return (
          <div key={fullPath} className="ml-2">
            <div className="text-yellow-400">📂 {name}</div>
            <div className="ml-2">
              {renderTree(value.directory, fullPath)}
            </div>
          </div>
        );
      }
      
      return (
        <div key={fullPath} className="ml-2 text-gray-300">
          📄 {name}
        </div>
      );
    });
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 h-64 overflow-auto">
      <h3 className="text-white font-bold mb-2">📁 Fichiers</h3>
      {Object.keys(files).length > 0 ? (
        <div className="font-mono text-sm">
          {renderTree(files)}
        </div>
      ) : (
        <p className="text-gray-400 text-sm">Aucun fichier généré</p>
      )}
    </div>
  );
}

export default FileExplorer;