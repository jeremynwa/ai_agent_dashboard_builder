"""
analyze_columns.py — Detect column types, unique values, nulls, and samples.

Reads: /tmp/data.json (array of objects)
Writes: /tmp/analyze_columns_result.json

Column types: numeric, categorical, date, currency, percentage, text
"""

import json
import sys
import re
import pandas as pd
import numpy as np

INPUT_PATH = "/tmp/data.json"
OUTPUT_PATH = "/tmp/analyze_columns_result.json"

CURRENCY_PATTERNS = re.compile(r'(eur|usd|\$|€|£|revenue|chiffre|ca_|montant|prix|cost|cout|budget|salaire|depense|recette)', re.IGNORECASE)
PERCENTAGE_PATTERNS = re.compile(r'(taux|ratio|percent|pourcentage|marge|part_|share|conversion|croissance|evolution)', re.IGNORECASE)


def detect_column_type(series, col_name):
    """Detect the type of a pandas Series."""
    non_null = series.dropna()
    if len(non_null) == 0:
        return "text"

    # Check if already numeric
    if pd.api.types.is_numeric_dtype(series):
        # Check column name for currency/percentage hints
        if CURRENCY_PATTERNS.search(col_name):
            return "currency"
        if PERCENTAGE_PATTERNS.search(col_name):
            return "percentage"
        return "numeric"

    # Try to convert to numeric
    str_values = non_null.astype(str)
    cleaned = str_values.str.replace(r'[€$£%\s,]', '', regex=True).str.replace(',', '.')
    try:
        pd.to_numeric(cleaned, errors='raise')
        # Check for % or currency symbols in original values
        if str_values.str.contains('%').any() or PERCENTAGE_PATTERNS.search(col_name):
            return "percentage"
        if str_values.str.contains(r'[€$£]', regex=True).any() or CURRENCY_PATTERNS.search(col_name):
            return "currency"
        return "numeric"
    except (ValueError, TypeError):
        pass

    # Try to parse as dates
    try:
        pd.to_datetime(non_null, infer_datetime_format=True, dayfirst=True)
        return "date"
    except (ValueError, TypeError, pd.errors.ParserError):
        pass

    # Check for month names (French + English)
    month_names_fr = {'janvier', 'fevrier', 'février', 'mars', 'avril', 'mai', 'juin',
                      'juillet', 'aout', 'août', 'septembre', 'octobre', 'novembre', 'decembre', 'décembre',
                      'jan', 'fev', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aou', 'sep', 'oct', 'nov', 'dec', 'déc'}
    month_names_en = {'january', 'february', 'march', 'april', 'may', 'june',
                      'july', 'august', 'september', 'october', 'november', 'december'}
    all_months = month_names_fr | month_names_en

    lower_values = set(str_values.str.lower().str.strip())
    if lower_values and lower_values.issubset(all_months):
        return "date"

    # Check quarter patterns
    quarter_pattern = re.compile(r'^[QqTt][1-4]', re.IGNORECASE)
    if all(quarter_pattern.match(str(v).strip()) for v in non_null if str(v).strip()):
        return "date"

    # Categorical vs text: low unique ratio = categorical
    n_unique = non_null.nunique()
    n_total = len(non_null)
    if n_unique <= 20 or (n_total > 5 and n_unique / n_total < 0.3):
        return "categorical"

    return "text"


def analyze(data):
    df = pd.DataFrame(data)
    columns = []

    for col in df.columns:
        series = df[col]
        col_type = detect_column_type(series, col)
        non_null = series.dropna()

        unique_values = non_null.unique().tolist()
        # Limit sample sizes for JSON output
        unique_sample = [str(v) for v in unique_values[:10]]

        columns.append({
            "name": col,
            "type": col_type,
            "nullCount": int(series.isnull().sum()),
            "totalCount": len(series),
            "uniqueCount": len(unique_values),
            "uniqueSample": unique_sample,
            "sample": [str(v) for v in non_null.head(5).tolist()]
        })

    return columns


if __name__ == "__main__":
    with open(INPUT_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    result = analyze(data)

    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(json.dumps(result, ensure_ascii=False, indent=2))
