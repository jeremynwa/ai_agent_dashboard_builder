// ClarificationChat — 2-3 AI-generated questions before generation
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SK } from '../services/sk-theme';

export default function ClarificationChat({ questions, originalPrompt, onComplete, onSkip, t }) {
  const [answers, setAnswers] = useState([]);
  const [currentInput, setCurrentInput] = useState('');
  const inputRef = useRef(null);
  const currentIndex = answers.length;
  const isComplete = currentIndex >= questions.length;

  useEffect(() => {
    if (!isComplete && inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentIndex, isComplete]);

  useEffect(() => {
    if (isComplete && questions.length > 0) {
      const enriched = buildEnrichedPrompt(originalPrompt, questions, answers);
      onComplete(enriched);
    }
  }, [isComplete]);

  const handleSubmitAnswer = () => {
    const trimmed = currentInput.trim();
    if (!trimmed) return;
    setAnswers(prev => [...prev, trimmed]);
    setCurrentInput('');
  };

  return (
    <motion.div
      style={styles.container}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <div style={styles.header}>
        <div style={styles.headerIcon}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={SK.aqua} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <span style={styles.headerText}>{t('clarifyTitle')}</span>
      </div>

      <div style={styles.promptPreview}>
        <span style={styles.promptLabel}>{t('clarifyYourPrompt')}</span>
        <span style={styles.promptText}>{originalPrompt.length > 120 ? originalPrompt.slice(0, 120) + '...' : originalPrompt}</span>
      </div>

      <div style={styles.questionsArea}>
        <AnimatePresence mode="popLayout">
          {questions.map((q, i) => (
            <motion.div
              key={i}
              style={styles.questionBlock}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.15 }}
            >
              <div style={styles.questionRow}>
                <span style={styles.questionNumber}>{i + 1}</span>
                <span style={styles.questionText}>{q}</span>
              </div>
              {i < currentIndex && (
                <motion.div
                  style={styles.answerRow}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.2 }}
                >
                  <span style={styles.answerText}>{answers[i]}</span>
                </motion.div>
              )}
              {i === currentIndex && !isComplete && (
                <motion.div
                  style={styles.inputRow}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.25, delay: 0.1 }}
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSubmitAnswer();
                      }
                    }}
                    placeholder={t('clarifyPlaceholder')}
                    style={styles.input}
                  />
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={!currentInput.trim()}
                    style={{
                      ...styles.submitButton,
                      opacity: currentInput.trim() ? 1 : 0.4,
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </button>
                </motion.div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <button onClick={onSkip} style={styles.skipButton}>
        {t('clarifySkip')}
      </button>
    </motion.div>
  );
}

function buildEnrichedPrompt(original, questions, answers) {
  const context = questions
    .map((q, i) => `- Q: ${q}\n  A: ${answers[i] || '(skipped)'}`)
    .join('\n');
  return `${original}\n\nAdditional context from user:\n${context}`;
}

const styles = {
  container: {
    background: SK.bgPrimary,
    borderRadius: '12px',
    padding: '24px',
    border: `1px solid ${SK.border}`,
    maxWidth: '520px',
    width: '100%',
    boxShadow: SK.shadowMd,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '16px',
  },
  headerIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: 'rgba(109, 177, 199, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    fontSize: '16px',
    fontWeight: '600',
    color: SK.textPrimary,
    letterSpacing: '-0.01em',
  },
  promptPreview: {
    background: SK.bgSecondary,
    borderRadius: '8px',
    padding: '10px 14px',
    marginBottom: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  promptLabel: {
    fontSize: '10px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: SK.textMuted,
  },
  promptText: {
    fontSize: '13px',
    color: SK.textSecondary,
    lineHeight: '1.5',
  },
  questionsArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    marginBottom: '20px',
  },
  questionBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  questionRow: {
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-start',
  },
  questionNumber: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    background: 'rgba(200, 0, 65, 0.1)',
    color: SK.ruby,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: '700',
    flexShrink: 0,
    marginTop: '1px',
  },
  questionText: {
    fontSize: '14px',
    color: SK.textPrimary,
    lineHeight: '1.5',
  },
  answerRow: {
    marginLeft: '32px',
    overflow: 'hidden',
  },
  answerText: {
    fontSize: '13px',
    color: SK.aqua,
    background: 'rgba(109, 177, 199, 0.08)',
    padding: '6px 10px',
    borderRadius: '6px',
    display: 'inline-block',
  },
  inputRow: {
    marginLeft: '32px',
    display: 'flex',
    gap: '8px',
  },
  input: {
    flex: 1,
    background: SK.bgSecondary,
    border: `1px solid ${SK.border}`,
    borderRadius: '6px',
    padding: '8px 12px',
    color: SK.textPrimary,
    fontSize: '13px',
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  submitButton: {
    background: SK.ruby,
    color: SK.textInverse,
    border: 'none',
    borderRadius: '6px',
    padding: '8px 12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity 0.15s',
  },
  skipButton: {
    background: 'none',
    border: `1px dashed ${SK.border}`,
    borderRadius: '6px',
    color: SK.textSecondary,
    fontSize: '13px',
    cursor: 'pointer',
    padding: '8px 14px',
    fontFamily: 'inherit',
    width: '100%',
    textAlign: 'center',
    transition: 'all 0.15s',
  },
};
