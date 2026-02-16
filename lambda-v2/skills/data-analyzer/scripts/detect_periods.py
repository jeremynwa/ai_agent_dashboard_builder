"""
detect_periods.py — Detect temporal columns and determine period comparability.

Reads: /tmp/data.json + /tmp/analyze_columns_result.json
Writes: /tmp/detect_periods_result.json

Detects: monthly, quarterly, yearly, daily, weekly periods.
"""

import json
import re
import pandas as pd

INPUT_PATH = "/tmp/data.json"
COLUMNS_PATH = "/tmp/analyze_columns_result.json"
OUTPUT_PATH = "/tmp/detect_periods_result.json"

MONTH_NAMES_FR = {
    'janvier': 1, 'fevrier': 2, 'février': 2, 'mars': 3, 'avril': 4,
    'mai': 5, 'juin': 6, 'juillet': 7, 'aout': 8, 'août': 8,
    'septembre': 9, 'octobre': 10, 'novembre': 11, 'decembre': 12, 'décembre': 12,
    'jan': 1, 'fev': 2, 'fév': 2, 'mar': 3, 'avr': 4,
    'jun': 6, 'jul': 7, 'aou': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12, 'déc': 12
}

MONTH_NAMES_EN = {
    'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
    'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12
}

ALL_MONTHS = {**MONTH_NAMES_FR, **MONTH_NAMES_EN}

QUARTER_MAP = {'q1': 1, 'q2': 2, 'q3': 3, 'q4': 4, 't1': 1, 't2': 2, 't3': 3, 't4': 4}


def detect_month_names(values):
    """Check if values are month names (FR or EN)."""
    lower_vals = [str(v).lower().strip() for v in values if pd.notna(v)]
    matches = [v for v in lower_vals if v in ALL_MONTHS]
    if len(matches) >= 2 and len(matches) / len(lower_vals) > 0.8:
        ordered = sorted(set(lower_vals), key=lambda x: ALL_MONTHS.get(x, 99))
        return {
            "detected": True,
            "periodType": "monthly",
            "periods": ordered,
            "periodCount": len(set(matches))
        }
    return None


def detect_quarters(values):
    """Check if values are quarters (Q1-Q4 or T1-T4)."""
    pattern = re.compile(r'^[QqTt]([1-4])(?:\s*\d{4})?$')
    str_vals = [str(v).strip() for v in values if pd.notna(v)]
    matches = [v for v in str_vals if pattern.match(v)]
    if len(matches) >= 2 and len(matches) / len(str_vals) > 0.8:
        return {
            "detected": True,
            "periodType": "quarterly",
            "periods": sorted(set(str_vals)),
            "periodCount": len(set(matches))
        }
    return None


def detect_datetime_period(series):
    """Detect period type from a datetime series."""
    try:
        dates = pd.to_datetime(series.dropna(), infer_datetime_format=True, dayfirst=True)
        if len(dates) < 2:
            return None

        dates_sorted = dates.sort_values()
        diffs = dates_sorted.diff().dropna()
        median_days = diffs.dt.days.median()

        if median_days <= 1.5:
            period_type = "daily"
        elif median_days <= 8:
            period_type = "weekly"
        elif median_days <= 35:
            period_type = "monthly"
        elif median_days <= 100:
            period_type = "quarterly"
        else:
            period_type = "yearly"

        return {
            "detected": True,
            "periodType": period_type,
            "periods": [str(d.date()) for d in dates_sorted.unique()],
            "periodCount": len(dates_sorted.unique())
        }
    except Exception:
        return None


def detect(data, columns_info):
    df = pd.DataFrame(data)

    # Find date-type columns from analyze_columns result
    date_columns = [c["name"] for c in columns_info if c["type"] == "date"]
    # Also check categorical columns that might be month names or quarters
    categorical_columns = [c["name"] for c in columns_info if c["type"] == "categorical"]

    results = []

    for col_name in date_columns + categorical_columns:
        if col_name not in df.columns:
            continue

        values = df[col_name].dropna().tolist()
        if len(values) < 2:
            continue

        # Try month names
        month_result = detect_month_names(values)
        if month_result:
            month_result["column"] = col_name
            results.append(month_result)
            continue

        # Try quarters
        quarter_result = detect_quarters(values)
        if quarter_result:
            quarter_result["column"] = col_name
            results.append(quarter_result)
            continue

        # Try datetime parsing (for date-typed columns)
        if col_name in date_columns:
            dt_result = detect_datetime_period(df[col_name])
            if dt_result:
                dt_result["column"] = col_name
                results.append(dt_result)

    # Pick the best period column (most periods, prefer monthly > quarterly > yearly)
    if not results:
        return {
            "hasPeriods": False,
            "periodColumn": None,
            "periodType": None,
            "canCompare": False,
            "periods": [],
            "allDetected": []
        }

    # Sort: most periods first
    results.sort(key=lambda r: r["periodCount"], reverse=True)
    best = results[0]

    return {
        "hasPeriods": True,
        "periodColumn": best["column"],
        "periodType": best["periodType"],
        "canCompare": best["periodCount"] >= 2,
        "periods": best["periods"],
        "allDetected": [{"column": r["column"], "periodType": r["periodType"], "periodCount": r["periodCount"]} for r in results]
    }


if __name__ == "__main__":
    with open(INPUT_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    with open(COLUMNS_PATH, 'r', encoding='utf-8') as f:
        columns_info = json.load(f)

    result = detect(data, columns_info)

    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(json.dumps(result, ensure_ascii=False, indent=2))
