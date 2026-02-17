# Tableaux

## Structure

```jsx
<div className="card mb-6">
  <h3 className="section-title">Titre</h3>
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead>
        <tr>
          <th className="table-header-cell">Colonne</th>
          <th className="table-header-cell" style={{textAlign:'right'}}>Metrique</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i} className={`${i%2===0 ? 'table-row-even' : 'table-row-odd'} hover-bg`}>
            <td className="table-cell">{row.name}</td>
            <td className="table-cell" style={{textAlign:'right'}}>{fmtCur(row.value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>
```

## Classes CSS

- `w-full` — width 100%, border-collapse: collapse
- `table-header-cell` — 11px uppercase, text-tertiary, padding 10px 16px, white-space nowrap, border-bottom
- `table-cell` — 13px, text-secondary, padding 10px 16px, white-space nowrap, border-bottom subtile
- `table-cell:first-child` — text-primary + font-weight 500 (la premiere colonne est plus visible)
- `table-row-even` — bg-card
- `table-row-odd` — bg-card-alt
- `hover-bg` — transition bg-card-hover au survol

## REGLES D'ALIGNEMENT — OBLIGATOIRE

- Colonnes texte (noms, categories): `text-align: left` (defaut)
- Colonnes numeriques (montants, quantites, %): `style={{textAlign:'right'}}` sur BOTH `<th>` ET `<td>`
- Cela aligne les chiffres proprement les uns sous les autres
- TOUJOURS formater: `fmtCur()` pour les montants, `fmt()` pour les quantites, `fmtPct()` pour les %

### Exemple alignement correct:
```jsx
<th className="table-header-cell">Produit</th>
<th className="table-header-cell" style={{textAlign:'right'}}>CA</th>
<th className="table-header-cell" style={{textAlign:'right'}}>Quantite</th>
<th className="table-header-cell" style={{textAlign:'right'}}>Marge</th>
```

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
<td className="table-cell" style={{textAlign:'right'}}>{fmtCur(row.revenue)}</td>
<td className="table-cell" style={{textAlign:'right'}}>{fmt(row.quantity)}</td>
<td className="table-cell" style={{textAlign:'right'}}>
  <span className={row.growth >= 0 ? 'text-up' : 'text-down'}>
    {fmtPct(row.growth)}
  </span>
</td>
```
