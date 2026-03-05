// MyApps.jsx — Dashboard of user's deployed/generated apps
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getMyApps } from '../services/api';
import { SK } from '../services/sk-theme';

const STATUS_STYLES = {
  deployed: { color: SK.signalGreen, bg: 'rgba(47, 167, 77, 0.08)', border: 'rgba(47, 167, 77, 0.2)' },
  pending: { color: SK.signalYellow, bg: 'rgba(255, 204, 102, 0.08)', border: 'rgba(255, 204, 102, 0.2)' },
  failed: { color: SK.signalRed, bg: 'rgba(228, 84, 68, 0.08)', border: 'rgba(228, 84, 68, 0.2)' },
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
      whileHover={{ borderColor: SK.ruby }}
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
          <span style={{ ...styles.metaTag, color: app.reviewScore >= 70 ? SK.signalGreen : SK.signalYellow }}>
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
          <span style={{ color: SK.textSecondary, fontSize: '14px' }}>Loading your apps...</span>
        </div>
      )}

      {error && (
        <div style={styles.errorBox}>{error}</div>
      )}

      {!loading && !error && apps.length === 0 && (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect width="48" height="48" rx="12" fill="rgba(200,0,65,0.05)" stroke="rgba(200,0,65,0.15)" strokeWidth="1.5"/>
              <path d="M16 18h16M16 24h10M16 30h12" stroke={SK.border} strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="34" cy="30" r="5" stroke={SK.ruby} strokeWidth="1.5"/>
              <path d="M37.5 33.5l3 3" stroke={SK.ruby} strokeWidth="1.5" strokeLinecap="round"/>
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
    paddingBottom: '20px',
    borderBottom: `1px solid ${SK.border}`,
  },
  backBtn: {
    background: 'transparent',
    border: `1px solid ${SK.border}`,
    borderRadius: '6px',
    color: SK.textSecondary,
    padding: '5px 12px',
    fontSize: '13px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  title: { color: SK.textPrimary, fontSize: '20px', fontWeight: 700, margin: 0 },
  appCount: {
    color: SK.textMuted,
    fontSize: '13px',
    background: SK.bgSecondary,
    padding: '3px 10px',
    borderRadius: '10px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '16px',
  },
  card: {
    background: SK.bgPrimary,
    border: `1px solid ${SK.border}`,
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    transition: 'all 0.2s ease',
    cursor: 'default',
    boxShadow: SK.shadowSm,
  },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' },
  cardName: { color: SK.textPrimary, fontWeight: 600, fontSize: '14px', wordBreak: 'break-word' },
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
    color: SK.textSecondary,
    background: SK.bgSecondary,
    padding: '2px 8px',
    borderRadius: '8px',
  },
  metaDate: { fontSize: '11px', color: SK.textMuted, marginLeft: 'auto' },
  cardLinks: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' },
  link: {
    color: SK.ruby,
    fontSize: '12px',
    textDecoration: 'none',
    borderBottom: `1px solid rgba(200,0,65,0.3)`,
    paddingBottom: '1px',
  },
  ticketId: { color: SK.textSecondary, fontSize: '12px', fontFamily: 'monospace' },
  vmSpec: {
    color: SK.textMuted,
    fontSize: '11px',
    borderTop: `1px solid ${SK.border}`,
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
    border: `2px solid rgba(200,0,65,0.2)`,
    borderTop: `2px solid ${SK.ruby}`,
    borderRadius: '50%',
  },
  errorBox: {
    color: SK.signalRed,
    background: 'rgba(228, 84, 68, 0.06)',
    border: '1px solid rgba(228, 84, 68, 0.2)',
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '13px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    padding: '80px 20px',
    textAlign: 'center',
  },
  emptyIcon: {},
  emptyTitle: { color: SK.textSecondary, fontSize: '18px', fontWeight: '600' },
  emptyHint: { color: SK.textMuted, fontSize: '13px' },
  backToFactoryBtn: {
    background: 'rgba(200,0,65,0.08)',
    border: `1px solid rgba(200,0,65,0.25)`,
    borderRadius: '8px',
    color: SK.ruby,
    padding: '9px 20px',
    fontSize: '14px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    marginTop: '8px',
    boxShadow: '0 2px 6px rgba(200, 0, 65, 0.1)',
  },
};
