"""
compute_stats.py — Compute statistics per column.

Reads: /tmp/data.json + /tmp/analyze_columns_result.json + /tmp/detect_periods_result.json
Writes: /tmp/compute_stats_result.json

Numeric columns: min, max, mean, median, sum, stddev, quartiles, period values.
Categorical columns: value counts, top value.
"""

import json
import re
import pandas as pd
import numpy as np

INPUT_PATH = "/tmp/data.json"
COLUMNS_PATH = "/tmp/analyze_columns_result.json"
PERIODS_PATH = "/tmp/detect_periods_result.json"
OUTPUT_PATH = "/tmp/compute_stats_result.json"


def clean_numeric(series):
    """Try to convert a series to numeric, stripping currency/percentage symbols."""
    if pd.api.types.is_numeric_dtype(series):
        return series.astype(float)
    cleaned = series.astype(str).str.replace(r'[€$£%\s]', '', regex=True).str.replace(',', '.')
    return pd.to_numeric(cleaned, errors='coerce')


def compute_numeric_stats(series, col_info, df, periods_info):
    """Compute stats for a numeric/currency/percentage column."""
    numeric = clean_numeric(series).dropna()
    if len(numeric) == 0:
        return {"error": "no numeric values"}

    stats = {
        "min": round(float(numeric.min()), 2),
        "max": round(float(numeric.max()), 2),
        "mean": round(float(numeric.mean()), 2),
        "median": round(float(numeric.median()), 2),
        "sum": round(float(numeric.sum()), 2),
        "stddev": round(float(numeric.std()), 2) if len(numeric) > 1 else 0,
        "count": int(len(numeric)),
        "quartiles": {
            "Q1": round(float(numeric.quantile(0.25)), 2),
            "Q2": round(float(numeric.quantile(0.50)), 2),
            "Q3": round(float(numeric.quantile(0.75)), 2),
        }
    }

    # If periods exist, compute per-period values (for sparklines and variations)
    if periods_info.get("hasPeriods") and periods_info.get("periodColumn"):
        period_col = periods_info["periodColumn"]
        if period_col in df.columns:
            period_values = []
            for period in periods_info.get("periods", []):
                mask = df[period_col].astype(str).str.lower().str.strip() == str(period).lower().strip()
                period_data = clean_numeric(df.loc[mask, col_info["name"]]).dropna()
                val = round(float(period_data.sum()), 2) if len(period_data) > 0 else 0
                period_values.append({"period": str(period), "value": val})

            stats["periodValues"] = period_values

            # Compute variation (last vs first period)
            if len(period_values) >= 2 and periods_info.get("canCompare"):
                first_val = period_values[0]["value"]
                last_val = period_values[-1]["value"]
                if first_val != 0:
                    variation = round(((last_val - first_val) / abs(first_val)) * 100, 1)
                    stats["variation"] = {
                        "firstPeriod": period_values[0]["period"],
                        "lastPeriod": period_values[-1]["period"],
                        "firstValue": first_val,
                        "lastValue": last_val,
                        "changePercent": variation
                    }

    return stats


def compute_categorical_stats(series):
    """Compute stats for a categorical column."""
    non_null = series.dropna()
    value_counts = non_null.value_counts()

    return {
        "uniqueCount": int(non_null.nunique()),
        "topValue": str(value_counts.index[0]) if len(value_counts) > 0 else None,
        "topCount": int(value_counts.iloc[0]) if len(value_counts) > 0 else 0,
        "valueCounts": [
            {"value": str(val), "count": int(cnt)}
            for val, cnt in value_counts.head(15).items()
        ]
    }


def compute(data, columns_info, periods_info):
    df = pd.DataFrame(data)
    stats = {}

    for col_info in columns_info:
        col_name = col_info["name"]
        col_type = col_info["type"]

        if col_name not in df.columns:
            continue

        series = df[col_name]

        if col_type in ("numeric", "currency", "percentage"):
            stats[col_name] = {
                "type": col_type,
                **compute_numeric_stats(series, col_info, df, periods_info)
            }
        elif col_type == "categorical":
            stats[col_name] = {
                "type": "categorical",
                **compute_categorical_stats(series)
            }
        elif col_type == "date":
            # For date columns, just report unique periods
            stats[col_name] = {
                "type": "date",
                "uniqueCount": int(series.nunique()),
                "sample": [str(v) for v in series.dropna().unique()[:10]]
            }

    return stats


if __name__ == "__main__":
    with open(INPUT_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    with open(COLUMNS_PATH, 'r', encoding='utf-8') as f:
        columns_info = json.load(f)

    with open(PERIODS_PATH, 'r', encoding='utf-8') as f:
        periods_info = json.load(f)

    result = compute(data, columns_info, periods_info)

    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(json.dumps(result, ensure_ascii=False, indent=2))
