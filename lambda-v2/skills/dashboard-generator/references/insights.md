# Points Cles (Key Takeaways)

La page principale finit par une section de points cles.

## Structure

```jsx
<div className="card">
  <h3 className="section-title">Points cles</h3>
  {takeaways.map((t, i) => (
    <div key={i} className="insight-item">
      <div className={`insight-bar ${
        t.type === 'up' ? 'insight-bar-up' :
        t.type === 'down' ? 'insight-bar-down' :
        'insight-bar-accent'
      }`} />
      <p className="insight-text">{t.text}</p>
    </div>
  ))}
</div>
```

## Types

- `insight-bar-up` — vert (#10B981) pour les observations positives
- `insight-bar-down` — rouge (#EF4444) pour les observations negatives
- `insight-bar-accent` — cyan (#06B6D4) pour les observations neutres

## Regle

Observations **CALCULEES** a partir des vraies donnees. **JAMAIS** de chiffres inventes ou extrapoles.
