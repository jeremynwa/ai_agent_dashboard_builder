import { useState } from 'react';
import * as XLSX from 'xlsx';

function FileUpload({ onDataLoaded }) {
  const [fileName, setFileName] = useState(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (event) => {
      const data = event.target.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      
      // Prendre la première feuille
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      
      // Convertir en JSON
      const jsonData = XLSX.utils.sheet_to_json(sheet);
      const headers = Object.keys(jsonData[0] || {});
      
      onDataLoaded({
        fileName: file.name,
        headers,
        data: jsonData,
        preview: jsonData.slice(0, 5) // 5 premières lignes
      });
    };

    reader.readAsBinaryString(file);
  };

  return (
    <div className="w-full">
      <label className="flex flex-col items-center justify-center w-full h-24 border border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-slate-500 hover:bg-slate-800/30 transition-all">
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          {fileName ? (
            <span className="text-sm text-slate-300">{fileName}</span>
          ) : (
            <>
              <span className="text-sm text-slate-400">Importer un fichier Excel ou CSV</span>
              <span className="text-xs text-slate-500 mt-1">Cliquez ou glissez-déposez</span>
            </>
          )}
        </div>
        <input
          type="file"
          className="hidden"
          accept=".xlsx,.xls,.csv"
          onChange={handleFile}
        />
      </label>
    </div>
  );
}

export default FileUpload;