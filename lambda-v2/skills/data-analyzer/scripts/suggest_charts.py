"""
suggest_charts.py — Recommend chart types based on data analysis.

Reads: /tmp/analyze_columns_result.json + /tmp/detect_periods_result.json + /tmp/compute_stats_result.json
Writes: /tmp/suggest_charts_result.json

Recommendations: AreaChart, LineChart, BarChart, PieChart, StackedBarChart, Table
"""

import json

COLUMNS_PATH = "/tmp/analyze_columns_result.json"
PERIODS_PATH = "/tmp/detect_periods_result.json"
STATS_PATH = "/tmp/compute_stats_result.json"
OUTPUT_PATH = "/tmp/suggest_charts_result.json"


def suggest(columns_info, periods_info, stats_info):
    recommendations = []

    # Classify columns
    numeric_cols = [c for c in columns_info if c["type"] in ("numeric", "currency", "percentage")]
    categorical_cols = [c for c in columns_info if c["type"] == "categorical"]
    date_cols = [c for c in columns_info if c["type"] == "date"]

    has_periods = periods_info.get("hasPeriods", False)
    period_col = periods_info.get("periodColumn")
    period_type = periods_info.get("periodType", "")

    # 1. Temporal trends — numeric over time
    if has_periods and period_col and numeric_cols:
        if len(numeric_cols) == 1:
            col = numeric_cols[0]
            recommendations.append({
                "chartType": "AreaChart",
                "xKey": period_col,
                "yKeys": [col["name"]],
                "reason": f"Tendance temporelle de {col['name']} ({period_type})",
                "title": f"Evolution de {col['name']}"
            })
        elif len(numeric_cols) <= 4:
            recommendations.append({
                "chartType": "LineChart",
                "xKey": period_col,
                "yKeys": [c["name"] for c in numeric_cols],
                "reason": f"Comparaison de {len(numeric_cols)} metriques sur {period_type}",
                "title": "Evolution des indicateurs"
            })
        else:
            # Too many — pick top 3 by variance
            sorted_cols = sorted(numeric_cols,
                key=lambda c: stats_info.get(c["name"], {}).get("stddev", 0),
                reverse=True)[:3]
            recommendations.append({
                "chartType": "LineChart",
                "xKey": period_col,
                "yKeys": [c["name"] for c in sorted_cols],
                "reason": f"Top 3 metriques les plus variables sur {period_type}",
                "title": "Indicateurs principaux"
            })

        # Also add AreaChart for the main metric if LineChart was chosen
        if len(numeric_cols) > 1:
            main_col = max(numeric_cols,
                key=lambda c: stats_info.get(c["name"], {}).get("sum", 0))
            recommendations.append({
                "chartType": "AreaChart",
                "xKey": period_col,
                "yKeys": [main_col["name"]],
                "reason": f"Tendance du principal indicateur ({main_col['name']})",
                "title": f"Evolution de {main_col['name']}"
            })

    # 2. Category comparison — BarChart
    if categorical_cols and numeric_cols:
        for cat_col in categorical_cols[:2]:  # max 2 category-based charts
            cat_stats = stats_info.get(cat_col["name"], {})
            unique_count = cat_stats.get("uniqueCount", cat_col.get("uniqueCount", 0))

            if unique_count > 15:
                continue  # too many categories for a chart

            main_numeric = max(numeric_cols,
                key=lambda c: stats_info.get(c["name"], {}).get("sum", 0))

            recommendations.append({
                "chartType": "BarChart",
                "xKey": cat_col["name"],
                "yKeys": [main_numeric["name"]],
                "reason": f"Comparaison de {main_numeric['name']} par {cat_col['name']} ({unique_count} categories)",
                "title": f"{main_numeric['name']} par {cat_col['name']}"
            })

    # 3. PieChart — distribution for low-cardinality categories
    if categorical_cols and numeric_cols:
        for cat_col in categorical_cols[:1]:  # max 1 PieChart
            cat_stats = stats_info.get(cat_col["name"], {})
            unique_count = cat_stats.get("uniqueCount", cat_col.get("uniqueCount", 0))

            if unique_count <= 6:
                main_numeric = max(numeric_cols,
                    key=lambda c: stats_info.get(c["name"], {}).get("sum", 0))
                recommendations.append({
                    "chartType": "PieChart",
                    "xKey": cat_col["name"],
                    "yKeys": [main_numeric["name"]],
                    "reason": f"Repartition de {main_numeric['name']} par {cat_col['name']} ({unique_count} categories, ideal pour PieChart)",
                    "title": f"Repartition par {cat_col['name']}"
                })
            elif unique_count <= 10:
                # Suggest BarChart instead of PieChart for 7-10 categories
                pass  # Already covered by BarChart above

    # 4. Stacked bar — if period + category + numeric
    if has_periods and categorical_cols and numeric_cols:
        cat_col = categorical_cols[0]
        cat_stats = stats_info.get(cat_col["name"], {})
        unique_count = cat_stats.get("uniqueCount", cat_col.get("uniqueCount", 0))

        if unique_count <= 8:
            main_numeric = max(numeric_cols,
                key=lambda c: stats_info.get(c["name"], {}).get("sum", 0))
            recommendations.append({
                "chartType": "StackedBarChart",
                "xKey": period_col,
                "yKeys": [main_numeric["name"]],
                "stackKey": cat_col["name"],
                "reason": f"Composition de {main_numeric['name']} par {cat_col['name']} au fil du temps",
                "title": f"{main_numeric['name']} par {cat_col['name']} ({period_type})"
            })

    # 5. No periods, multiple numerics — grouped bar
    if not has_periods and len(numeric_cols) >= 2 and not categorical_cols:
        recommendations.append({
            "chartType": "BarChart",
            "xKey": numeric_cols[0]["name"],
            "yKeys": [c["name"] for c in numeric_cols[1:4]],
            "reason": "Comparaison directe entre metriques numeriques",
            "title": "Comparaison des indicateurs"
        })

    # 6. Table recommendation — always suggest if there are enough columns
    if len(columns_info) >= 3:
        recommendations.append({
            "chartType": "Table",
            "columns": [c["name"] for c in columns_info],
            "reason": "Vue tabulaire des donnees brutes avec tri et filtrage",
            "title": "Donnees detaillees"
        })

    # Remove duplicates (same chartType + same xKey)
    seen = set()
    unique_recs = []
    for rec in recommendations:
        key = f"{rec['chartType']}_{rec.get('xKey', '')}_{','.join(rec.get('yKeys', []))}"
        if key not in seen:
            seen.add(key)
            unique_recs.append(rec)

    return unique_recs


if __name__ == "__main__":
    with open(COLUMNS_PATH, 'r', encoding='utf-8') as f:
        columns_info = json.load(f)

    with open(PERIODS_PATH, 'r', encoding='utf-8') as f:
        periods_info = json.load(f)

    with open(STATS_PATH, 'r', encoding='utf-8') as f:
        stats_info = json.load(f)

    result = suggest(columns_info, periods_info, stats_info)

    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(json.dumps(result, ensure_ascii=False, indent=2))
