#!/usr/bin/env python3
"""
Static quality checks for React dashboard code (App.jsx).

Usage: python check_code.py <file.jsx>
   or: echo '<code>' | python check_code.py -

Returns JSON with errors, warnings, passed/failed counts.
"""

import json
import re
import sys


def check_code(code):
    errors = []
    warnings = []
    checks_passed = 0
    checks_failed = 0

    def check(condition, message, is_error=True):
        nonlocal checks_passed, checks_failed
        if condition:
            checks_passed += 1
        else:
            checks_failed += 1
            if is_error:
                errors.append(message)
            else:
                warnings.append(message)

    # 1. React import
    check(
        "import React" in code or "import {" in code,
        "Missing React import",
        is_error=False,
    )

    # 2. Recharts imports when charts are used
    chart_components = ["PieChart", "BarChart", "AreaChart", "LineChart", "RadarChart"]
    has_charts = any(comp in code for comp in chart_components)

    if has_charts:
        check(
            "from 'recharts'" in code or 'from "recharts"' in code,
            "Charts used but no recharts import",
        )

        # 3. ResponsiveContainer
        check(
            "ResponsiveContainer" in code,
            "Charts used without ResponsiveContainer import",
            is_error=False,
        )

        # 4. COLORS array
        check(
            "COLORS" in code,
            "Charts used but COLORS array not defined",
            is_error=False,
        )

    # 5. PieChart with Cell + Legend
    if "PieChart" in code and "<Pie" in code:
        check(
            "<Cell" in code,
            "PieChart without <Cell> — all slices will be grey!",
        )
        check(
            "<Legend" in code,
            "PieChart without <Legend> — users cannot identify what each slice represents!",
        )

    # 6. Formatting functions
    has_numbers = re.search(r"\.toFixed\(|\.toLocaleString\(|Number\(", code)
    if has_numbers:
        check(
            re.search(r"\bfmt\b|\bfmtCur\b|\bfmtPct\b", code) is not None,
            "Number formatting detected but no fmt/fmtCur/fmtPct helper defined",
            is_error=False,
        )

    # 7. No emojis
    emoji_pattern = re.compile(
        r"[\U0001F600-\U0001F64F\U0001F300-\U0001F5FF"
        r"\U0001F680-\U0001F6FF\U0001F1E0-\U0001F1FF"
        r"\u2600-\u26FF\u2700-\u27BF]"
    )
    check(
        not emoji_pattern.search(code),
        "Code contains emojis — forbidden in dashboard output",
    )

    # 8. No ds.css import (already in main.jsx)
    check(
        not re.search(r"""import\s+['"].*ds\.css['"]""", code),
        "App.jsx imports ds.css — forbidden (already in main.jsx)",
    )

    # 9. SVG gradient ID uniqueness
    gradient_ids = re.findall(r'id=["\']([^"\']+Grad[^"\']*)["\']', code)
    if gradient_ids:
        check(
            len(gradient_ids) == len(set(gradient_ids)),
            f"Duplicate SVG gradient IDs: {[x for x in gradient_ids if gradient_ids.count(x) > 1]}",
        )

    # 10. Insight/Key Takeaways section
    check(
        "insight-item" in code or "insight-bar" in code or "key-takeaway" in code or "Points cl" in code,
        "Missing 'Points cles' / insights section — OBLIGATOIRE en bas de Vue d'Ensemble",
    )

    # 11. Filter select styling
    has_filters = "<select" in code
    if has_filters:
        check(
            "background" in code and "#1A2332" in code,
            "Filter <select> missing required dark background styling (background:'#1A2332')",
        )

    # 12. No raw IDs as chart axes
    id_datakeys = re.findall(
        r'dataKey=["\'](\w*(?:_id|Id|_ID|ID)\w*)["\']', code
    )
    check(
        len(id_datakeys) == 0,
        f"Raw ID columns used as chart dataKey: {id_datakeys} — use names/categories instead",
    )

    # 13. Content-area wrapper
    check(
        "content-area" in code,
        "Missing 'content-area' wrapper class — required for proper layout",
        is_error=False,
    )

    # 14. Drawer/hamburger pattern
    check(
        "drawer" in code.lower() or "hamburger" in code.lower() or "menuOpen" in code,
        "Missing drawer/hamburger menu pattern",
        is_error=False,
    )

    # 15. Fabrication keywords — PROMOTED TO ERROR
    fabrication_keywords = [
        "Precedent", "Previous", "Objectif", "Target",
        "Last Year", "Annee derniere", "Budget",
    ]
    found_fabrication = []
    for kw in fabrication_keywords:
        if re.search(kw, code, re.IGNORECASE):
            found_fabrication.append(kw)
    if found_fabrication:
        errors.append(
            f"Fabrication keywords detected: {found_fabrication} — these comparisons require data columns that likely don't exist. Remove or compute from real data."
        )

    # 16. Hardcoded numbers in insight/takeaway strings
    # Detect: text: "Le CA est de 1.5M EUR" or text: "augmentation de 15.3%"
    insight_hardcoded = re.findall(
        r"""(?:text|insight|takeaway)\s*[:=]\s*["'][^"']*\d+[.,]?\d*\s*(?:%|EUR|K|M|\u20ac|\$)[^"']*["']""",
        code,
    )
    if insight_hardcoded:
        check(
            False,
            f"Hardcoded numbers in insights/takeaways: {insight_hardcoded[:3]} — insights must use template literals with computed values (useMemo + backticks)",
        )
    else:
        checks_passed += 1

    # 17. Static takeaways array (not using useMemo)
    has_takeaways = re.search(r"(?:takeaways|insights)\s*=\s*\[", code)
    has_takeaways_memo = re.search(r"(?:takeaways|insights)\s*=\s*useMemo\s*\(", code)
    if has_takeaways and ("insight-item" in code or "insight-bar" in code):
        check(
            has_takeaways_memo is not None,
            "takeaways/insights array is statically defined — must use useMemo(() => { ...compute... }, []) with template literals",
        )

    # 18. Hardcoded percentages in badge-up/badge-down context
    badge_hardcoded = re.findall(
        r"""badge-(?:up|down)[^>]*>\s*[+-]?\d+[.,]?\d*\s*%""",
        code,
    )
    check(
        len(badge_hardcoded) == 0,
        f"Hardcoded percentages in badges: {badge_hardcoded[:3]} — variation badges must display computed values",
    )

    # 19. Hardcoded large numbers in kpi-value spans
    # Detect: className="kpi-value">1,523,456 or kpi-value">{1523456}
    kpi_hardcoded = re.findall(
        r"""kpi-value[^>]*>\s*\{?\s*["']?[\d,]{4,}\.?\d*["']?\s*\}?\s*<""",
        code,
    )
    check(
        len(kpi_hardcoded) == 0,
        f"Hardcoded numbers in KPI values: {len(kpi_hardcoded)} instances — KPI values must be computed expressions (e.g., {{fmtCur(total)}})",
    )

    return {
        "errors": errors,
        "warnings": warnings,
        "passed": checks_passed,
        "failed": checks_failed,
    }


def main():
    if len(sys.argv) < 2:
        print("Usage: python check_code.py <file.jsx>")
        print("   or: echo '<code>' | python check_code.py -")
        sys.exit(1)

    try:
        if sys.argv[1] == "-":
            code = sys.stdin.read()
        else:
            with open(sys.argv[1], "r", encoding="utf-8") as f:
                code = f.read()
    except FileNotFoundError:
        print(json.dumps({"errors": [f"File {sys.argv[1]} not found"], "warnings": [], "passed": 0, "failed": 1}))
        sys.exit(1)

    result = check_code(code)
    print(json.dumps(result, indent=2))
    sys.exit(1 if result["errors"] else 0)


if __name__ == "__main__":
    main()
