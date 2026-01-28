import { useState, useRef, useEffect } from 'react';

function Terminal({ logs }) {
  const terminalRef = useRef(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="bg-gray-950 rounded-lg p-4 h-48 overflow-auto font-mono text-sm" ref={terminalRef}>
      <div className="text-green-400">
        {logs.map((log, i) => (
          <div key={i} className="whitespace-pre-wrap">{log}</div>
        ))}
      </div>
    </div>
  );
}

export default Terminal;