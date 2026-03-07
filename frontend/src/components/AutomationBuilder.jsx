// frontend/src/components/AutomationBuilder.jsx — Visual workflow editor
import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SK } from '../services/sk-theme';
import { saveAutomationTemplate } from '../services/api';
import AutomationStep, { NODE_WIDTH, NODE_HEIGHT, PORT_SIZE } from './AutomationStep';

const STEP_TYPES = ['trigger', 'action', 'condition', 'output'];
const H_GAP = 300;
const V_GAP = 140;
const CANVAS_PADDING = 60;

// ============ AUTO-LAYOUT (topological BFS) ============
function computeLayout(steps, connections) {
  if (!steps.length) return {};

  // Build adjacency
  const inDeg = {};
  const adj = {};
  steps.forEach(s => { inDeg[s.id] = 0; adj[s.id] = []; });
  connections.forEach(c => {
    if (adj[c.from]) adj[c.from].push(c.to);
    if (inDeg[c.to] !== undefined) inDeg[c.to]++;
  });

  // BFS by depth
  const depths = {};
  const queue = steps.filter(s => inDeg[s.id] === 0).map(s => s.id);
  queue.forEach(id => { depths[id] = 0; });

  let i = 0;
  while (i < queue.length) {
    const cur = queue[i++];
    for (const next of (adj[cur] || [])) {
      depths[next] = Math.max(depths[next] || 0, depths[cur] + 1);
      inDeg[next]--;
      if (inDeg[next] === 0) queue.push(next);
    }
  }

  // Assign any unvisited nodes
  steps.forEach(s => {
    if (depths[s.id] === undefined) depths[s.id] = 0;
  });

  // Group by depth
  const levels = {};
  steps.forEach(s => {
    const d = depths[s.id];
    if (!levels[d]) levels[d] = [];
    levels[d].push(s.id);
  });

  // Position
  const positions = {};
  Object.entries(levels).forEach(([depth, ids]) => {
    const d = Number(depth);
    const totalHeight = ids.length * (NODE_HEIGHT + V_GAP) - V_GAP;
    ids.forEach((id, idx) => {
      positions[id] = {
        x: CANVAS_PADDING + d * H_GAP,
        y: CANVAS_PADDING + idx * (NODE_HEIGHT + V_GAP) + (ids.length === 1 ? 80 : 0),
      };
    });
  });

  return positions;
}

// ============ SVG CONNECTION ============
function ConnectionLine({ fromPos, toPos, color }) {
  const x1 = fromPos.x + NODE_WIDTH + PORT_SIZE / 2;
  const y1 = fromPos.y + NODE_HEIGHT / 2;
  const x2 = toPos.x - PORT_SIZE / 2;
  const y2 = toPos.y + NODE_HEIGHT / 2;
  const cx = Math.abs(x2 - x1) * 0.4;

  return (
    <path
      d={`M ${x1} ${y1} C ${x1 + cx} ${y1}, ${x2 - cx} ${y2}, ${x2} ${y2}`}
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeDasharray="none"
      opacity={0.5}
    />
  );
}

// ============ SAVE MODAL ============
function SaveModal({ onSave, onClose, t }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      });
      onClose();
    } catch (e) {
      console.error('Save failed:', e);
      setSaving(false);
    }
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
          width: 420, maxWidth: '90vw', boxShadow: SK.shadowXl,
        }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 16px', color: SK.textPrimary, fontSize: 18 }}>
          {t('automationSaveTemplate')}
        </h3>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={t('automationTemplateName')}
          style={inputStyle}
          autoFocus
        />
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder={t('automationTemplateDesc')}
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', marginTop: 10 }}
        />
        <input
          value={tags}
          onChange={e => setTags(e.target.value)}
          placeholder={t('automationTemplateTags')}
          style={{ ...inputStyle, marginTop: 10 }}
        />
        <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={btnSecondary}>{t('back')}</button>
          <button onClick={handleSave} disabled={!name.trim() || saving} style={{
            ...btnPrimary,
            opacity: (!name.trim() || saving) ? 0.5 : 1,
          }}>
            {saving ? '...' : t('automationSave')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ============ DETAIL PANEL ============
function DetailPanel({ step, onUpdate, onDelete, t }) {
  if (!step) return null;

  const update = (field, value) => onUpdate(step.id, { ...step, [field]: value });

  return (
    <motion.div
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 20, opacity: 0 }}
      style={{
        width: 300, background: SK.white, borderLeft: `1px solid ${SK.border}`,
        padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14,
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 600, color: SK.textPrimary }}>
        {t('automationStepDetail')}
      </div>

      <label style={labelStyle}>
        {t('automationStepLabel')}
        <input
          value={step.label}
          onChange={e => update('label', e.target.value)}
          style={inputStyle}
        />
      </label>

      <label style={labelStyle}>
        Type
        <select
          value={step.type}
          onChange={e => update('type', e.target.value)}
          style={inputStyle}
        >
          {STEP_TYPES.map(t => (
            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>
      </label>

      <label style={labelStyle}>
        Description
        <textarea
          value={step.description}
          onChange={e => update('description', e.target.value)}
          rows={3}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </label>

      <label style={labelStyle}>
        Code
        <textarea
          value={step.code || ''}
          onChange={e => update('code', e.target.value)}
          rows={8}
          style={{
            ...inputStyle,
            fontFamily: 'monospace',
            fontSize: 12,
            resize: 'vertical',
            lineHeight: 1.5,
          }}
        />
      </label>

      <button onClick={() => onDelete(step.id)} style={{
        ...btnSecondary,
        color: SK.signalRed,
        borderColor: SK.signalRed,
        marginTop: 'auto',
      }}>
        {t('automationDeleteStep')}
      </button>
    </motion.div>
  );
}

// ============ MAIN BUILDER ============
export default function AutomationBuilder({ data, setData, onBack, t }) {
  const [selectedId, setSelectedId] = useState(null);
  const [showSaveModal, setShowSaveModal] = useState(false);

  const { steps, connections } = data;
  const positions = useMemo(() => computeLayout(steps, connections), [steps, connections]);

  const selectedStep = steps.find(s => s.id === selectedId);

  // Canvas dimensions
  const canvasSize = useMemo(() => {
    const allPos = Object.values(positions);
    if (!allPos.length) return { width: 800, height: 400 };
    const maxX = Math.max(...allPos.map(p => p.x)) + NODE_WIDTH + CANVAS_PADDING * 2;
    const maxY = Math.max(...allPos.map(p => p.y)) + NODE_HEIGHT + CANVAS_PADDING * 2;
    return { width: Math.max(800, maxX), height: Math.max(400, maxY) };
  }, [positions]);

  const updateStep = useCallback((id, updated) => {
    setData(prev => ({
      ...prev,
      steps: prev.steps.map(s => s.id === id ? updated : s),
    }));
  }, [setData]);

  const deleteStep = useCallback((id) => {
    setData(prev => ({
      ...prev,
      steps: prev.steps.filter(s => s.id !== id),
      connections: prev.connections.filter(c => c.from !== id && c.to !== id),
    }));
    setSelectedId(null);
  }, [setData]);

  const addStep = useCallback(() => {
    const newId = `step-${Date.now()}`;
    const newStep = {
      id: newId,
      type: 'action',
      label: t('automationNewStep'),
      description: '',
      code: '',
      dependsOn: [],
    };

    setData(prev => {
      const newSteps = [...prev.steps, newStep];
      const newConns = [...prev.connections];

      // Connect to last non-output step
      if (prev.steps.length > 0) {
        const lastStep = prev.steps[prev.steps.length - 1];
        newConns.push({ from: lastStep.id, to: newId });
        newStep.dependsOn = [lastStep.id];
      }

      return { ...prev, steps: newSteps, connections: newConns };
    });
    setSelectedId(newId);
  }, [setData, t]);

  const handleSave = async (meta) => {
    await saveAutomationTemplate({
      ...meta,
      steps: data.steps,
      connections: data.connections,
      metadata: data.metadata || {},
    });
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: SK.bgSecondary,
    }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 20px',
        background: SK.white,
        borderBottom: `1px solid ${SK.border}`,
      }}>
        <button onClick={onBack} style={btnSecondary}>← {t('back')}</button>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 18, color: SK.textPrimary }}>{data.name}</h2>
          {data.description && (
            <p style={{ margin: '2px 0 0', fontSize: 12, color: SK.textSecondary }}>{data.description}</p>
          )}
        </div>
        <button onClick={addStep} style={btnSecondary}>+ {t('automationAddStep')}</button>
        <button onClick={() => setShowSaveModal(true)} style={btnPrimary}>
          {t('automationSaveTemplate')}
        </button>
      </div>

      {/* Main area */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Canvas */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            position: 'relative',
          }}
          onClick={() => setSelectedId(null)}
        >
          {/* SVG connections layer */}
          <svg
            width={canvasSize.width}
            height={canvasSize.height}
            style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
          >
            {connections.map((conn, i) => {
              const from = positions[conn.from];
              const to = positions[conn.to];
              if (!from || !to) return null;
              return <ConnectionLine key={i} fromPos={from} toPos={to} color={SK.iceBlue} />;
            })}
          </svg>

          {/* Nodes layer */}
          <div style={{ width: canvasSize.width, height: canvasSize.height, position: 'relative' }}>
            {steps.map(step => {
              const pos = positions[step.id];
              if (!pos) return null;
              return (
                <AutomationStep
                  key={step.id}
                  step={step}
                  isSelected={step.id === selectedId}
                  onSelect={setSelectedId}
                  position={pos}
                />
              );
            })}
          </div>

          {/* Empty state */}
          {steps.length === 0 && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: SK.textMuted, fontSize: 15,
            }}>
              {t('automationEmpty')}
            </div>
          )}
        </div>

        {/* Detail panel */}
        <AnimatePresence>
          {selectedStep && (
            <DetailPanel
              key={selectedStep.id}
              step={selectedStep}
              onUpdate={updateStep}
              onDelete={deleteStep}
              t={t}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Metadata footer */}
      {data.metadata && (
        <div style={{
          padding: '8px 20px',
          background: SK.white,
          borderTop: `1px solid ${SK.border}`,
          display: 'flex',
          gap: 20,
          fontSize: 12,
          color: SK.textSecondary,
        }}>
          {data.metadata.estimatedDuration && <span>{data.metadata.estimatedDuration}</span>}
          {data.metadata.complexity && <span>Complexity: {data.metadata.complexity}</span>}
          {data.metadata.requiredIntegrations?.length > 0 && (
            <span>Integrations: {data.metadata.requiredIntegrations.join(', ')}</span>
          )}
          {data.matchedTemplateId && (
            <span style={{ color: SK.signalGreen }}>Based on existing template</span>
          )}
        </div>
      )}

      {/* Save modal */}
      {showSaveModal && (
        <SaveModal onSave={handleSave} onClose={() => setShowSaveModal(false)} t={t} />
      )}
    </div>
  );
}

// ============ SHARED STYLES ============
const inputStyle = {
  width: '100%',
  padding: '8px 10px',
  border: `1px solid ${SK.border}`,
  borderRadius: SK.radiusSm,
  fontSize: 13,
  color: SK.textPrimary,
  background: SK.white,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: SK.fontFamily,
};

const labelStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  fontSize: 12,
  fontWeight: 500,
  color: SK.textSecondary,
};

const btnPrimary = {
  padding: '8px 16px',
  background: SK.ruby,
  color: SK.white,
  border: 'none',
  borderRadius: SK.radiusSm,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: SK.fontFamily,
};

const btnSecondary = {
  padding: '8px 16px',
  background: 'transparent',
  color: SK.textPrimary,
  border: `1px solid ${SK.border}`,
  borderRadius: SK.radiusSm,
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: SK.fontFamily,
};
