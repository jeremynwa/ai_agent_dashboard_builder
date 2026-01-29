import { useRef, useEffect } from 'react';

function Terminal({ logs }) {
  const terminalRef = useRef(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const cleanLog = (log) => {
    return log
      .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
      .replace(/\x1b\]/g, '')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
      .trim();
  };

  return (
    <div className="bg-gray-950 rounded-lg p-4 h-48 overflow-auto font-mono text-sm" ref={terminalRef}>
      <div className="text-green-400">
        {logs.map((log, i) => {
          const cleaned = cleanLog(log);
          if (!cleaned || cleaned.length < 2) return null;
          return <div key={i} className="whitespace-pre-wrap">{cleaned}</div>;
        })}
      </div>
    </div>
  );
}

export default Terminal;