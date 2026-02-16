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

## Regles de Contenu — OBLIGATOIRE

Les tableaux dans un dashboard NE SONT PAS des dumps de donnees brutes.

### Ce qu'un tableau DOIT montrer
- Donnees **AGREGEES** (ex: total par categorie, moyenne par produit)
- **Top 10-15** lignes triees par metrique decroissante
- Colonnes **significatives**: noms, categories, metriques formatees
- Titre descriptif (ex: "Top 10 produits par chiffre d'affaires")

### Ce qu'un tableau NE DOIT PAS montrer
- **INTERDIT**: liste de commandes individuelles (order_id, date, amount, ...)
- **INTERDIT**: dump de toutes les transactions
- **INTERDIT**: colonnes ID comme colonne principale (order_id, product_id, invoice_id)
- **INTERDIT**: nombres non formates (utiliser `fmt()`, `fmtCur()`)

### Formatage dans les tableaux

```jsx
<td className="table-cell">{fmtCur(row.revenue)}</td>
<td className="table-cell">{fmt(row.quantity)}</td>
<td className="table-cell">
  <span className={row.growth >= 0 ? 'text-up' : 'text-down'}>
    {fmtPct(row.growth)}
  </span>
</td>
```
