# Formatage des Nombres

Definir ces helpers en haut du composant:

```jsx
const fmt = (n, d=0) => {
  if (n == null) return '-';
  if (Math.abs(n) >= 1e6) return (n/1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return (n/1e3).toFixed(1) + 'K';
  return n.toFixed(d);
};

const fmtCur = (n) => fmt(n) + ' EUR';

const fmtPct = (n) => (n >= 0 ? '+' : '') + n.toFixed(1) + '%';
```

## Utilisation

- `fmt(1234567)` → `"1.2M"`
- `fmt(45600)` → `"45.6K"`
- `fmtCur(1234567)` → `"1.2M EUR"`
- `fmtPct(12.3)` → `"+12.3%"`
- `fmtPct(-5.1)` → `"-5.1%"`
