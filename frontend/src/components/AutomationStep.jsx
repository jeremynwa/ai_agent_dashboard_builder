// frontend/src/components/AutomationStep.jsx — Visual node for the workflow canvas
import React from 'react';
import { SK } from '../services/sk-theme';

const TYPE_STYLES = {
  trigger: { color: SK.signalGreen, bg: 'rgba(47, 167, 77, 0.1)', icon: '⚡' },
  action: { color: SK.aqua, bg: 'rgba(109, 177, 199, 0.1)', icon: '⚙️' },
  condition: { color: SK.signalYellow, bg: 'rgba(255, 204, 102, 0.15)', icon: '🔀' },
  output: { color: SK.ruby, bg: 'rgba(200, 0, 65, 0.08)', icon: '📤' },
};

const NODE_WIDTH = 240;
const NODE_HEIGHT = 100;
const PORT_SIZE = 12;

export { NODE_WIDTH, NODE_HEIGHT, PORT_SIZE };

export default function AutomationStep({ step, isSelected, onSelect, position }) {
  const ts = TYPE_STYLES[step.type] || TYPE_STYLES.action;

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onSelect(step.id); }}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        background: SK.white,
        border: `2px solid ${isSelected ? ts.color : SK.border}`,
        borderRadius: SK.radiusMd,
        boxShadow: isSelected ? `0 0 0 3px ${ts.color}30` : SK.shadowSm,
        cursor: 'pointer',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 12px 6px',
      }}>
        <div style={{
          width: 28,
          height: 28,
          borderRadius: SK.radiusSm,
          background: ts.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          flexShrink: 0,
        }}>
          {ts.icon}
        </div>
        <div style={{
          fontSize: 13,
          fontWeight: 600,
          color: SK.textPrimary,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
        }}>
          {step.label}
        </div>
      </div>

      {/* Description */}
      <div style={{
        padding: '0 12px 10px',
        fontSize: 11,
        color: SK.textSecondary,
        lineHeight: 1.3,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
      }}>
        {step.description}
      </div>

      {/* Input port (left center) */}
      {step.type !== 'trigger' && (
        <div style={{
          position: 'absolute',
          left: -(PORT_SIZE / 2),
          top: NODE_HEIGHT / 2 - PORT_SIZE / 2,
          width: PORT_SIZE,
          height: PORT_SIZE,
          borderRadius: '50%',
          background: SK.white,
          border: `2px solid ${ts.color}`,
        }} />
      )}

      {/* Output port (right center) */}
      {step.type !== 'output' && (
        <div style={{
          position: 'absolute',
          right: -(PORT_SIZE / 2),
          top: NODE_HEIGHT / 2 - PORT_SIZE / 2,
          width: PORT_SIZE,
          height: PORT_SIZE,
          borderRadius: '50%',
          background: ts.color,
          border: `2px solid ${ts.color}`,
        }} />
      )}

      {/* Type badge */}
      <div style={{
        position: 'absolute',
        top: 6,
        right: 8,
        fontSize: 9,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        color: ts.color,
        opacity: 0.7,
      }}>
        {step.type}
      </div>
    </div>
  );
}
