// frontend/src/components/AutomationBuilder.jsx — Visual workflow editor
import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SK } from '../services/sk-theme';
import { saveAutomationTemplate, startAutomationExecution, generateAutomation } from '../services/api';
import AutomationStep, { NODE_WIDTH, NODE_HEIGHT, LABEL_HEIGHT, PORT_SIZE } from './AutomationStep';
import ExecutionPanel from './ExecutionPanel';
import IntegrationSettings from './IntegrationSettings';

const STEP_TYPES = [
  { value: 'trigger', label: 'Déclencheur' },
  { value: 'action', label: 'Action' },
  { value: 'condition', label: 'Condition' },
  { value: 'output', label: 'Sortie' },
];
const H_GAP = 50;           // horizontal gap between depth columns
const V_GAP = 40;           // vertical gap between siblings at same depth
const CANVAS_PADDING = 30;  // padding around canvas

// ============ AUTO-LAYOUT (left-to-right, BFS) ============
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

  // Horizontal layout: depth = column (x), siblings = rows (y centered)
  const SLOT_W = NODE_WIDTH + H_GAP;
  const SLOT_H = NODE_HEIGHT + LABEL_HEIGHT + V_GAP;
  const positions = {};

  // Find tallest column to center everything vertically
  const maxRows = Math.max(...Object.values(levels).map(ids => ids.length));
  const totalHeight = maxRows * SLOT_H - V_GAP;

  Object.entries(levels).forEach(([depth, ids]) => {
    const d = Number(depth);
    const colHeight = ids.length * SLOT_H - V_GAP;
    const offsetY = (totalHeight - colHeight) / 2; // center this column
    ids.forEach((id, idx) => {
      positions[id] = {
        x: CANVAS_PADDING + d * SLOT_W,
        y: CANVAS_PADDING + offsetY + idx * SLOT_H,
      };
    });
  });

  return positions;
}

// ============ SVG CONNECTION (left-to-right) ============
function ConnectionLine({ fromPos, toPos, label }) {
  // From right-center of source card to left-center of target card
  const x1 = fromPos.x + NODE_WIDTH + 4;
  const y1 = fromPos.y + NODE_HEIGHT / 2;
  const x2 = toPos.x - 4;
  const y2 = toPos.y + NODE_HEIGHT / 2;
  const cx = Math.abs(x2 - x1) * 0.4;

  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  return (
    <g>
      <path
        d={`M ${x1} ${y1} C ${x1 + cx} ${y1}, ${x2 - cx} ${y2}, ${x2} ${y2}`}
        fill="none"
        stroke="#CBD5DB"
        strokeWidth={1.5}
      />
      {/* Arrow dot at target */}
      <circle cx={x2} cy={y2} r={2.5} fill="#CBD5DB" />
      {/* Branch label (for conditions) */}
      {label && (
        <text
          x={midX}
          y={midY - 8}
          textAnchor="middle"
          fontSize={10}
          fontWeight={500}
          fill="#A8B9C3"
          fontFamily={SK.fontFamily}
        >
          {label}
        </text>
      )}
    </g>
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
          {STEP_TYPES.map(st => (
            <option key={st.value} value={st.value}>{st.label}</option>
          ))}
        </select>
      </label>

      <label style={labelStyle}>
        Description
        <textarea
          value={step.description}
          onChange={e => update('description', e.target.value)}
          rows={4}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </label>

      {/* Tool info (read-only, if assigned) */}
      {step.tool && (
        <div style={{
          padding: '8px 10px',
          background: 'rgba(109, 177, 199, 0.06)',
          borderRadius: SK.radiusSm,
          border: `1px solid rgba(109, 177, 199, 0.15)`,
          fontSize: 12,
          color: SK.textSecondary,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <span style={{ fontSize: 14 }}>🔧</span>
          Outil : <strong style={{ color: SK.textPrimary }}>{
            { send_email: 'Email', send_teams_message: 'Teams', read_excel: 'Lire Excel', write_excel: 'Créer Excel', call_api: 'Appel API' }[step.tool] || step.tool
          }</strong>
        </div>
      )}

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
  const [executionJobId, setExecutionJobId] = useState(null);
  const [executing, setExecuting] = useState(false);
  const [stepStatuses, setStepStatuses] = useState({});
  const [showSettings, setShowSettings] = useState(false);
  const [refinePrompt, setRefinePrompt] = useState('');
  const [refining, setRefining] = useState(false);

  const { steps, connections } = data;
  const positions = useMemo(() => computeLayout(steps, connections), [steps, connections]);

  const selectedStep = steps.find(s => s.id === selectedId);

  // Canvas dimensions — fit to vertical layout
  const canvasSize = useMemo(() => {
    const allPos = Object.values(positions);
    if (!allPos.length) return { width: 600, height: 400 };
    const maxX = Math.max(...allPos.map(p => p.x)) + NODE_WIDTH + CANVAS_PADDING;
    const maxY = Math.max(...allPos.map(p => p.y)) + NODE_HEIGHT + LABEL_HEIGHT + CANVAS_PADDING;
    return { width: Math.max(400, maxX), height: Math.max(300, maxY) };
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

  const handleExecute = async () => {
    if (executing || !data.steps.length) return;
    setExecuting(true);
    setStepStatuses({});
    try {
      const result = await startAutomationExecution({
        name: data.name || 'Automation',
        description: data.description || '',
        steps: data.steps,
        connections: data.connections,
        metadata: data.metadata || {},
      });
      setExecutionJobId(result.jobId);
    } catch (err) {
      console.error('Execution failed:', err);
      setExecuting(false);
    }
  };

  const handleStepStatus = useCallback((stepName, status) => {
    setStepStatuses(prev => ({ ...prev, [stepName]: status }));
  }, []);

  const handleRefine = async () => {
    if (!refinePrompt.trim() || refining) return;
    setRefining(true);
    try {
      const context = `Workflow actuel "${data.name}" avec ${data.steps.length} étapes: ${data.steps.map(s => s.label).join(' → ')}.\n\nModification demandée: ${refinePrompt.trim()}`;
      const result = await generateAutomation(context);
      if (result.automation) {
        setData(prev => ({
          ...prev,
          ...result.automation,
          matchedTemplateId: result.matchedTemplateId,
        }));
        setRefinePrompt('');
        setSelectedId(null);
      }
    } catch (err) {
      console.error('Refine failed:', err);
    }
    setRefining(false);
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
        gap: 10,
        padding: '10px 16px',
        background: SK.white,
        borderBottom: `1px solid ${SK.border}`,
        flexWrap: 'wrap',
        minHeight: 48,
      }}>
        <button onClick={onBack} style={{ ...btnSecondary, padding: '6px 12px' }}>← {t('back')}</button>
        <div style={{ flex: 1, minWidth: 120 }}>
          <h2 style={{ margin: 0, fontSize: 16, color: SK.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{data.name}</h2>
          {data.description && (
            <p style={{ margin: '2px 0 0', fontSize: 11, color: SK.textSecondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{data.description}</p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={addStep} style={{ ...btnSecondary, padding: '6px 12px' }}>+ {t('automationAddStep')}</button>
          <button onClick={() => setShowSettings(true)} style={{ ...btnSecondary, padding: '6px 12px' }}>
            ⚙ {t('automationIntegrations')}
          </button>
          <button
            onClick={handleExecute}
            disabled={executing || !data.steps.length}
            style={{
              ...btnPrimary,
              padding: '6px 14px',
              background: executing ? SK.textMuted : `linear-gradient(135deg, ${SK.signalGreen}, ${SK.aqua})`,
              opacity: (!data.steps.length || executing) ? 0.5 : 1,
            }}
          >
            {executing ? '...' : `▶ ${t('automationExecute')}`}
          </button>
          <button onClick={() => setShowSaveModal(true)} style={{ ...btnPrimary, padding: '6px 14px' }}>
            {t('automationSaveTemplate')}
          </button>
        </div>
      </div>

      {/* Main area */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Canvas */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            position: 'relative',
            background: '#F8FAFB',
            backgroundImage: 'radial-gradient(circle, #E2E8F0 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
          onClick={() => setSelectedId(null)}
        >
          {/* Workflow container (centered) */}
          <div style={{ width: canvasSize.width, minHeight: canvasSize.height, position: 'relative', margin: '0 auto' }}>
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
                return <ConnectionLine key={i} fromPos={from} toPos={to} label={conn.label || null} />;
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
                    executionStatus={stepStatuses[step.tool] || null}
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
          </div>{/* /workflow container */}
        </div>{/* /canvas */}

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

      {/* Refinement chat bar */}
      <div style={{
        padding: '10px 16px',
        background: SK.white,
        borderTop: `1px solid ${SK.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <div style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          background: SK.bgSecondary,
          borderRadius: SK.radiusMd,
          border: `1px solid ${SK.border}`,
          padding: '0 12px',
          transition: 'border-color 0.2s',
        }}>
          <span style={{ fontSize: 14, color: SK.textMuted, marginRight: 8 }}>💬</span>
          <input
            value={refinePrompt}
            onChange={e => setRefinePrompt(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleRefine(); } }}
            placeholder={t('automationRefinePlaceholder')}
            disabled={refining}
            style={{
              flex: 1,
              padding: '10px 0',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: 13,
              color: SK.textPrimary,
              fontFamily: SK.fontFamily,
            }}
            onFocus={e => e.target.parentElement.style.borderColor = SK.cranberry}
            onBlur={e => e.target.parentElement.style.borderColor = SK.border}
          />
        </div>
        <button
          onClick={handleRefine}
          disabled={!refinePrompt.trim() || refining}
          style={{
            ...btnPrimary,
            padding: '8px 16px',
            opacity: (!refinePrompt.trim() || refining) ? 0.5 : 1,
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {refining ? (
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              style={{ display: 'inline-block', width: 14, height: 14, border: `2px solid rgba(255,255,255,0.3)`, borderTopColor: SK.white, borderRadius: '50%' }}
            />
          ) : null}
          {refining ? '...' : t('automationRefine')}
        </button>
      </div>

      {/* Metadata footer */}
      {data.metadata && (
        <div style={{
          padding: '6px 16px',
          background: SK.white,
          borderTop: `1px solid ${SK.border}`,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          fontSize: 11,
          color: SK.textMuted,
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

      {/* Execution panel */}
      <AnimatePresence>
        {executionJobId && (
          <ExecutionPanel
            jobId={executionJobId}
            onClose={() => { setExecutionJobId(null); setExecuting(false); setStepStatuses({}); }}
            onStepStatus={handleStepStatus}
            t={t}
          />
        )}
      </AnimatePresence>

      {/* Save modal */}
      {showSaveModal && (
        <SaveModal onSave={handleSave} onClose={() => setShowSaveModal(false)} t={t} />
      )}

      {/* Integration settings modal */}
      {showSettings && (
        <IntegrationSettings onClose={() => setShowSettings(false)} t={t} />
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
