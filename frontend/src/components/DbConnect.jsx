import { useState } from 'react';

function DbConnect({ onSchemaLoaded, apiBase }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const [credentials, setCredentials] = useState({
    host: '',
    port: '5432',
    user: '',
    password: '',
    database: '',
  });

  const handleConnect = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${apiBase}/db/schema`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentials }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Connexion echouee');
      }

      const { schema } = await res.json();
      setConnected(true);
      setIsOpen(false);

      onSchemaLoaded({
        type: 'postgresql',
        credentials,
        schema,
        tableNames: Object.keys(schema),
        totalTables: Object.keys(schema).length,
      });
    } catch (err) {
      setError(err.message);
    }
    setIsLoading(false);
  };

  const inputStyle = {
    width: '100%',
    background: '#1C1C21',
    border: '1px solid #2E2E36',
    borderRadius: '6px',
    padding: '10px 12px',
    color: '#FFFFFF',
    fontSize: '13px',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    fontSize: '12px',
    color: '#A1A1AA',
    marginBottom: '4px',
    display: 'block',
  };

  const fieldStyle = {
    marginBottom: '12px',
  };

  if (connected) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 12px',
        background: 'rgba(0,118,95,0.1)',
        border: '1px solid rgba(0,118,95,0.3)',
        borderRadius: '8px',
        fontSize: '13px',
        color: '#34D399',
      }}>
        <span>PostgreSQL connecte: {credentials.database}@{credentials.host}</span>
        <button
          onClick={() => { setConnected(false); setIsOpen(true); }}
          style={{ background: 'none', border: 'none', color: '#71717A', cursor: 'pointer', fontSize: '12px' }}
        >
          Changer
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '10px 12px',
          background: '#1C1C21',
          border: '1px solid #2E2E36',
          borderRadius: '8px',
          color: '#A1A1AA',
          fontSize: '13px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        Connecter une base PostgreSQL
      </button>

      {isOpen && (
        <div style={{
          marginTop: '12px',
          padding: '16px',
          background: '#1C1C21',
          border: '1px solid #2E2E36',
          borderRadius: '8px',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: '12px' }}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Host</label>
              <input
                style={inputStyle}
                placeholder="db.example.com"
                value={credentials.host}
                onChange={(e) => setCredentials(prev => ({ ...prev, host: e.target.value }))}
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Port</label>
              <input
                style={inputStyle}
                placeholder="5432"
                value={credentials.port}
                onChange={(e) => setCredentials(prev => ({ ...prev, port: e.target.value }))}
              />
            </div>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Database</label>
            <input
              style={inputStyle}
              placeholder="my_database"
              value={credentials.database}
              onChange={(e) => setCredentials(prev => ({ ...prev, database: e.target.value }))}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={fieldStyle}>
              <label style={labelStyle}>User</label>
              <input
                style={inputStyle}
                placeholder="postgres"
                value={credentials.user}
                onChange={(e) => setCredentials(prev => ({ ...prev, user: e.target.value }))}
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Password</label>
              <input
                style={inputStyle}
                type="password"
                placeholder="********"
                value={credentials.password}
                onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
              />
            </div>
          </div>

          {error && (
            <div style={{
              padding: '8px 12px',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '6px',
              color: '#EF4444',
              fontSize: '12px',
              marginBottom: '12px',
            }}>
              {error}
            </div>
          )}

          <button
            onClick={handleConnect}
            disabled={isLoading || !credentials.host || !credentials.database}
            style={{
              width: '100%',
              padding: '10px',
              background: '#00765F',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              opacity: (isLoading || !credentials.host || !credentials.database) ? 0.5 : 1,
            }}
          >
            {isLoading ? 'Connexion...' : 'Connecter'}
          </button>
        </div>
      )}
    </div>
  );
}

export default DbConnect;