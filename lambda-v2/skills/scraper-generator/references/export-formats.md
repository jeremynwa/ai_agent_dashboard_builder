# Export — Excel et JSON

## JSON intermediaire (obligatoire)

Toujours sauvegarder les donnees en JSON apres chaque run. Sert de cache pour `--only`.

```python
import json

def save_json(data, filepath):
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def load_json(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)
```

## Excel avec openpyxl

### Structure type multi-onglets

```python
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from statistics import mean, median

def generate_excel(all_data, output_path):
    wb = Workbook()

    # 1. Onglet Synthese (resume stats)
    create_summary_sheet(wb, all_data)

    # 2. Onglet ALL (listing complet)
    create_all_sheet(wb, all_data)

    # 3. Un onglet par categorie
    for category, products in all_data.items():
        sheet_name = sanitize_sheet_name(category)
        create_category_sheet(wb, sheet_name, products)

    # Supprimer l'onglet par defaut si vide
    if "Sheet" in wb.sheetnames and len(wb.sheetnames) > 1:
        del wb["Sheet"]

    wb.save(output_path)
```

### Sanitisation des noms d'onglets

```python
def sanitize_sheet_name(name):
    """Excel interdit / \\ ? * [ ] dans les noms d'onglets, max 31 chars."""
    cleaned = name.replace("/", "-").replace("\\", "-")
    for char in "?*[]":
        cleaned = cleaned.replace(char, "")
    return cleaned[:31]
```

### Styles Excel

```python
HEADER_FONT = Font(bold=True, color="FFFFFF", size=11)
HEADER_FILL = PatternFill(start_color="2F5496", end_color="2F5496", fill_type="solid")
HEADER_ALIGNMENT = Alignment(horizontal="center", vertical="center", wrap_text=True)
THIN_BORDER = Border(
    left=Side(style="thin"),
    right=Side(style="thin"),
    top=Side(style="thin"),
    bottom=Side(style="thin"),
)

def style_header_row(ws, num_cols):
    for col in range(1, num_cols + 1):
        cell = ws.cell(row=1, column=col)
        cell.font = HEADER_FONT
        cell.fill = HEADER_FILL
        cell.alignment = HEADER_ALIGNMENT
        cell.border = THIN_BORDER
```

### Onglet Synthese (stats)

```python
def create_summary_sheet(wb, all_data):
    ws = wb.active
    ws.title = "Synthese"
    headers = ["Categorie", "Nb Produits", "Prix Min", "Prix Max", "Prix Moyen", "Prix Median", "% Promo"]
    for col, h in enumerate(headers, 1):
        ws.cell(row=1, column=col, value=h)
    style_header_row(ws, len(headers))

    row = 2
    for category, products in all_data.items():
        prices = [p["prix_actuel"] for p in products if p.get("prix_actuel")]
        promos = [p for p in products if p.get("prix_barre") is not None]
        ws.cell(row=row, column=1, value=category)
        ws.cell(row=row, column=2, value=len(products))
        ws.cell(row=row, column=3, value=min(prices) if prices else 0)
        ws.cell(row=row, column=4, value=max(prices) if prices else 0)
        ws.cell(row=row, column=5, value=round(mean(prices), 2) if prices else 0)
        ws.cell(row=row, column=6, value=round(median(prices), 2) if prices else 0)
        ws.cell(row=row, column=7, value=f"{len(promos)/len(products)*100:.1f}%" if products else "0%")
        row += 1

    auto_fit_columns(ws)
```

### Auto-fit colonnes

```python
def auto_fit_columns(ws):
    for col in ws.columns:
        max_length = 0
        col_letter = get_column_letter(col[0].column)
        for cell in col:
            if cell.value:
                max_length = max(max_length, len(str(cell.value)))
        ws.column_dimensions[col_letter].width = min(max_length + 4, 50)
```

## Regles critiques

1. **Dual export** : TOUJOURS JSON (intermediaire) + Excel (final)
2. **JSON en premier** : sauvegarder le JSON AVANT de generer l'Excel (en cas d'erreur Excel, les donnees ne sont pas perdues)
3. **Noms d'onglets** : pas de `/` ni `\` ni `?*[]`, max 31 caracteres
4. **Encodage** : `ensure_ascii=False` pour le JSON, UTF-8 partout
5. **Pas d'emojis** : jamais de caracteres unicode speciaux dans les print() (probleme Windows)
