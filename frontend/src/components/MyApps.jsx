// MyApps.jsx — Dashboard of user's deployed/generated apps
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getMyApps } from '../services/api';

const STATUS_STYLES = {
  deployed: { color: '#10B981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)' },
  pending: { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)' },
  failed: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)' },
};

const SOURCE_LABELS = {
  generated: 'AI Generated',
  uploaded: 'Uploaded & Reviewed',
};

function AppCard({ app }) {
  const st = STATUS_STYLES[app.status] || STATUS_STYLES.pending;
  const createdAt = app.createdAt ? new Date(app.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

  return (
    <motion.div
      style={styles.card}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ borderColor: 'rgba(6,182,212,0.3)' }}
    >
      <div style={styles.cardHeader}>
        <div style={styles.cardName}>{app.appName}</div>
        <span style={{ ...styles.statusBadge, color: st.color, background: st.bg, borderColor: st.border }}>
          {app.status || 'deployed'}
        </span>
      </div>

      <div style={styles.cardMeta}>
        {app.stack && <span style={styles.metaTag}>{app.stack}</span>}
        {app.source && <span style={styles.metaTag}>{SOURCE_LABELS[app.source] || app.source}</span>}
        {typeof app.reviewScore === 'number' && (
          <span style={{ ...styles.metaTag, color: app.reviewScore >= 70 ? '#10B981' : '#F59E0B' }}>
            Score: {app.reviewScore}/100
          </span>
        )}
        {createdAt && <span style={styles.metaDate}>{createdAt}</span>}
      </div>

      <div style={styles.cardLinks}>
        {app.repoUrl && (
          <a href={app.repoUrl} target="_blank" rel="noopener noreferrer" style={styles.link}>
            GitLab Repo
          </a>
        )}
        {app.webUrl && app.webUrl !== app.repoUrl && (
          <a href={app.webUrl} target="_blank" rel="noopener noreferrer" style={styles.link}>
            Web URL
          </a>
        )}
        {app.ticketId && (
          <span style={styles.ticketId}>Ticket: {app.ticketId}</span>
        )}
      </div>

      {app.vmSpec && (
        <div style={styles.vmSpec}>
          VM: {app.vmSpec.vmSize} — {app.vmSpec.estimatedMonthlyCost || ''}
        </div>
      )}
    </motion.div>
  );
}

export default function MyApps({ onBack }) {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getMyApps()
      .then(data => setApps(data.apps || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <motion.div
      style={styles.container}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onBack}>Factory</button>
        <h2 style={styles.title}>My Apps</h2>
        <span style={styles.appCount}>{apps.length} app{apps.length !== 1 ? 's' : ''}</span>
      </div>

      {loading && (
        <div style={styles.centerState}>
          <motion.div
            style={styles.spinner}
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          />
          <span style={{ color: '#71717A', fontSize: '14px' }}>Loading your apps...</span>
        </div>
      )}

      {error && (
        <div style={styles.errorBox}>{error}</div>
      )}

      {!loading && !error && apps.length === 0 && (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect width="48" height="48" rx="12" fill="rgba(6,182,212,0.05)" stroke="rgba(6,182,212,0.15)" strokeWidth="1.5"/>
              <path d="M16 18h16M16 24h10M16 30h12" stroke="#3F3F46" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="34" cy="30" r="5" stroke="#06B6D4" strokeWidth="1.5"/>
              <path d="M37.5 33.5l3 3" stroke="#06B6D4" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div style={styles.emptyTitle}>No apps yet</div>
          <div style={styles.emptyHint}>Deploy your first app from the factory to see it here.</div>
          <button style={styles.backToFactoryBtn} onClick={onBack}>Go to Factory</button>
        </div>
      )}

      {!loading && apps.length > 0 && (
        <div style={styles.grid}>
          {apps.map((app, i) => (
            <AppCard key={app.appId || i} app={app} />
          ))}
        </div>
      )}
    </motion.div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    width: '100%',
    height: '100%',
    overflow: 'auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    paddingBottom: '16px',
    borderBottom: '1px solid rgba(63,63,70,0.3)',
  },
  backBtn: {
    background: 'transparent',
    border: '1px solid rgba(63,63,70,0.4)',
    borderRadius: '6px',
    color: '#71717A',
    padding: '5px 12px',
    fontSize: '13px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  title: { color: '#E4E4E7', fontSize: '20px', fontWeight: 700, margin: 0 },
  appCount: {
    color: '#52525B',
    fontSize: '13px',
    background: 'rgba(63,63,70,0.2)',
    padding: '3px 10px',
    borderRadius: '10px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '12px',
  },
  card: {
    background: '#111827',
    border: '1px solid rgba(63,63,70,0.4)',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    transition: 'border-color 0.2s ease',
    cursor: 'default',
  },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' },
  cardName: { color: '#E4E4E7', fontWeight: 600, fontSize: '14px', wordBreak: 'break-word' },
  statusBadge: {
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '10px',
    border: '1px solid',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  cardMeta: { display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' },
  metaTag: {
    fontSize: '11px',
    color: '#71717A',
    background: 'rgba(63,63,70,0.2)',
    padding: '2px 8px',
    borderRadius: '8px',
  },
  metaDate: { fontSize: '11px', color: '#52525B', marginLeft: 'auto' },
  cardLinks: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' },
  link: {
    color: '#06B6D4',
    fontSize: '12px',
    textDecoration: 'none',
    borderBottom: '1px solid rgba(6,182,212,0.3)',
    paddingBottom: '1px',
  },
  ticketId: { color: '#71717A', fontSize: '12px', fontFamily: 'monospace' },
  vmSpec: {
    color: '#52525B',
    fontSize: '11px',
    borderTop: '1px solid rgba(63,63,70,0.2)',
    paddingTop: '8px',
  },
  centerState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    padding: '60px 20px',
  },
  spinner: {
    width: '28px',
    height: '28px',
    border: '2px solid rgba(6,182,212,0.2)',
    borderTop: '2px solid #06B6D4',
    borderRadius: '50%',
  },
  errorBox: {
    color: '#EF4444',
    background: 'rgba(239,68,68,0.08)',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '13px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    padding: '60px 20px',
    textAlign: 'center',
  },
  emptyIcon: {},
  emptyTitle: { color: '#A1A1AA', fontSize: '16px', fontWeight: 500 },
  emptyHint: { color: '#71717A', fontSize: '13px' },
  backToFactoryBtn: {
    background: 'rgba(6,182,212,0.1)',
    border: '1px solid rgba(6,182,212,0.3)',
    borderRadius: '8px',
    color: '#06B6D4',
    padding: '9px 20px',
    fontSize: '14px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    marginTop: '8px',
  },
};
