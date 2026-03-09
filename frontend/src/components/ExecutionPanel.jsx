// frontend/src/components/ExecutionPanel.jsx — Automation execution progress & results
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SK } from '../services/sk-theme';
import { getExecutionStatus, getExecutionResults } from '../services/api';

const STATUS_STYLES = {
  pending: { color: SK.textMuted, icon: '○', label: 'En attente' },
  running: { color: SK.aqua, icon: '◉', label: 'En cours...' },
  success: { color: SK.signalGreen, icon: '✓', label: 'Terminé' },
  error: { color: SK.signalRed, icon: '✗', label: 'Erreur' },
};

export default function ExecutionPanel({ jobId, onClose, onStepStatus, t }) {
  const [status, setStatus] = useState('starting');
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(null);
  const [stepsExecuted, setStepsExecuted] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);

  // Poll execution status
  useEffect(() => {
    if (!jobId) return;

    const poll = async () => {
      try {
        const data = await getExecutionStatus(jobId);
        setStatus(data.status);
        setProgress(data.progress || 0);
        setCurrentStep(data.currentStep);
        setStepsExecuted(data.stepsExecuted || 0);
        setTotalSteps(data.totalSteps || 0);

        // Notify parent about step status for node coloring
        if (onStepStatus && data.currentStep) {
          onStepStatus(data.currentStep, 'running');
        }

        if (data.status === 'completed' || data.status === 'error') {
          clearInterval(pollRef.current);
          if (data.status === 'completed') {
            const resultData = await getExecutionResults(jobId);
            setResults(resultData);
          } else {
            setError(data.error || 'Execution failed');
          }
        }
      } catch (err) {
        console.error('Poll error:', err);
      }
    };

    poll(); // Initial check
    pollRef.current = setInterval(poll, 3000);

    return () => clearInterval(pollRef.current);
  }, [jobId, onStepStatus]);

  const isFinished = status === 'completed' || status === 'error';
  const statusStyle = STATUS_STYLES[status] || STATUS_STYLES.pending;

  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 50, opacity: 0 }}
      style={{
        background: SK.white,
        borderTop: `2px solid ${statusStyle.color}`,
        padding: '16px 20px',
        maxHeight: 320,
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>{statusStyle.icon}</span>
          <span style={{
            fontSize: 14, fontWeight: 600,
            color: statusStyle.color,
          }}>
            {statusStyle.label}
          </span>
          {currentStep && status === 'running' && (
            <span style={{ fontSize: 12, color: SK.textSecondary }}>
              — {currentStep}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: SK.textSecondary }}>
            {stepsExecuted}/{totalSteps} {t?.('automationSteps') || 'steps'}
          </span>
          {isFinished && (
            <button onClick={onClose} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: SK.textMuted, fontSize: 16,
            }}>×</button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {!isFinished && (
        <div style={{
          height: 4, borderRadius: 2,
          background: SK.bgSecondary,
          marginBottom: 14, overflow: 'hidden',
        }}>
          <motion.div
            animate={{ width: `${Math.round(progress * 100)}%` }}
            transition={{ duration: 0.5 }}
            style={{
              height: '100%', borderRadius: 2,
              background: `linear-gradient(90deg, ${SK.aqua}, ${SK.signalGreen})`,
            }}
          />
        </div>
      )}

      {/* Running animation */}
      {status === 'running' && !isFinished && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px', borderRadius: SK.radiusSm,
          background: 'rgba(109, 177, 199, 0.08)',
          fontSize: 12, color: SK.textSecondary,
        }}>
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            style={{ display: 'inline-block' }}
          >
            ⚙️
          </motion.span>
          Exécution en cours...
        </div>
      )}

      {/* Results */}
      {results && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Summary */}
          {results.summary && (
            <div style={{
              padding: '10px 14px', borderRadius: SK.radiusSm,
              background: 'rgba(47, 167, 77, 0.06)',
              border: `1px solid rgba(47, 167, 77, 0.15)`,
              fontSize: 13, color: SK.textPrimary,
              lineHeight: 1.5, whiteSpace: 'pre-wrap',
            }}>
              {results.summary}
            </div>
          )}

          {/* Execution log */}
          {results.log?.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: SK.textSecondary, marginBottom: 6 }}>
                Log d'exécution
              </div>
              <div style={{
                display: 'flex', flexDirection: 'column', gap: 4,
                maxHeight: 150, overflowY: 'auto',
              }}>
                {results.log.map((entry, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '4px 8px', borderRadius: 4,
                    background: entry.status === 'error' ? 'rgba(228, 84, 68, 0.06)' : 'rgba(0,0,0,0.02)',
                    fontSize: 11, fontFamily: 'monospace',
                  }}>
                    <span style={{ color: entry.status === 'success' ? SK.signalGreen : SK.signalRed }}>
                      {entry.status === 'success' ? '✓' : '✗'}
                    </span>
                    <span style={{ color: SK.aqua, fontWeight: 600 }}>{entry.tool}</span>
                    <span style={{ color: SK.textMuted, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.error || 'OK'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cost info */}
          {results.cost != null && (
            <div style={{ fontSize: 11, color: SK.textMuted, textAlign: 'right' }}>
              Coût estimé : ~${results.cost.toFixed(2)} | Tokens : {results.tokens?.input?.toLocaleString()} in / {results.tokens?.output?.toLocaleString()} out
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          padding: '10px 14px', borderRadius: SK.radiusSm,
          background: 'rgba(228, 84, 68, 0.06)',
          border: `1px solid rgba(228, 84, 68, 0.15)`,
          fontSize: 13, color: SK.signalRed,
        }}>
          {error}
        </div>
      )}
    </motion.div>
  );
}
