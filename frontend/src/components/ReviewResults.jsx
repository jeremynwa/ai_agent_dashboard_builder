// ReviewResults.jsx — Display agent review score, issues, and apply fixes
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SK } from '../services/sk-theme';

const SEVERITY_COLORS = {
  critical: { bg: 'rgba(228, 84, 68, 0.08)', border: 'rgba(228, 84, 68, 0.25)', text: SK.signalRed, label: 'Critical' },
  high: { bg: 'rgba(255, 204, 102, 0.08)', border: 'rgba(255, 204, 102, 0.25)', text: SK.signalYellow, label: 'High' },
  medium: { bg: 'rgba(109, 177, 199, 0.08)', border: 'rgba(109, 177, 199, 0.25)', text: SK.aqua, label: 'Medium' },
  low: { bg: 'rgba(168, 185, 195, 0.08)', border: 'rgba(168, 185, 195, 0.2)', text: SK.textMuted, label: 'Low' },
};

function ScoreBadge({ score, t = (k) => k }) {
  const color = score >= 70 ? SK.signalGreen : score >= 50 ? SK.signalYellow : SK.signalRed;
  const label = score >= 70 ? t('scoreApproved') : score >= 50 ? t('scoreNeedsWork') : t('scoreBlocked');

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ position: 'relative', width: '72px', height: '72px' }}>
        <svg width="72" height="72" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r="30" fill="none" stroke={SK.border} strokeWidth="6" />
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
        <div style={{ color: SK.textSecondary, fontSize: '12px', marginTop: '2px' }}>{t('qualityScore')}</div>
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
          {issues.length === 0 && <span style={{ color: SK.signalGreen, fontSize: '13px' }}>{t('noIssues')}</span>}
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
    border: `1px solid ${SK.border}`,
    borderRadius: '4px',
    color: SK.textSecondary,
    padding: '5px 12px',
    fontSize: '13px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  title: {
    color: SK.textPrimary,
    fontSize: '18px',
    fontWeight: 600,
    margin: 0,
  },
  scoreSection: {
    background: SK.bgPrimary,
    border: `1px solid ${SK.border}`,
    borderRadius: '8px',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    flexWrap: 'wrap',
    boxShadow: SK.shadowSm,
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
    background: SK.bgSecondary,
    color: SK.textSecondary,
  },
  summaryBox: {
    background: SK.bgPrimary,
    border: `1px solid ${SK.border}`,
    borderRadius: '8px',
    padding: '14px 16px',
    boxShadow: SK.shadowSm,
  },
  summaryLabel: { color: SK.textSecondary, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' },
  summaryText: { color: SK.textPrimary, fontSize: '13px', lineHeight: '1.6', margin: 0 },
  issuesSection: { display: 'flex', flexDirection: 'column', gap: '8px' },
  issuesSectionLabel: { color: SK.textSecondary, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' },
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
  issueRule: { color: SK.textSecondary, fontSize: '12px', fontFamily: 'monospace' },
  issueFile: { color: SK.textMuted, fontSize: '11px', fontFamily: 'monospace', marginLeft: 'auto' },
  issueMessage: { color: SK.textPrimary, fontSize: '13px' },
  issueFix: { color: SK.textSecondary, fontSize: '12px', fontStyle: 'italic' },
  showMoreBtn: {
    background: 'transparent',
    border: `1px solid ${SK.border}`,
    borderRadius: '4px',
    color: SK.textSecondary,
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
    background: 'rgba(109, 177, 199, 0.1)',
    border: `1px solid rgba(109, 177, 199, 0.3)`,
    borderRadius: '4px',
    color: SK.aqua,
    padding: '11px 20px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box',
  },
  fixesAppliedBadge: {
    color: SK.signalGreen,
    fontSize: '13px',
    textAlign: 'center',
    padding: '6px',
    background: 'rgba(47, 167, 77, 0.06)',
    border: '1px solid rgba(47, 167, 77, 0.2)',
    borderRadius: '8px',
  },
  deployBtn: {
    background: SK.ruby,
    border: 'none',
    borderRadius: '4px',
    color: SK.textInverse,
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 600,
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box',
    transition: 'opacity 0.2s',
  },
};
