// frontend/src/components/AutomationChat.jsx — Chat interface for describing automation needs
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SK } from '../services/sk-theme';
import { generateAutomation, listAutomationTemplates } from '../services/api';

const EXAMPLES = [
  { label: 'Reporting hebdomadaire', icon: '📊', prompt: 'Automatiser la création d\'un rapport hebdomadaire à partir de données Excel, avec envoi par email chaque lundi matin' },
  { label: 'Qualification leads', icon: '📧', prompt: 'Automatiser la qualification des leads entrants par email : extraction des infos, scoring, et routage vers le bon commercial' },
  { label: 'Onboarding client', icon: '📋', prompt: 'Automatiser le processus d\'onboarding d\'un nouveau client : création du dossier, envoi des documents, suivi des étapes' },
  { label: 'Sync CRM-Excel', icon: '🔄', prompt: 'Synchroniser automatiquement les données entre un CRM et un fichier Excel partagé, avec détection des doublons' },
  { label: 'Alerte Teams', icon: '🔔', prompt: 'Envoyer une alerte Teams automatique quand un fichier Excel de données est mis à jour avec de nouvelles entrées' },
  { label: 'Extraction factures', icon: '📄', prompt: 'Extraire automatiquement les données clés des factures (montant, date, fournisseur) et les consolider dans un Excel' },
];

export default function AutomationChat({ onGenerated, loading, setLoading, t }) {
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState('');
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await listAutomationTemplates();
      setTemplates(data.templates || []);
    } catch {
      // silently ignore — templates are optional
    }
    setTemplatesLoading(false);
  };

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

  const handleTemplateUse = (tpl) => {
    // Templates auto-submit since they represent complete workflows
    if (tpl.prompt) {
      setPrompt(tpl.prompt);
      handleGenerate(tpl.prompt);
    } else if (tpl.name) {
      setPrompt(tpl.name + (tpl.description ? ' — ' + tpl.description : ''));
      handleGenerate(tpl.name + (tpl.description ? ' — ' + tpl.description : ''));
    }
  };

  return (
    <div style={{
      maxWidth: 720,
      margin: '0 auto',
      padding: '48px 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ textAlign: 'center', marginBottom: 32 }}
      >
        <div style={{
          width: 52, height: 52, borderRadius: SK.radiusMd,
          background: 'linear-gradient(135deg, rgba(200, 0, 65, 0.08), rgba(109, 177, 199, 0.08))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26, margin: '0 auto 14px',
        }}>
          ⚙️
        </div>
        <h1 style={{
          fontSize: 24, fontWeight: 700, color: SK.textPrimary,
          margin: '0 0 6px', fontFamily: SK.fontFamily,
        }}>
          {t('automationTitle')}
        </h1>
        <p style={{
          fontSize: 14, color: SK.textSecondary, margin: 0, lineHeight: 1.5,
          maxWidth: 480,
        }}>
          {t('automationSubtitle')}
        </p>
      </motion.div>

      {/* Input area */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        style={{ width: '100%', maxWidth: 640 }}
      >
        <div style={{
          position: 'relative',
          background: SK.white,
          border: `1.5px solid ${SK.border}`,
          borderRadius: SK.radiusLg,
          boxShadow: SK.shadowMd,
          transition: 'border-color 0.2s',
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
              padding: '16px 16px 52px',
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
            onFocus={e => e.target.parentElement.style.borderColor = SK.cranberry}
            onBlur={e => e.target.parentElement.style.borderColor = SK.border}
          />
          <div style={{
            position: 'absolute',
            bottom: 10,
            right: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            {prompt.trim() && !loading && (
              <button
                onClick={() => setPrompt('')}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: SK.textMuted, fontSize: 16, padding: '4px 6px',
                  fontFamily: SK.fontFamily,
                }}
              >
                ×
              </button>
            )}
            <button
              onClick={() => handleGenerate()}
              disabled={!prompt.trim() || loading}
              style={{
                padding: '8px 20px',
                background: (!prompt.trim() || loading)
                  ? SK.border
                  : 'linear-gradient(135deg, #C80041, #9E1649)',
                color: SK.white,
                border: 'none',
                borderRadius: SK.radiusSm,
                fontSize: 13,
                fontWeight: 600,
                cursor: (!prompt.trim() || loading) ? 'not-allowed' : 'pointer',
                fontFamily: SK.fontFamily,
                transition: 'opacity 0.15s',
              }}
            >
              {loading ? t('automationGenerating') : t('automationGenerate')}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Loading indicator */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              marginTop: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              color: SK.textSecondary,
              fontSize: 13,
            }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              style={{
                width: 16, height: 16,
                border: `2px solid ${SK.border}`,
                borderTopColor: SK.cranberry,
                borderRadius: '50%',
              }}
            />
            {t('automationSearching')}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              marginTop: 14,
              padding: '10px 16px',
              background: 'rgba(228, 84, 68, 0.06)',
              border: `1px solid rgba(228, 84, 68, 0.2)`,
              borderRadius: SK.radiusSm,
              color: SK.signalRed,
              fontSize: 13,
              width: '100%',
              maxWidth: 640,
            }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Example prompts section */}
      {!loading && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          style={{ width: '100%', maxWidth: 640, marginTop: 28 }}
        >
          <div style={{
            fontSize: 12, fontWeight: 600, color: SK.textMuted,
            textTransform: 'uppercase', letterSpacing: '0.5px',
            marginBottom: 10,
          }}>
            {t('automationExamples')}
          </div>
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 8,
          }}>
            {EXAMPLES.map((ex, i) => (
              <motion.button
                key={i}
                onClick={() => setPrompt(ex.prompt)}
                whileHover={{ scale: 1.03, borderColor: 'rgba(200, 0, 65, 0.3)' }}
                whileTap={{ scale: 0.97 }}
                style={{
                  padding: '7px 14px',
                  background: SK.white,
                  border: `1px solid ${SK.border}`,
                  borderRadius: 20,
                  fontSize: 13,
                  color: SK.textSecondary,
                  cursor: 'pointer',
                  fontFamily: SK.fontFamily,
                  transition: 'border-color 0.15s, background 0.15s, color 0.15s',
                  boxShadow: SK.shadowSm,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <span style={{ fontSize: 14 }}>{ex.icon}</span>
                {ex.label}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Saved templates section */}
      {!loading && !templatesLoading && templates.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          style={{ width: '100%', maxWidth: 640, marginTop: 28 }}
        >
          <div style={{
            height: 1, background: SK.border, marginBottom: 24, opacity: 0.6,
          }} />
          <div style={{
            fontSize: 12, fontWeight: 600, color: SK.textMuted,
            textTransform: 'uppercase', letterSpacing: '0.5px',
            marginBottom: 12,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span>📁</span>
            {t('automationTemplates')}
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 10,
          }}>
            {templates.map((tpl, i) => (
              <motion.div
                key={tpl.id || i}
                whileHover={{ borderColor: 'rgba(200, 0, 65, 0.25)', boxShadow: SK.shadowMd }}
                style={{
                  background: SK.white,
                  border: `1px solid ${SK.border}`,
                  borderRadius: SK.radiusMd,
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  cursor: 'default',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 600, color: SK.textPrimary }}>
                  {tpl.name}
                </div>
                {tpl.description && (
                  <div style={{
                    fontSize: 12, color: SK.textMuted, lineHeight: 1.4,
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  }}>
                    {tpl.description}
                  </div>
                )}
                {tpl.tags?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {tpl.tags.slice(0, 3).map((tag, j) => (
                      <span key={j} style={{
                        fontSize: 10, padding: '2px 7px', borderRadius: 10,
                        background: 'rgba(109, 177, 199, 0.1)', color: SK.aqua,
                        fontWeight: 500,
                      }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => handleTemplateUse(tpl)}
                  disabled={loading}
                  style={{
                    marginTop: 'auto',
                    padding: '6px 12px',
                    background: 'transparent',
                    border: `1px solid ${SK.cranberry}`,
                    borderRadius: SK.radiusSm,
                    fontSize: 12,
                    fontWeight: 600,
                    color: SK.cranberry,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontFamily: SK.fontFamily,
                    transition: 'background 0.15s, color 0.15s',
                    alignSelf: 'flex-start',
                  }}
                  onMouseEnter={e => { e.target.style.background = SK.cranberry; e.target.style.color = SK.white; }}
                  onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = SK.cranberry; }}
                >
                  {t('automationTemplateUse')}
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
