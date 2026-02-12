// frontend/src/components/MatrixRain.jsx
import { useState, useEffect, useRef } from 'react';

const COLS = 20;
const ROWS = 6;
const CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF{}[]<>/=;'.split('');

function randomChar() {
  return CHARS[Math.floor(Math.random() * CHARS.length)];
}

export default function MatrixRain({ step = 0 }) {
  const [grid, setGrid] = useState([]);
  const dropsRef = useRef([]);

  useEffect(() => {
    // Init drops at random positions
    dropsRef.current = Array.from({ length: COLS }, () => ({
      y: Math.floor(Math.random() * ROWS),
      speed: 1 + Math.random() * 2,
      counter: 0,
    }));

    // Init grid
    setGrid(Array.from({ length: ROWS }, () =>
      Array.from({ length: COLS }, () => ({ char: randomChar(), brightness: 0 }))
    ));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setGrid(prev => {
        const next = prev.map(row => row.map(cell => ({
          ...cell,
          brightness: Math.max(0, cell.brightness - 0.06),
          char: cell.brightness > 0.8 && Math.random() > 0.7 ? randomChar() : cell.char,
        })));

        // All columns active, speed increases with step
        dropsRef.current.forEach((drop, col) => {
          const speedBoost = 1 + step * 0.3;
          drop.counter += drop.speed * speedBoost;
          if (drop.counter >= 3) {
            drop.counter = 0;
            drop.y = (drop.y + 1) % ROWS;
            if (next[drop.y] && next[drop.y][col]) {
              next[drop.y][col] = { char: randomChar(), brightness: 1 };
            }
            // Trail
            const trail1 = (drop.y - 1 + ROWS) % ROWS;
            const trail2 = (drop.y - 2 + ROWS) % ROWS;
            if (next[trail1] && next[trail1][col]) {
              next[trail1][col] = { ...next[trail1][col], brightness: Math.max(next[trail1][col].brightness, 0.6) };
            }
            if (next[trail2] && next[trail2][col]) {
              next[trail2][col] = { ...next[trail2][col], brightness: Math.max(next[trail2][col].brightness, 0.3) };
            }
          }
        });

        return next;
      });
    }, 80);

    return () => clearInterval(interval);
  }, [step]);

  return (
    <div style={styles.container}>
      <div style={styles.grid}>
        {grid.map((row, y) => (
          <div key={y} style={styles.row}>
            {row.map((cell, x) => (
              <span
                key={x}
                style={{
                  ...styles.cell,
                  color: cell.brightness > 0.9
                    ? '#FFFFFF'
                    : cell.brightness > 0.5
                      ? '#00A382'
                      : cell.brightness > 0
                        ? '#00765F'
                        : '#1a1a22',
                  textShadow: cell.brightness > 0.8
                    ? '0 0 8px rgba(0, 163, 130, 0.8)'
                    : 'none',
                  opacity: Math.max(0.15, cell.brightness),
                }}
              >
                {cell.char}
              </span>
            ))}
          </div>
        ))}
      </div>
      <div style={styles.scanline} />
    </div>
  );
}

const styles = {
  container: {
    position: 'relative',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '8px 0',
    overflow: 'hidden',
  },
  grid: {
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    fontSize: '11px',
    lineHeight: '16px',
    letterSpacing: '2px',
    userSelect: 'none',
  },
  row: {
    display: 'flex',
    justifyContent: 'center',
  },
  cell: {
    width: '14px',
    textAlign: 'center',
    transition: 'color 0.15s ease',
  },
  scanline: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
    pointerEvents: 'none',
  },
};