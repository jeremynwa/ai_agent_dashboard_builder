import { useState } from 'react';
import * as XLSX from 'xlsx';
import { SK } from '../services/sk-theme';

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

      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet);
      const headers = Object.keys(jsonData[0] || {});

      onDataLoaded({
        fileName: file.name,
        headers,
        sample: jsonData.slice(0, 30),
        totalRows: jsonData.length,
        fullData: jsonData,
      });
    };

    reader.readAsBinaryString(file);
  };

  return (
    <div style={{ width: '100%' }}>
      <label style={styles.dropLabel}>
        <div style={styles.dropContent}>
          {fileName ? (
            <span style={{ fontSize: '14px', color: SK.textPrimary }}>{fileName}</span>
          ) : (
            <>
              <span style={{ fontSize: '14px', color: SK.textSecondary }}>Importer un fichier Excel ou CSV</span>
              <span style={{ fontSize: '12px', color: SK.textMuted, marginTop: '4px' }}>Cliquez ou glissez-deposez</span>
            </>
          )}
        </div>
        <input
          type="file"
          style={{ display: 'none' }}
          accept=".xlsx,.xls,.csv"
          onChange={handleFile}
        />
      </label>
    </div>
  );
}

const styles = {
  dropLabel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '104px',
    border: `2px dashed ${SK.borderStrong}`,
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
    background: SK.bgSecondary,
  },
  dropContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: '20px',
    paddingBottom: '24px',
  },
};

export default FileUpload;
