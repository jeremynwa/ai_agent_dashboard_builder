// frontend/src/components/IntegrationSettings.jsx — Per-user integration credentials manager
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SK } from '../services/sk-theme';
import { getUserSecrets, saveUserSecret, deleteUserSecret } from '../services/api';

export default function IntegrationSettings({ onClose, t }) {
  const [integrations, setIntegrations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editFields, setEditFields] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Load integrations on mount
  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    setLoading(true);
    try {
      const data = await getUserSecrets();
      setIntegrations(data.integrations || {});
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const startEdit = (id, integration) => {
    setEditingId(id);
    setEditFields(integration.configured ? { ...integration.fields } : {});
    setError(null);
    setSuccess(null);
  };

  const handleSave = async (id) => {
    setSaving(true);
    setError(null);
    try {
      await saveUserSecret(id, editFields);
      setSuccess(`${integrations[id].displayName} configur\u00e9 avec succ\u00e8s`);
      setEditingId(null);
      await loadIntegrations();
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    setSaving(true);
    setError(null);
    try {
      await deleteUserSecret(id);
      setSuccess(`${integrations[id].displayName} d\u00e9connect\u00e9`);
      setEditingId(null);
      await loadIntegrations();
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(50, 63, 72, 0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          background: SK.white, borderRadius: SK.radiusLg, padding: 28,
          width: 520, maxWidth: '90vw', maxHeight: '80vh', overflowY: 'auto',
          boxShadow: SK.shadowXl,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, color: SK.textPrimary, fontSize: 18 }}>
            Mes int\u00e9grations
          </h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: SK.textMuted, fontSize: 20,
          }}>\u00d7</button>
        </div>

        <p style={{ margin: '0 0 16px', fontSize: 12, color: SK.textSecondary, lineHeight: 1.5 }}>
          Configurez vos propres identifiants pour chaque service.
          Vos credentials sont chiffr\u00e9s (KMS) et stock\u00e9s s\u00e9par\u00e9ment.
          Ils sont prioritaires sur la configuration par d\u00e9faut de l'organisation.
        </p>

        {/* Status messages */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ padding: '8px 12px', borderRadius: SK.radiusSm, background: 'rgba(228,84,68,0.08)',
                color: SK.signalRed, fontSize: 12, marginBottom: 12 }}>
              {error}
            </motion.div>
          )}
          {success && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ padding: '8px 12px', borderRadius: SK.radiusSm, background: 'rgba(47,167,77,0.08)',
                color: SK.signalGreen, fontSize: 12, marginBottom: 12 }}>
              {success}
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: SK.textMuted }}>Chargement...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Object.entries(integrations || {}).map(([id, integration]) => (
              <div key={id} style={{
                border: `1px solid ${integration.configured ? SK.signalGreen + '40' : SK.border}`,
                borderRadius: SK.radiusMd,
                overflow: 'hidden',
              }}>
                {/* Header */}
                <div
                  onClick={() => editingId === id ? setEditingId(null) : startEdit(id, integration)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 14px', cursor: 'pointer',
                    background: integration.configured ? 'rgba(47,167,77,0.03)' : 'transparent',
                  }}
                >
                  <span style={{ fontSize: 20 }}>{integration.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: SK.textPrimary }}>
                      {integration.displayName}
                    </div>
                    <div style={{ fontSize: 11, color: SK.textMuted }}>
                      {integration.configured ? 'Configur\u00e9' : 'Non configur\u00e9'}
                    </div>
                  </div>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: integration.configured ? SK.signalGreen : SK.border,
                  }} />
                </div>

                {/* Edit form */}
                <AnimatePresence>
                  {editingId === id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{
                        padding: '0 14px 14px',
                        borderTop: `1px solid ${SK.border}`,
                        display: 'flex', flexDirection: 'column', gap: 8,
                        paddingTop: 12,
                      }}>
                        {integration.fields && Object.keys(FIELD_DEFS[id] || {}).length > 0
                          ? FIELD_DEFS[id].map(field => (
                            <label key={field.key} style={{
                              display: 'flex', flexDirection: 'column', gap: 3,
                              fontSize: 12, color: SK.textSecondary,
                            }}>
                              {field.label}
                              <input
                                type={field.secret ? 'password' : 'text'}
                                value={editFields[field.key] || ''}
                                onChange={e => setEditFields(prev => ({ ...prev, [field.key]: e.target.value }))}
                                placeholder={field.placeholder}
                                style={{
                                  padding: '6px 8px', border: `1px solid ${SK.border}`,
                                  borderRadius: SK.radiusSm, fontSize: 13, color: SK.textPrimary,
                                  background: SK.white, outline: 'none', fontFamily: SK.fontFamily,
                                }}
                              />
                            </label>
                          ))
                          : null
                        }

                        <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
                          {integration.configured && (
                            <button
                              onClick={() => handleDelete(id)}
                              disabled={saving}
                              style={{
                                padding: '6px 12px', border: `1px solid ${SK.signalRed}`,
                                borderRadius: SK.radiusSm, background: 'transparent',
                                color: SK.signalRed, fontSize: 12, cursor: 'pointer',
                                fontFamily: SK.fontFamily, opacity: saving ? 0.5 : 1,
                              }}
                            >
                              D\u00e9connecter
                            </button>
                          )}
                          <button
                            onClick={() => handleSave(id)}
                            disabled={saving}
                            style={{
                              padding: '6px 14px', border: 'none',
                              borderRadius: SK.radiusSm, background: SK.ruby,
                              color: SK.white, fontSize: 12, fontWeight: 600,
                              cursor: 'pointer', fontFamily: SK.fontFamily,
                              opacity: saving ? 0.5 : 1,
                            }}
                          >
                            {saving ? '...' : 'Enregistrer'}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

// Field definitions matching the backend INTEGRATION_DEFS
const FIELD_DEFS = {
  smtp: [
    { key: 'SMTP_HOST', label: 'Serveur SMTP', placeholder: 'smtp.office365.com', secret: false },
    { key: 'SMTP_PORT', label: 'Port', placeholder: '587', secret: false },
    { key: 'SMTP_USER', label: 'Utilisateur', placeholder: 'user@company.com', secret: false },
    { key: 'SMTP_PASS', label: 'Mot de passe', placeholder: '', secret: true },
    { key: 'SMTP_FROM', label: 'Exp\u00e9diteur (From)', placeholder: 'App Factory <noreply@company.com>', secret: false },
  ],
  teams: [
    { key: 'TEAMS_WEBHOOK_URL', label: 'Webhook URL', placeholder: 'https://outlook.office.com/webhook/...', secret: true },
  ],
  sql: [
    { key: 'SQL_HOST', label: 'H\u00f4te', placeholder: 'db.company.com', secret: false },
    { key: 'SQL_PORT', label: 'Port', placeholder: '5432', secret: false },
    { key: 'SQL_DATABASE', label: 'Base de donn\u00e9es', placeholder: 'mydb', secret: false },
    { key: 'SQL_USER', label: 'Utilisateur', placeholder: 'readonly', secret: false },
    { key: 'SQL_PASS', label: 'Mot de passe', placeholder: '', secret: true },
  ],
};
