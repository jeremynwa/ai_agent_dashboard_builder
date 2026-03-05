# Projet Scraping Chaussures - Besson & Chaussea

## Architecture

```
config.py                # URLs cibles, categories, parametres navigateur
main.py                  # Point d'entree, orchestre scraping + export
extract_excel_to_json.py # Utilitaire : extraction Excel existant vers JSON
scrapers/
  chaussea.py            # Scraper PrestaShop + Cloudflare (headless=False)
  besson.py              # Scraper Magento (headless=True)
  utils.py               # parse_price() partage
export/
  excel.py               # Generation Excel multi-onglets (openpyxl)
output/
  chaussures_prix.xlsx   # Fichier Excel final
  donnees_scraping.json  # Sauvegarde JSON intermediaire (toutes les donnees)
```

## Stack technique

- **Python 3.13** + **Playwright** (async) pour le scraping
- **openpyxl** pour l'export Excel
- Pas de base de donnees : donnees en memoire + JSON intermediaire

## Particularites par site

### Chaussea (PrestaShop)

- **Protection Cloudflare** : headless=False obligatoire + anti-detection (webdriver masque, user-agent realiste)
- **Attente** : 10s par page (challenge JS Cloudflare)
- **Pagination** : `?page=N` ajoute a l'URL de base
- **Produits/page** : 48
- **Selecteurs** : `.product-miniature`, `.product-manu`, `.product-name`, `.price`, `.regular-price`

### Besson (Magento)

- **Pas de protection** : headless=True fonctionne
- **Attente** : 3s par page
- **Cookies** : bandeau Didomi a accepter (#didomi-notice-agree-button)
- **Pagination** : `&p=N` ou `?p=N` selon presence de `?` dans l'URL
- **Produits/page** : 19
- **Selecteurs** : `.product-item`, `.product-item-brand`, `.product-item-link`, `.special-price .price`, `.old-price .price`

## Structure des donnees

Cle du dictionnaire `all_data` : `(categorie, enseigne, matiere)`

Cle JSON : `"categorie|enseigne|matiere"` (pipe-separated)

Chaque produit :

```python
{
    "marque": str,
    "nom_produit": str,
    "prix_actuel": float,
    "prix_barre": float | None,  # None si pas en promo
    "url_produit": str,
}
```

## Excel : structure des onglets (12 onglets)

1. **Synthese** : stats par categorie/enseigne/matiere (nb produits, min/max/moy/median, % promo)
2. **ALL** : listing brut complet de tous les produits
   3-12. **Un onglet par categorie** : detail avec les deux enseignes

**Attention** : les noms d'onglets Excel ne supportent pas `/`. On remplace `" / "` par `" - "` dans les titres d'onglets.

## Categories actuelles (config.py)

### Femme (4 categories)

- Boots / Bottines
- Sneakers / Tennis
- Sandales / Nu-pieds
- Mocassins / Bateau

### Homme (4 categories)

- Sneakers / Tennis Homme
- Chaussures de ville Homme
- Mocassins / Bateau Homme
- Boots / Bottines Homme

### Enfants (2 categories, fille + garcon fusionnes)

- Sneakers / Tennis Enfants
- Boots / Bottines Enfants

Chaque categorie a 2 enseignes (Chaussea, Besson) x 2 matieres (Synthetique, Cuir).

Pour Besson, "Cuir" regroupe Cuir lisse + Cuir velours via un seul filtre (`filter_material=3051%2C3069`), sauf Besson Boots garcon cuir = seulement Cuir lisse (`3051`).

Pour Enfants, chaque matiere a **2 URLs** (fille + garcon) definies en liste dans config.py. Les produits sont fusionnes automatiquement.

## Mode --only (ajout sans re-scraper)

```bash
# Scraper TOUT
python main.py

# Scraper uniquement certaines categories (le reste est charge depuis le JSON existant)
python main.py --only "Sneakers / Tennis Homme" "Boots / Bottines Enfants"
```

Le JSON (`output/donnees_scraping.json`) est sauvegarde apres chaque run et sert de cache pour les categories non re-scrapees.

## Ajout de nouvelles categories

1. Ajouter l'entree dans `CATEGORIES` dans `config.py`
   - URL unique : `"matiere": "https://..."`
   - URLs multiples (ex: fille+garcon) : `"matiere": ["https://...", "https://..."]`
2. Lancer `python main.py --only "Nouvelle Categorie"`
3. L'onglet correspondant sera cree automatiquement dans l'Excel
4. Les donnees existantes sont preservees depuis le JSON

## Volumes constates (27/02/2026)

| Segment   | Produits    |
| --------- | ----------- |
| Femme     | ~6 900      |
| Homme     | ~4 570      |
| Enfants   | ~3 030      |
| **Total** | **~14 500** |

Temps d'execution : ~35 min pour Femme seul, ~47 min pour Homme+Enfants seul. Principalement Chaussea avec 10s/page Cloudflare.

## Pieges connus

- Noms d'onglets Excel : pas de `/` (remplacer par `-`)
- Chaussea Sneakers page 25+ : retourne 0 produits (page fantome, pas grave)
- Encodage console Windows : les accents s'affichent mal dans les logs mais les donnees sont correctes (UTF-8 dans JSON/Excel). Eviter les caracteres speciaux (fleches, etc.) dans les print().
- Cle config Chaussea = `"Chaussea"` (avec accent e dans le code source), attention a la coherence entre config, main.py et JSON.
- Le JSON existant doit etre present dans `output/donnees_scraping.json` pour que `--only` fonctionne. Si absent, utiliser `extract_excel_to_json.py` pour le regenerer depuis l'Excel.

## GitHub

Repo prive : https://github.com/Va2944/scraping-chaussures-femme
