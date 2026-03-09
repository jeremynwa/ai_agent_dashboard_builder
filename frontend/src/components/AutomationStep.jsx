// frontend/src/components/AutomationStep.jsx — Visual node for the workflow canvas
// Inspired by WorkOS/n8n style: square card with centered icon, label below
import React from 'react';
import { SK } from '../services/sk-theme';

const TYPE_STYLES = {
  trigger: { color: SK.signalGreen, bg: 'rgba(47, 167, 77, 0.08)', icon: '⚡', badge: '⚡' },
  action:  { color: SK.aqua, bg: 'rgba(109, 177, 199, 0.08)', icon: '⚙️', badge: null },
  condition: { color: SK.signalYellow, bg: 'rgba(255, 204, 102, 0.1)', icon: '🔀', badge: '?' },
  output:  { color: SK.ruby, bg: 'rgba(200, 0, 65, 0.06)', icon: '📤', badge: null },
};

// Card dimensions (square)
const NODE_WIDTH = 110;
const NODE_HEIGHT = 110;
const LABEL_HEIGHT = 40;   // space below card for label
const PORT_SIZE = 10;

export { NODE_WIDTH, NODE_HEIGHT, LABEL_HEIGHT, PORT_SIZE };

const TOOL_ICONS = {
  send_email: '📧',
  send_teams_message: '💬',
  read_excel: '📊',
  write_excel: '📝',
  call_api: '🌐',
};

const TOOL_LABELS = {
  send_email: 'Email',
  send_teams_message: 'Teams',
  read_excel: 'Lire Excel',
  write_excel: 'Créer Excel',
  call_api: 'API',
};

const EXEC_STATUS_STYLES = {
  running: { borderColor: '#06B6D4', shadow: '0 0 12px rgba(6, 182, 212, 0.35)' },
  success: { borderColor: '#2FA74D', shadow: '0 0 12px rgba(47, 167, 77, 0.3)' },
  error:   { borderColor: '#E45444', shadow: '0 0 12px rgba(228, 84, 68, 0.3)' },
};

export default function AutomationStep({ step, isSelected, onSelect, position, executionStatus }) {
  const ts = TYPE_STYLES[step.type] || TYPE_STYLES.action;
  const execStyle = executionStatus ? EXEC_STATUS_STYLES[executionStatus] : null;
  const toolIcon = step.tool ? TOOL_ICONS[step.tool] : null;
  // Show tool icon if available, otherwise type icon
  const displayIcon = toolIcon || ts.icon;
  const displayIconSize = toolIcon ? 34 : 30;

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onSelect(step.id); }}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: NODE_WIDTH,
        userSelect: 'none',
        cursor: 'pointer',
      }}
    >
      {/* The square card */}
      <div style={{
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        background: SK.white,
        border: `1.5px solid ${execStyle?.borderColor || (isSelected ? ts.color : '#E2E8F0')}`,
        borderRadius: 14,
        boxShadow: execStyle?.shadow || (isSelected
          ? `0 0 0 3px ${ts.color}20, ${SK.shadowMd}`
          : '0 1px 4px rgba(50, 63, 72, 0.06), 0 4px 12px rgba(50, 63, 72, 0.04)'),
        transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.15s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'visible',
      }}
        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = execStyle?.shadow || SK.shadowMd; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = execStyle?.shadow || (isSelected ? `0 0 0 3px ${ts.color}20, ${SK.shadowMd}` : '0 1px 4px rgba(50, 63, 72, 0.06), 0 4px 12px rgba(50, 63, 72, 0.04)'); }}
      >
        {/* Main icon */}
        <div style={{
          fontSize: displayIconSize,
          lineHeight: 1,
          filter: executionStatus === 'running' ? 'none' : 'none',
        }}>
          {displayIcon}
        </div>

        {/* Type badge (top-left small indicator) */}
        {ts.badge && (
          <div style={{
            position: 'absolute',
            top: -6,
            left: -6,
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: ts.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
          }}>
            {ts.badge}
          </div>
        )}

        {/* Tool label (bottom-right inside card) */}
        {step.tool && TOOL_LABELS[step.tool] && (
          <div style={{
            position: 'absolute',
            bottom: 6,
            right: 0,
            left: 0,
            textAlign: 'center',
            fontSize: 9,
            fontWeight: 600,
            color: SK.textMuted,
            letterSpacing: '0.3px',
            textTransform: 'uppercase',
          }}>
            {TOOL_LABELS[step.tool]}
          </div>
        )}

        {/* Input port (left center) */}
        {step.type !== 'trigger' && (
          <div style={{
            position: 'absolute',
            left: -(PORT_SIZE / 2) - 1,
            top: NODE_HEIGHT / 2 - PORT_SIZE / 2,
            width: PORT_SIZE,
            height: PORT_SIZE,
            borderRadius: '50%',
            background: SK.white,
            border: `2px solid ${execStyle?.borderColor || '#CBD5DB'}`,
            transition: 'border-color 0.2s',
          }} />
        )}

        {/* Output port (right center) */}
        {step.type !== 'output' && (
          <div style={{
            position: 'absolute',
            right: -(PORT_SIZE / 2) - 1,
            top: NODE_HEIGHT / 2 - PORT_SIZE / 2,
            width: PORT_SIZE,
            height: PORT_SIZE,
            borderRadius: '50%',
            background: execStyle?.borderColor || '#CBD5DB',
            border: `2px solid ${execStyle?.borderColor || '#CBD5DB'}`,
            transition: 'background 0.2s, border-color 0.2s',
          }} />
        )}

        {/* Execution status pulse */}
        {executionStatus === 'running' && (
          <div style={{
            position: 'absolute',
            inset: -4,
            borderRadius: 18,
            border: `2px solid ${EXEC_STATUS_STYLES.running.borderColor}`,
            animation: 'pulse-ring 1.5s ease-in-out infinite',
            pointerEvents: 'none',
          }} />
        )}
      </div>

      {/* Label below the card */}
      <div style={{
        marginTop: 8,
        textAlign: 'center',
        fontSize: 12,
        fontWeight: 500,
        color: SK.textPrimary,
        lineHeight: 1.3,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        maxHeight: LABEL_HEIGHT,
        fontFamily: SK.fontFamily,
      }}>
        {step.label}
      </div>

      {/* Pulse animation keyframes (injected once) */}
      {executionStatus === 'running' && (
        <style>{`
          @keyframes pulse-ring {
            0% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.4; transform: scale(1.05); }
            100% { opacity: 1; transform: scale(1); }
          }
        `}</style>
      )}
    </div>
  );
}
