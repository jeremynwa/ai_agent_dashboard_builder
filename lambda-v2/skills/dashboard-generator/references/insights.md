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

- `insight-bar-up` — vert (#10B981) pour les observations positives (variation > 0)
- `insight-bar-down` — rouge (#EF4444) pour les observations negatives (variation < 0)
- `insight-bar-accent` — cyan (#06B6D4) pour les observations neutres (faits, pas de variation)

## REGLE ABSOLUE — Template Literals Obligatoires

CHAQUE insight DOIT utiliser des template literals avec des valeurs CALCULEES dynamiquement.

### CORRECT (template literals + useMemo + valeurs dynamiques):

```jsx
const takeaways = useMemo(() => {
  const totalCA = DATA.reduce((s, r) => s + (Number(r.revenue) || 0), 0);
  const avgOrder = totalCA / DATA.length;
  const byCat = DATA.reduce((acc, r) => {
    acc[r.category] = (acc[r.category] || 0) + (Number(r.revenue) || 0);
    return acc;
  }, {});
  const topCat = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];

  return [
    { text: `Le chiffre d'affaires total s'eleve a ${fmtCur(totalCA)} sur ${DATA.length} enregistrements`, type: 'accent' },
    { text: `La categorie "${topCat[0]}" represente ${fmtCur(topCat[1])} soit ${fmtPct(topCat[1]/totalCA*100)} du total`, type: 'up' },
    { text: `Le panier moyen est de ${fmtCur(avgOrder)}`, type: 'accent' },
  ];
}, []);
```

### INTERDIT (nombres hardcodes dans les strings):

```jsx
// INTERDIT — valeurs numeriques en dur dans les strings
const takeaways = [
  { text: "Le CA a augmente de 15.3% par rapport au mois precedent", type: "up" },
  { text: "Le panier moyen est de 45.20 EUR", type: "accent" },
  { text: "1523 commandes traitees ce mois", type: "accent" },
];
```

## Regles de Detection

Un insight est **INVALIDE** si:
- Il contient un nombre en dur dans la chaine (ex: `"15.3%"`, `"45.20 EUR"`, `"1523 commandes"`)
- Il utilise une string normale (`"..."`) au lieu d'un template literal (`` `...` ``)
- Le `type` (up/down/accent) est statique au lieu de calcule a partir d'une condition
- Le tableau `takeaways` est defini sans `useMemo`

## Regles de Contenu

- 3 a 5 insights maximum
- Chaque insight fait reference a une valeur CALCULEE depuis DATA
- Si pas de colonne de periode: pas de "augmentation de X%" ni de "par rapport a"
- `type: 'up'` ou `'down'` seulement si une variation est calculable (deux periodes comparables)
- Sinon utiliser `type: 'accent'` pour les faits neutres
