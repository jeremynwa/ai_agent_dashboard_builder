// ReviewResults.jsx — Display agent review score, issues, and apply fixes
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

const SEVERITY_COLORS = {
  critical: { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)', text: '#EF4444', label: 'Critical' },
  high: { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)', text: '#F59E0B', label: 'High' },
  medium: { bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.3)', text: '#8B5CF6', label: 'Medium' },
  low: { bg: 'rgba(161, 161, 170, 0.1)', border: 'rgba(161, 161, 170, 0.2)', text: '#A1A1AA', label: 'Low' },
};

function ScoreBadge({ score, t = (k) => k }) {
  const color = score >= 70 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444';
  const label = score >= 70 ? t('scoreApproved') : score >= 50 ? t('scoreNeedsWork') : t('scoreBlocked');

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ position: 'relative', width: '72px', height: '72px' }}>
        <svg width="72" height="72" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(63,63,70,0.3)" strokeWidth="6" />
          <circle
            cx="36" cy="36" r="30"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeDasharray={`${(score / 100) * 188.5} 188.5`}
            strokeDashoffset="47.1"
            strokeLinecap="round"
            transform="rotate(-90 36 36)"
            style={{ transition: 'stroke-dasharray 0.6s ease' }}
          />
          <text x="36" y="40" textAnchor="middle" fill={color} fontSize="16" fontWeight="700" fontFamily="inherit">
            {score}
          </text>
        </svg>
      </div>
      <div>
        <div style={{ color, fontWeight: 700, fontSize: '16px' }}>{label}</div>
        <div style={{ color: '#71717A', fontSize: '12px', marginTop: '2px' }}>{t('qualityScore')}</div>
      </div>
    </div>
  );
}

function IssueItem({ issue, t = (k) => k }) {
  const sev = SEVERITY_COLORS[issue.severity] || SEVERITY_COLORS.low;
  return (
    <div style={{ ...styles.issueCard, background: sev.bg, border: `1px solid ${sev.border}` }}>
      <div style={styles.issueHeader}>
        <span style={{ ...styles.severityBadge, color: sev.text, background: sev.border }}>{sev.label}</span>
        <span style={styles.issueRule}>{issue.rule}</span>
        {issue.file && <span style={styles.issueFile}>{issue.file}{issue.line ? `:${issue.line}` : ''}</span>}
      </div>
      <div style={styles.issueMessage}>{issue.message}</div>
      {issue.fix && <div style={styles.issueFix}>{t('fixPrefix')} {issue.fix}</div>}
    </div>
  );
}

export default function ReviewResults({ score, issues = [], summary, approved, fixedFiles, originalFiles, onApplyFixes, onProceedToDeploy, onBack, t = (k) => k }) {
  const [fixesApplied, setFixesApplied] = useState(false);
  const [showAllIssues, setShowAllIssues] = useState(false);

  const critical = issues.filter(i => i.severity === 'critical');
  const high = issues.filter(i => i.severity === 'high');
  const medium = issues.filter(i => i.severity === 'medium');
  const low = issues.filter(i => i.severity === 'low');

  const displayedIssues = showAllIssues ? issues : issues.slice(0, 5);

  const handleApplyFixes = () => {
    if (fixedFiles && onApplyFixes) {
      onApplyFixes(fixedFiles);
      setFixesApplied(true);
    }
  };

  return (
    <motion.div
      style={styles.container}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onBack}>{t('back')}</button>
        <h2 style={styles.title}>{t('reviewResultsTitle')}</h2>
      </div>

      {/* Score */}
      <div style={styles.scoreSection}>
        <ScoreBadge score={score} t={t} />
        <div style={styles.issueSummary}>
          {critical.length > 0 && <span style={styles.issueCount} data-sev="critical">{critical.length} Critical</span>}
          {high.length > 0 && <span style={styles.issueCount} data-sev="high">{high.length} High</span>}
          {medium.length > 0 && <span style={styles.issueCount} data-sev="medium">{medium.length} Medium</span>}
          {low.length > 0 && <span style={styles.issueCount} data-sev="low">{low.length} Low</span>}
          {issues.length === 0 && <span style={{ color: '#10B981', fontSize: '13px' }}>{t('noIssues')}</span>}
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div style={styles.summaryBox}>
          <div style={styles.summaryLabel}>{t('assessment')}</div>
          <p style={styles.summaryText}>{summary}</p>
        </div>
      )}

      {/* Issues */}
      {issues.length > 0 && (
        <div style={styles.issuesSection}>
          <div style={styles.issuesSectionLabel}>{t('issuesLabel')} ({issues.length})</div>
          <div style={styles.issuesList}>
            {displayedIssues.map((issue, i) => (
              <IssueItem key={i} issue={issue} t={t} />
            ))}
          </div>
          {issues.length > 5 && (
            <button style={styles.showMoreBtn} onClick={() => setShowAllIssues(!showAllIssues)}>
              {showAllIssues ? t('showLess') : t('showAllIssues').replace('{n}', issues.length)}
            </button>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={styles.actions}>
        {!fixesApplied && fixedFiles && Object.keys(fixedFiles).length > 0 && (
          <motion.button
            style={styles.fixBtn}
            onClick={handleApplyFixes}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {t('applyFixes').replace('{n}', Object.keys(fixedFiles).length)}
          </motion.button>
        )}

        {fixesApplied && (
          <div style={styles.fixesAppliedBadge}>{t('fixesApplied')}</div>
        )}

        <motion.button
          style={{ ...styles.deployBtn, opacity: approved ? 1 : 0.45, cursor: approved ? 'pointer' : 'not-allowed' }}
          onClick={approved ? onProceedToDeploy : undefined}
          disabled={!approved}
          whileHover={approved ? { scale: 1.02 } : {}}
          whileTap={approved ? { scale: 0.98 } : {}}
          title={!approved ? t('deployScoreRequired').replace('{score}', score) : ''}
        >
          {approved ? t('proceedDeploy') : t('deployLocked').replace('{score}', score)}
        </motion.button>
      </div>
    </motion.div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    width: '100%',
    maxWidth: '640px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
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
  title: {
    color: '#E4E4E7',
    fontSize: '18px',
    fontWeight: 600,
    margin: 0,
  },
  scoreSection: {
    background: '#111827',
    border: '1px solid rgba(63,63,70,0.4)',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    flexWrap: 'wrap',
  },
  issueSummary: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  issueCount: {
    fontSize: '12px',
    padding: '3px 10px',
    borderRadius: '20px',
    background: 'rgba(63,63,70,0.3)',
    color: '#A1A1AA',
  },
  summaryBox: {
    background: '#111827',
    border: '1px solid rgba(63,63,70,0.4)',
    borderRadius: '10px',
    padding: '14px 16px',
  },
  summaryLabel: { color: '#71717A', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' },
  summaryText: { color: '#E4E4E7', fontSize: '13px', lineHeight: '1.6', margin: 0 },
  issuesSection: { display: 'flex', flexDirection: 'column', gap: '8px' },
  issuesSectionLabel: { color: '#71717A', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  issuesList: { display: 'flex', flexDirection: 'column', gap: '6px' },
  issueCard: {
    borderRadius: '8px',
    padding: '10px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  issueHeader: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  severityBadge: {
    fontSize: '10px',
    padding: '2px 8px',
    borderRadius: '10px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  issueRule: { color: '#A1A1AA', fontSize: '12px', fontFamily: 'monospace' },
  issueFile: { color: '#52525B', fontSize: '11px', fontFamily: 'monospace', marginLeft: 'auto' },
  issueMessage: { color: '#E4E4E7', fontSize: '13px' },
  issueFix: { color: '#71717A', fontSize: '12px', fontStyle: 'italic' },
  showMoreBtn: {
    background: 'transparent',
    border: '1px solid rgba(63,63,70,0.35)',
    borderRadius: '6px',
    color: '#71717A',
    padding: '6px 14px',
    fontSize: '12px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    alignSelf: 'flex-start',
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  fixBtn: {
    background: 'rgba(139, 92, 246, 0.15)',
    border: '1px solid rgba(139, 92, 246, 0.35)',
    borderRadius: '8px',
    color: '#8B5CF6',
    padding: '11px 20px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box',
  },
  fixesAppliedBadge: {
    color: '#10B981',
    fontSize: '13px',
    textAlign: 'center',
    padding: '6px',
    background: 'rgba(16, 185, 129, 0.08)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    borderRadius: '8px',
  },
  deployBtn: {
    background: 'linear-gradient(135deg, #06B6D4 0%, #8B5CF6 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 600,
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box',
    transition: 'opacity 0.2s',
  },
};
