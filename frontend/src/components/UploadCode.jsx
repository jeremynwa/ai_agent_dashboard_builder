// UploadCode.jsx — ZIP upload for existing web apps
import { useState, useRef } from 'react';
import { motion } from 'motion/react';

// JSZip is loaded lazily to avoid bundle size impact on first load
async function loadJSZip() {
  const mod = await import('jszip');
  return mod.default || mod;
}

const TEXT_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
  '.html', '.css', '.scss', '.sass', '.less',
  '.json', '.yaml', '.yml', '.toml', '.env',
  '.md', '.txt', '.svg', '.vue', '.svelte',
  '.gitignore', '.eslintrc', '.prettierrc',
]);

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '__pycache__']);

function isTextFile(filename) {
  const ext = '.' + filename.split('.').pop().toLowerCase();
  return TEXT_EXTENSIONS.has(ext) || !filename.includes('.');
}

function detectStack(files) {
  const names = Object.keys(files);
  const pkg = files['package.json'];
  if (pkg) {
    try {
      const p = JSON.parse(pkg);
      const deps = { ...p.dependencies, ...p.devDependencies };
      if (deps['react']) return 'react';
      if (deps['vue']) return 'vue';
      if (deps['@angular/core']) return 'angular';
      if (deps['svelte']) return 'svelte';
      if (deps['next']) return 'nextjs';
    } catch {}
  }
  if (names.some(n => n.endsWith('.jsx') || n.endsWith('.tsx'))) return 'react';
  if (names.some(n => n.endsWith('.vue'))) return 'vue';
  if (names.some(n => n.endsWith('.svelte'))) return 'svelte';
  return 'javascript';
}

export default function UploadCode({ onCodeLoaded, t = (k) => k }) {
  const [isDragging, setIsDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState('');
  const [fileTree, setFileTree] = useState(null);
  const [parsedFiles, setParsedFiles] = useState(null);
  const [appName, setAppName] = useState('');
  const inputRef = useRef(null);

  const parseZip = async (file) => {
    setParsing(true);
    setError('');
    try {
      const JSZip = await loadJSZip();
      const zip = await JSZip.loadAsync(file);

      const files = {};
      const tree = [];

      for (const [zipPath, entry] of Object.entries(zip.files)) {
        if (entry.dir) continue;

        // Strip common top-level folder prefix (e.g. my-app/src/App.jsx → src/App.jsx)
        const parts = zipPath.split('/');
        const shouldSkip = parts.some(p => SKIP_DIRS.has(p));
        if (shouldSkip) continue;

        // Remove top-level folder if all files share the same root
        const relativePath = parts.length > 1 ? parts.slice(1).join('/') : zipPath;
        if (!relativePath || !isTextFile(relativePath)) continue;

        try {
          const content = await entry.async('string');
          if (content.length > 500000) continue; // Skip files > 500KB
          files[relativePath] = content;
          tree.push(relativePath);
        } catch {}
      }

      if (Object.keys(files).length === 0) {
        setError(t('noFilesFound'));
        setParsing(false);
        return;
      }

      const name = file.name.replace(/\.zip$/i, '').replace(/[^a-zA-Z0-9-_]/g, '-');
      setAppName(name);
      setFileTree(tree.sort());
      setParsedFiles(files);
    } catch (err) {
      setError(`${t('failedParseZip')} ${err.message}`);
    }
    setParsing(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.zip')) {
      parseZip(file);
    } else {
      setError(t('pleaseDropZip'));
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) parseZip(file);
  };

  const handleReview = () => {
    if (!parsedFiles) return;
    const stack = detectStack(parsedFiles);
    onCodeLoaded({ files: parsedFiles, appName, stack });
  };

  if (parsedFiles && fileTree) {
    const stack = detectStack(parsedFiles);
    return (
      <motion.div
        style={styles.parsedContainer}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div style={styles.parsedHeader}>
          <div>
            <div style={styles.parsedTitle}>{appName}</div>
            <div style={styles.parsedMeta}>{fileTree.length} {t('filesDetected')} · Stack: <span style={{ color: '#06B6D4' }}>{stack}</span></div>
          </div>
          <button style={styles.clearBtn} onClick={() => { setParsedFiles(null); setFileTree(null); setAppName(''); }}>
            {t('change')}
          </button>
        </div>

        <div style={styles.appNameRow}>
          <label style={styles.label}>{t('appNameLabel')}</label>
          <input
            style={styles.nameInput}
            value={appName}
            onChange={e => setAppName(e.target.value)}
            placeholder="my-consultant-app"
          />
        </div>

        <div style={styles.fileTree}>
          {fileTree.slice(0, 20).map(path => (
            <div key={path} style={styles.fileItem}>
              <span style={styles.fileIcon}>
                {path.endsWith('.jsx') || path.endsWith('.tsx') ? '' : path.endsWith('.css') ? '' : path.endsWith('.json') ? '{}' : ''}
              </span>
              <span style={styles.filePath}>{path}</span>
            </div>
          ))}
          {fileTree.length > 20 && (
            <div style={styles.moreFiles}>+{fileTree.length - 20} {t('moreFiles')}</div>
          )}
        </div>

        <motion.button
          style={styles.reviewBtn}
          onClick={handleReview}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {t('reviewWithAgents')}
        </motion.button>
      </motion.div>
    );
  }

  return (
    <div style={styles.container}>
      <div
        style={{ ...styles.dropZone, ...(isDragging ? styles.dropZoneActive : {}) }}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".zip"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
        {parsing ? (
          <div style={styles.dropContent}>
            <motion.div
              style={styles.spinner}
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            />
            <span style={styles.dropHint}>{t('parsingZip')}</span>
          </div>
        ) : (
          <div style={styles.dropContent}>
            <div style={styles.dropIcon}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="8" fill="rgba(6,182,212,0.1)"/>
                <path d="M16 8v12M10 14l6-6 6 6M8 22v2h16v-2" stroke="#06B6D4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div style={styles.dropTitle}>{t('dropZoneTitle')}</div>
            <div style={styles.dropHint}>{t('dropZoneHint')}</div>
            <div style={styles.dropSub}>{t('dropZoneSub')}</div>
          </div>
        )}
      </div>
      {error && <div style={styles.error}>{error}</div>}
    </div>
  );
}

const styles = {
  container: { width: '100%' },
  dropZone: {
    border: '2px dashed rgba(6, 182, 212, 0.25)',
    borderRadius: '12px',
    padding: '36px 24px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    background: 'rgba(6, 182, 212, 0.03)',
    textAlign: 'center',
  },
  dropZoneActive: {
    border: '2px dashed #06B6D4',
    background: 'rgba(6, 182, 212, 0.08)',
  },
  dropContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  dropIcon: { marginBottom: '4px' },
  dropTitle: { color: '#E4E4E7', fontSize: '15px', fontWeight: 500 },
  dropHint: { color: '#A1A1AA', fontSize: '13px' },
  dropSub: { color: '#52525B', fontSize: '12px', marginTop: '4px' },
  spinner: {
    width: '24px',
    height: '24px',
    border: '2px solid rgba(6,182,212,0.2)',
    borderTop: '2px solid #06B6D4',
    borderRadius: '50%',
  },
  error: {
    marginTop: '10px',
    color: '#EF4444',
    fontSize: '13px',
    background: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '8px',
    padding: '8px 12px',
  },
  parsedContainer: {
    background: '#111827',
    border: '1px solid rgba(63, 63, 70, 0.4)',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  parsedHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
  },
  parsedTitle: { color: '#E4E4E7', fontWeight: 600, fontSize: '15px' },
  parsedMeta: { color: '#71717A', fontSize: '12px', marginTop: '2px' },
  clearBtn: {
    background: 'transparent',
    border: '1px solid rgba(63, 63, 70, 0.4)',
    borderRadius: '6px',
    color: '#71717A',
    padding: '4px 10px',
    fontSize: '12px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  appNameRow: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { color: '#71717A', fontSize: '12px' },
  nameInput: {
    background: '#0B1120',
    border: '1px solid rgba(63, 63, 70, 0.5)',
    borderRadius: '6px',
    padding: '8px 12px',
    color: '#E4E4E7',
    fontSize: '13px',
    outline: 'none',
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box',
  },
  fileTree: {
    background: '#0B1120',
    borderRadius: '8px',
    padding: '10px',
    maxHeight: '160px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  fileItem: { display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 0' },
  fileIcon: { color: '#71717A', fontSize: '10px', width: '14px', textAlign: 'center' },
  filePath: { color: '#A1A1AA', fontSize: '12px', fontFamily: 'monospace' },
  moreFiles: { color: '#52525B', fontSize: '11px', paddingTop: '4px', textAlign: 'center' },
  reviewBtn: {
    background: 'linear-gradient(135deg, #06B6D4 0%, #8B5CF6 100%)',
    border: 'none',
    borderRadius: '8px',
    padding: '11px 20px',
    color: '#fff',
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box',
  },
};
