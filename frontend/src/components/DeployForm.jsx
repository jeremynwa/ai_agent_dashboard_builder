// DeployForm.jsx — GitLab push + VM request form
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { pushToGitLab, requestVm, saveApp } from '../services/api';

const VM_SIZES = [
  { value: 'Standard_B1ms', label: 'Standard_B1ms — 1 vCPU, 2GB (Small prototype)' },
  { value: 'Standard_B2s', label: 'Standard_B2s — 2 vCPU, 4GB (Internal tool)' },
  { value: 'Standard_D2s_v3', label: 'Standard_D2s_v3 — 2 vCPU, 8GB (Team dashboard)' },
  { value: 'Standard_D4s_v3', label: 'Standard_D4s_v3 — 4 vCPU, 16GB (Production)' },
];

const DURATIONS = ['1 month', '3 months', '6 months', '1 year', 'Indefinite'];

export default function DeployForm({ files, appName, reviewScore = 0, stack = 'react', source = 'generated', onSuccess, onBack }) {
  // GitLab fields
  const [projectName, setProjectName] = useState(appName || '');
  const [description, setDescription] = useState('');
  const [generateCI, setGenerateCI] = useState(false);

  // VM fields
  const [estimatedUsers, setEstimatedUsers] = useState('10');
  const [vmSize, setVmSize] = useState('');
  const [duration, setDuration] = useState('3 months');
  const [justification, setJustification] = useState('');

  // State
  const [step, setStep] = useState('form'); // 'form' | 'deploying' | 'success' | 'error'
  const [deployStatus, setDeployStatus] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleDeploy = async () => {
    if (!projectName.trim()) return;
    setStep('deploying');
    setError('');

    try {
      // Step 1: Push to GitLab
      setDeployStatus('Pushing to GitLab...');
      const gitResult = await pushToGitLab(files, projectName.trim(), description.trim(), generateCI);

      // Step 2: Request VM
      setDeployStatus('Submitting VM request...');
      const vmResult = await requestVm({
        appName: projectName.trim(),
        repoUrl: gitResult.repoUrl,
        stack,
        estimatedUsers: parseInt(estimatedUsers) || 10,
        justification: justification.trim(),
        vmSize: vmSize || undefined,
        duration,
        reviewScore,
        source,
      });

      // Step 3: Save to My Apps
      setDeployStatus('Saving to your apps...');
      await saveApp({
        appName: projectName.trim(),
        source,
        reviewScore,
        repoUrl: gitResult.repoUrl,
        webUrl: gitResult.webUrl,
        ticketId: vmResult.ticketId,
        stack,
        status: 'deployed',
        vmSpec: vmResult.vmSpec,
        collaboratorsAdded: gitResult.collaboratorsAdded,
      }).catch(() => {}); // Non-fatal

      setResult({ gitResult, vmResult });
      setStep('success');
      if (onSuccess) onSuccess({ gitResult, vmResult });

    } catch (err) {
      setError(err.message);
      setStep('error');
    }
  };

  if (step === 'deploying') {
    return (
      <motion.div style={styles.centerState} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <motion.div
          style={styles.spinner}
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        />
        <div style={styles.deployingStatus}>{deployStatus}</div>
      </motion.div>
    );
  }

  if (step === 'success' && result) {
    const { gitResult, vmResult } = result;
    const pendingCollabs = gitResult.pendingCollaborators || [];
    const addedCollabs = gitResult.collaboratorsAdded || [];
    const ciFiles = gitResult.ciFilesAdded || [];

    return (
      <motion.div style={styles.successContainer} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div style={styles.successIcon}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="22" stroke="#10B981" strokeWidth="2" fill="rgba(16,185,129,0.08)"/>
            <path d="M14 24l7 7 13-13" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h3 style={styles.successTitle}>Deployed successfully</h3>

        <div style={styles.resultCards}>
          {gitResult.repoUrl && (
            <a href={gitResult.repoUrl} target="_blank" rel="noopener noreferrer" style={styles.resultCard}>
              <div style={styles.resultCardLabel}>GitLab Repository</div>
              <div style={styles.resultCardValue}>{gitResult.repoUrl}</div>
            </a>
          )}

          {vmResult.ticketId && (
            <div style={styles.resultCard}>
              <div style={styles.resultCardLabel}>VM Request Ticket</div>
              <div style={styles.resultCardValue}>{vmResult.ticketId}</div>
            </div>
          )}

          {!vmResult.ticketId && (
            <div style={styles.resultCard}>
              <div style={styles.resultCardLabel}>VM Spec Generated</div>
              <div style={styles.resultCardValue}>{vmResult.vmSpec?.vmSize} — {vmResult.vmSpec?.estimatedMonthlyCost}</div>
              <div style={{ color: '#F59E0B', fontSize: '12px', marginTop: '6px' }}>
                Service Desk not configured — submit manually with the spec above
              </div>
            </div>
          )}

          {ciFiles.length > 0 && (
            <div style={styles.resultCard}>
              <div style={styles.resultCardLabel}>CI/CD Pipelines included</div>
              {ciFiles.map(f => (
                <div key={f} style={{ ...styles.resultCardValue, color: '#8B5CF6', fontFamily: 'monospace', fontSize: '12px' }}>{f}</div>
              ))}
              <div style={{ color: '#52525B', fontSize: '11px', marginTop: '6px' }}>
                GitLab CI deploys to GitLab Pages · Azure Pipelines to Azure Static Web Apps
              </div>
            </div>
          )}

          {vmResult.teamsMessageSent && (
            <div style={styles.teamsNotif}>
              Teams notification sent to the data team
            </div>
          )}
        </div>

        {(addedCollabs.length > 0 || pendingCollabs.length > 0) && (
          <div style={styles.collabBox}>
            <div style={styles.collabTitle}>Collaborators</div>
            {addedCollabs.length > 0 && (
              <div style={styles.collabText}>
                Auto-added as Developer: {addedCollabs.join(', ')}
              </div>
            )}
            {pendingCollabs.length > 0 && (
              <div style={styles.collabWarning}>
                Could not auto-add: {pendingCollabs.join(', ')}
                <br />
                Go to your repo Settings → Members → Add member → Developer
              </div>
            )}
          </div>
        )}

        <button style={styles.doneBtn} onClick={onBack}>Done</button>
      </motion.div>
    );
  }

  if (step === 'error') {
    return (
      <motion.div style={styles.errorContainer} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div style={styles.errorTitle}>Deployment failed</div>
        <div style={styles.errorMsg}>{error}</div>
        <div style={styles.errorActions}>
          <button style={styles.retryBtn} onClick={() => setStep('form')}>Try again</button>
          <button style={styles.cancelBtn} onClick={onBack}>Back</button>
        </div>
      </motion.div>
    );
  }

  // ---- FORM ----
  return (
    <motion.div
      style={styles.container}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onBack}>Back</button>
        <h2 style={styles.title}>Deploy to GitLab + Request VM</h2>
      </div>

      {/* GitLab Section */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginRight: '6px' }}>
            <path d="M8 1L10.5 6H14L10 9.5 11.5 14.5 8 11.5 4.5 14.5 6 9.5 2 6H5.5L8 1Z" stroke="#06B6D4" strokeWidth="1.2" strokeLinejoin="round"/>
          </svg>
          GitLab Repository
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Project name *</label>
          <input
            style={styles.input}
            value={projectName}
            onChange={e => setProjectName(e.target.value)}
            placeholder="my-dashboard-q1-2026"
          />
          <div style={styles.inputHint}>Will be created in your team's GitLab group</div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Description</label>
          <input
            style={styles.input}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Analytics dashboard for the finance team"
          />
        </div>

        <label style={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={generateCI}
            onChange={e => setGenerateCI(e.target.checked)}
            style={{ accentColor: '#06B6D4' }}
          />
          <span style={styles.checkboxLabel}>
            Generate CI/CD pipelines (.gitlab-ci.yml + azure-pipelines.yml)
          </span>
        </label>
      </div>

      {/* VM Section */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginRight: '6px' }}>
            <rect x="1" y="3" width="14" height="10" rx="2" stroke="#8B5CF6" strokeWidth="1.2"/>
            <path d="M5 8h6M8 5v6" stroke="#8B5CF6" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          VM Request
        </div>

        <div style={styles.formRow}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Estimated users</label>
            <input
              style={styles.input}
              type="number"
              min="1"
              value={estimatedUsers}
              onChange={e => setEstimatedUsers(e.target.value)}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Duration</label>
            <select style={styles.select} value={duration} onChange={e => setDuration(e.target.value)}>
              {DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>VM size (optional — AI will recommend if blank)</label>
          <select style={styles.select} value={vmSize} onChange={e => setVmSize(e.target.value)}>
            <option value="">Let AI recommend</option>
            {VM_SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Business justification</label>
          <textarea
            style={styles.textarea}
            value={justification}
            onChange={e => setJustification(e.target.value)}
            placeholder="Purpose of the app, which team will use it, expected usage..."
            rows={3}
          />
        </div>
      </div>

      {/* Summary */}
      <div style={styles.summaryRow}>
        <span style={styles.summaryItem}>Review score: <strong style={{ color: reviewScore >= 70 ? '#10B981' : '#F59E0B' }}>{reviewScore}/100</strong></span>
        <span style={styles.summaryItem}>Stack: <strong style={{ color: '#06B6D4' }}>{stack}</strong></span>
        <span style={styles.summaryItem}>Source: <strong style={{ color: '#A1A1AA' }}>{source}</strong></span>
      </div>

      <motion.button
        style={{
          ...styles.deployBtn,
          opacity: projectName.trim() ? 1 : 0.4,
          cursor: projectName.trim() ? 'pointer' : 'not-allowed',
        }}
        onClick={handleDeploy}
        disabled={!projectName.trim()}
        whileHover={projectName.trim() ? { scale: 1.015 } : {}}
        whileTap={projectName.trim() ? { scale: 0.985 } : {}}
      >
        Deploy to GitLab + Request VM
      </motion.button>
    </motion.div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    width: '100%',
    maxWidth: '560px',
    margin: '0 auto',
  },
  header: { display: 'flex', alignItems: 'center', gap: '12px' },
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
  title: { color: '#E4E4E7', fontSize: '17px', fontWeight: 600, margin: 0 },
  section: {
    background: '#111827',
    border: '1px solid rgba(63,63,70,0.4)',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  sectionTitle: {
    color: '#E4E4E7',
    fontSize: '13px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    paddingBottom: '8px',
    borderBottom: '1px solid rgba(63,63,70,0.3)',
    marginBottom: '4px',
  },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '5px' },
  formRow: { display: 'flex', gap: '12px' },
  label: { color: '#71717A', fontSize: '12px' },
  input: {
    background: '#0B1120',
    border: '1px solid rgba(63,63,70,0.5)',
    borderRadius: '7px',
    padding: '9px 12px',
    color: '#E4E4E7',
    fontSize: '13px',
    outline: 'none',
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box',
  },
  select: {
    background: '#0B1120',
    border: '1px solid rgba(63,63,70,0.5)',
    borderRadius: '7px',
    padding: '9px 12px',
    color: '#E4E4E7',
    fontSize: '13px',
    outline: 'none',
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box',
    cursor: 'pointer',
  },
  textarea: {
    background: '#0B1120',
    border: '1px solid rgba(63,63,70,0.5)',
    borderRadius: '7px',
    padding: '9px 12px',
    color: '#E4E4E7',
    fontSize: '13px',
    outline: 'none',
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box',
    resize: 'vertical',
  },
  inputHint: { color: '#52525B', fontSize: '11px' },
  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
  },
  checkboxLabel: { color: '#A1A1AA', fontSize: '13px' },
  summaryRow: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
    padding: '10px 14px',
    background: 'rgba(17, 24, 39, 0.6)',
    borderRadius: '8px',
    border: '1px solid rgba(63,63,70,0.2)',
  },
  summaryItem: { color: '#71717A', fontSize: '13px' },
  deployBtn: {
    background: 'linear-gradient(135deg, #06B6D4 0%, #8B5CF6 100%)',
    border: 'none',
    borderRadius: '9px',
    color: '#fff',
    padding: '13px 20px',
    fontSize: '15px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box',
  },
  // Center states
  centerState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    padding: '40px 20px',
  },
  spinner: {
    width: '36px',
    height: '36px',
    border: '3px solid rgba(6,182,212,0.2)',
    borderTop: '3px solid #06B6D4',
    borderRadius: '50%',
  },
  deployingStatus: { color: '#A1A1AA', fontSize: '14px' },
  // Success state
  successContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
    padding: '24px',
    maxWidth: '520px',
    margin: '0 auto',
    width: '100%',
  },
  successIcon: {},
  successTitle: { color: '#10B981', fontSize: '20px', fontWeight: 700, margin: 0 },
  resultCards: { display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' },
  resultCard: {
    background: '#111827',
    border: '1px solid rgba(63,63,70,0.4)',
    borderRadius: '10px',
    padding: '14px 16px',
    textDecoration: 'none',
    display: 'block',
    color: 'inherit',
  },
  resultCardLabel: { color: '#71717A', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' },
  resultCardValue: { color: '#06B6D4', fontSize: '13px', wordBreak: 'break-all' },
  teamsNotif: {
    color: '#10B981',
    fontSize: '13px',
    background: 'rgba(16,185,129,0.08)',
    border: '1px solid rgba(16,185,129,0.2)',
    borderRadius: '8px',
    padding: '8px 14px',
    width: '100%',
    boxSizing: 'border-box',
    textAlign: 'center',
  },
  collabBox: {
    background: '#111827',
    border: '1px solid rgba(63,63,70,0.4)',
    borderRadius: '10px',
    padding: '14px 16px',
    width: '100%',
    boxSizing: 'border-box',
  },
  collabTitle: { color: '#A1A1AA', fontSize: '12px', fontWeight: 600, marginBottom: '6px' },
  collabText: { color: '#10B981', fontSize: '13px' },
  collabWarning: {
    color: '#F59E0B',
    fontSize: '12px',
    marginTop: '6px',
    lineHeight: '1.5',
  },
  doneBtn: {
    background: 'rgba(6,182,212,0.1)',
    border: '1px solid rgba(6,182,212,0.3)',
    borderRadius: '8px',
    color: '#06B6D4',
    padding: '10px 28px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  // Error state
  errorContainer: {
    background: 'rgba(239,68,68,0.08)',
    border: '1px solid rgba(239,68,68,0.25)',
    borderRadius: '12px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    alignItems: 'center',
  },
  errorTitle: { color: '#EF4444', fontSize: '16px', fontWeight: 600 },
  errorMsg: { color: '#A1A1AA', fontSize: '13px', textAlign: 'center', wordBreak: 'break-word' },
  errorActions: { display: 'flex', gap: '10px' },
  retryBtn: {
    background: 'rgba(6,182,212,0.1)',
    border: '1px solid rgba(6,182,212,0.3)',
    borderRadius: '7px',
    color: '#06B6D4',
    padding: '8px 18px',
    fontSize: '13px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  cancelBtn: {
    background: 'transparent',
    border: '1px solid rgba(63,63,70,0.4)',
    borderRadius: '7px',
    color: '#71717A',
    padding: '8px 18px',
    fontSize: '13px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
};
