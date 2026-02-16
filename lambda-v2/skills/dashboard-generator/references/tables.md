# Tableaux

## Structure

```jsx
<div className="card mb-6">
  <h3 className="section-title">Titre</h3>
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead>
        <tr className="border-b">
          <th className="table-header-cell">Colonne</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i} className={`${i%2===0 ? 'table-row-even' : 'table-row-odd'} hover-bg`}>
            <td className="table-cell">{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>
```

## Classes

- `table-header-cell` — 11px uppercase text-tertiary, padding
- `table-cell` — 12px text-secondary, padding
- `table-row-even` — bg-card
- `table-row-odd` — bg-card-alt
- `hover-bg` — transition bg-card-hover au survol
