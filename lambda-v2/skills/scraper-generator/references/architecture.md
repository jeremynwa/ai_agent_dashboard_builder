# Architecture Standard

## Structure des fichiers

```
config.py                # URLs cibles, categories, parametres navigateur
main.py                  # Point d'entree, orchestre scraping + export
scrapers/
  site_name.py           # Un fichier par site/source (async Playwright)
  utils.py               # Fonctions partagees (parse_price, clean_text, etc.)
export/
  excel.py               # Generation Excel multi-onglets (openpyxl)
output/
  donnees_scraping.json  # Sauvegarde JSON intermediaire (cache)
  resultat_final.xlsx    # Fichier Excel final
requirements.txt         # Dependances Python
```

## config.py

```python
# Toutes les URLs, categories et parametres ici — JAMAIS dans le code de scraping

BROWSER_CONFIG = {
    "headless": False,           # True si pas de protection, False si Cloudflare/etc.
    "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
}

DELAYS = {
    "page_load": 5,              # Secondes entre chaque page
    "protected_page_load": 10,   # Sites avec Cloudflare/protection JS
    "between_categories": 3,     # Pause entre categories
}

CATEGORIES = {
    "Nom Categorie": {
        "enseigne": "NomSite",
        "urls": {
            "filtre1": "https://example.com/categorie?filtre=1",
            "filtre2": "https://example.com/categorie?filtre=2",
        }
    },
}

OUTPUT_DIR = "output"
JSON_FILE = "output/donnees_scraping.json"
EXCEL_FILE = "output/resultat_final.xlsx"
```

## main.py

```python
import asyncio
import argparse
import json
import os
from config import CATEGORIES, JSON_FILE, EXCEL_FILE, OUTPUT_DIR
from export.excel import generate_excel

async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", nargs="*", help="Ne scraper que ces categories")
    args = parser.parse_args()

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Charger les donnees existantes (cache JSON)
    all_data = {}
    if os.path.exists(JSON_FILE):
        with open(JSON_FILE, "r", encoding="utf-8") as f:
            all_data = json.load(f)

    # Determiner les categories a scraper
    categories_to_scrape = args.only if args.only else list(CATEGORIES.keys())

    for cat_name in categories_to_scrape:
        if cat_name not in CATEGORIES:
            print(f"[WARN] Categorie inconnue: {cat_name}")
            continue
        cat_config = CATEGORIES[cat_name]
        try:
            # Appeler le scraper correspondant
            data = await scrape_category(cat_name, cat_config)
            all_data[cat_name] = data
        except Exception as e:
            print(f"[ERROR] {cat_name}: {e}")
            # Continuer avec les autres categories

    # Sauvegarder JSON intermediaire
    with open(JSON_FILE, "w", encoding="utf-8") as f:
        json.dump(all_data, f, ensure_ascii=False, indent=2)

    # Generer Excel final
    generate_excel(all_data, EXCEL_FILE)
    print(f"[OK] Export termine: {EXCEL_FILE}")

if __name__ == "__main__":
    asyncio.run(main())
```

## Structure des donnees produit

```python
{
    "marque": str,
    "nom_produit": str,
    "prix_actuel": float,
    "prix_barre": float | None,    # None si pas en promo
    "url_produit": str,
}
```

La cle du dictionnaire `all_data` est le nom de la categorie (string).
Cle JSON intermediaire : identique.

## requirements.txt

```
playwright>=1.40.0
openpyxl>=3.1.2
```

Toujours inclure ce fichier. Ajouter d'autres dependances si necessaire.
