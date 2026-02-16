# Structure Obligatoire

## Regles

1. PAS de sidebar fixe — un DRAWER qui s'ouvre/ferme
2. HEADER (app-header) avec hamburger + titre + tab-btn onglets
3. CONTENU pleine largeur (content-area) avec KPIs + graphiques + tableaux

## DRAWER

```jsx
{isDrawerOpen && <div className="overlay" onClick={() => setDrawerOpen(false)} />}
<div className={`drawer ${isDrawerOpen ? 'drawer-open' : 'drawer-closed'}`}>
  {pages.map(p => (
    <button
      key={p.id}
      className={`nav-item ${activePage === p.id ? 'nav-item-active' : ''}`}
      onClick={() => { setPage(p.id); setDrawerOpen(false); }}
    >
      {p.label}
    </button>
  ))}
</div>
```

## HEADER

```jsx
<header className="app-header">
  <button className="hamburger" onClick={() => setDrawerOpen(true)}>
    <div className="hamburger-line" />
    <div className="hamburger-line" />
    <div className="hamburger-line" />
  </button>
  <span className="text-base font-semibold text-primary">Titre du Dashboard</span>
  <div className="flex gap-2" style={{marginLeft:'auto'}}>
    {pages.map(p => (
      <button
        key={p.id}
        className={`tab-btn ${activePage === p.id ? 'tab-btn-active' : ''}`}
        onClick={() => setPage(p.id)}
      >
        {p.label}
      </button>
    ))}
  </div>
</header>
```

## CONTENU

```jsx
<div className="content-area">
  {/* KPIs, graphiques, tableaux selon la page active */}
</div>
```

## Regles Boutons

- PAS de bouton "Refresh" ni "Export" dans le header
- Seuls boutons autorises: hamburger + onglets de navigation
