// frontend/src/components/AutomationChat.jsx — Chat interface for describing automation needs
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { SK } from '../services/sk-theme';
import { generateAutomation } from '../services/api';

const SUGGESTIONS = [
  { label: '📊 Reporting hebdomadaire', prompt: 'Automatiser la création d\'un rapport hebdomadaire à partir de données Excel, avec envoi par email chaque lundi matin' },
  { label: '📧 Qualification leads', prompt: 'Automatiser la qualification des leads entrants par email : extraction des infos, scoring, et routage vers le bon commercial' },
  { label: '📋 Onboarding client', prompt: 'Automatiser le processus d\'onboarding d\'un nouveau client : création du dossier, envoi des documents, suivi des étapes' },
  { label: '🔄 Sync CRM-Excel', prompt: 'Synchroniser automatiquement les données entre un CRM et un fichier Excel partagé, avec détection des doublons' },
];

export default function AutomationChat({ onGenerated, loading, setLoading, t }) {
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState('');

  const handleGenerate = async (text) => {
    const input = text || prompt;
    if (!input.trim() || loading) return;

    setError('');
    setLoading(true);

    try {
      const result = await generateAutomation(input.trim());
      if (result.automation) {
        onGenerated({
          ...result.automation,
          matchedTemplateId: result.matchedTemplateId,
        });
      } else {
        setError(t('automationGenerateError'));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  return (
    <div style={{
      maxWidth: 680,
      margin: '0 auto',
      padding: '60px 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ textAlign: 'center', marginBottom: 36 }}
      >
        <div style={{
          width: 56, height: 56, borderRadius: SK.radiusMd,
          background: 'rgba(158, 22, 73, 0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, margin: '0 auto 16px',
        }}>
          ⚙️
        </div>
        <h1 style={{
          fontSize: 26, fontWeight: 700, color: SK.textPrimary,
          margin: '0 0 8px', fontFamily: SK.fontFamily,
        }}>
          {t('automationTitle')}
        </h1>
        <p style={{
          fontSize: 15, color: SK.textSecondary, margin: 0, lineHeight: 1.5,
        }}>
          {t('automationSubtitle')}
        </p>
      </motion.div>

      {/* Suggestion chips */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        style={{
          display: 'flex', flexWrap: 'wrap', gap: 8,
          justifyContent: 'center', marginBottom: 28,
        }}
      >
        {SUGGESTIONS.map((s, i) => (
          <button
            key={i}
            onClick={() => { setPrompt(s.prompt); handleGenerate(s.prompt); }}
            disabled={loading}
            style={{
              padding: '8px 14px',
              background: SK.white,
              border: `1px solid ${SK.border}`,
              borderRadius: 20,
              fontSize: 13,
              color: SK.textPrimary,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: SK.fontFamily,
              transition: 'border-color 0.15s, background 0.15s',
            }}
            onMouseEnter={e => { e.target.style.borderColor = SK.cranberry; e.target.style.background = 'rgba(158, 22, 73, 0.04)'; }}
            onMouseLeave={e => { e.target.style.borderColor = SK.border; e.target.style.background = SK.white; }}
          >
            {s.label}
          </button>
        ))}
      </motion.div>

      {/* Input area */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        style={{ width: '100%' }}
      >
        <div style={{
          position: 'relative',
          background: SK.white,
          border: `1px solid ${SK.border}`,
          borderRadius: SK.radiusLg,
          boxShadow: SK.shadowMd,
          overflow: 'hidden',
        }}>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('automationPromptPlaceholder')}
            disabled={loading}
            rows={4}
            style={{
              width: '100%',
              padding: '16px 16px 50px',
              border: 'none',
              outline: 'none',
              resize: 'none',
              fontSize: 14,
              lineHeight: 1.6,
              color: SK.textPrimary,
              fontFamily: SK.fontFamily,
              boxSizing: 'border-box',
              background: 'transparent',
            }}
          />
          <div style={{
            position: 'absolute',
            bottom: 10,
            right: 12,
          }}>
            <button
              onClick={() => handleGenerate()}
              disabled={!prompt.trim() || loading}
              style={{
                padding: '8px 20px',
                background: (!prompt.trim() || loading) ? SK.border : SK.cranberry,
                color: SK.white,
                border: 'none',
                borderRadius: SK.radiusSm,
                fontSize: 13,
                fontWeight: 600,
                cursor: (!prompt.trim() || loading) ? 'not-allowed' : 'pointer',
                fontFamily: SK.fontFamily,
                transition: 'background 0.15s',
              }}
            >
              {loading ? t('automationGenerating') : t('automationGenerate')}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Loading indicator */}
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            marginTop: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: SK.textSecondary,
            fontSize: 14,
          }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            style={{
              width: 18, height: 18,
              border: `2px solid ${SK.border}`,
              borderTopColor: SK.cranberry,
              borderRadius: '50%',
            }}
          />
          {t('automationSearching')}
        </motion.div>
      )}

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            marginTop: 16,
            padding: '10px 16px',
            background: 'rgba(228, 84, 68, 0.08)',
            border: `1px solid rgba(228, 84, 68, 0.25)`,
            borderRadius: SK.radiusSm,
            color: SK.signalRed,
            fontSize: 13,
            width: '100%',
          }}
        >
          {error}
        </motion.div>
      )}
    </div>
  );
}
