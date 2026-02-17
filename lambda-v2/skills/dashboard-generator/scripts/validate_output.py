#!/usr/bin/env python3
"""
Validate dashboard generator JSON output for common errors.

Usage: python validate_output.py <output.json>
Or:    echo '{"files": {...}}' | python validate_output.py -
"""

import json
import re
import sys


def validate_output(output_json):
    errors = []
    warnings = []

    # 1. Check JSON structure
    if not isinstance(output_json, dict):
        errors.append("Output must be a JSON object")
        return errors, warnings

    if "files" not in output_json:
        errors.append("Output must have 'files' key")
        return errors, warnings

    files = output_json["files"]

    if not isinstance(files, dict):
        errors.append("'files' must be an object")
        return errors, warnings

    # 2. Check required files
    if "src/App.jsx" not in files:
        errors.append("Missing required file: src/App.jsx")

    # 3. Validate App.jsx content
    if "src/App.jsx" in files:
        app_code = files["src/App.jsx"]

        # Check imports
        if "import React" not in app_code and "import {" not in app_code:
            warnings.append("App.jsx may be missing React import")

        # Check for emojis
        emoji_pattern = re.compile(
            r"[\U0001F600-\U0001F64F\U0001F300-\U0001F5FF"
            r"\U0001F680-\U0001F6FF\U0001F1E0-\U0001F1FF"
            r"\u2600-\u26FF\u2700-\u27BF]"
        )
        if emoji_pattern.search(app_code):
            errors.append("App.jsx contains emojis — forbidden!")

        # Check PieChart without Cell or Legend
        if "PieChart" in app_code and "<Pie" in app_code:
            if "<Cell" not in app_code:
                errors.append("PieChart without <Cell> — all slices will be grey!")
            if "<Legend" not in app_code:
                errors.append("PieChart without <Legend> — users cannot identify slices!")

        # Check COLORS array when charts present
        chart_types = ["PieChart", "BarChart", "AreaChart", "LineChart"]
        has_charts = any(ct in app_code for ct in chart_types)
        if has_charts and "COLORS" not in app_code:
            warnings.append("Charts detected but COLORS array not defined")

        # Check ds.css import (should NOT be in App.jsx)
        if re.search(r"""import\s+['"].*ds\.css['"]""", app_code):
            errors.append("App.jsx imports ds.css — forbidden (already in main.jsx)")

        # Check gradient ID uniqueness (sparklines)
        gradient_ids = re.findall(r'id=["\']([^"\']+Grad[^"\']*)["\']', app_code)
        if len(gradient_ids) != len(set(gradient_ids)):
            errors.append("Duplicate SVG gradient IDs — sparklines need unique IDs")

        # Fabrication keywords — PROMOTED TO ERROR
        fabrication_keywords = [
            r"Precedent", r"Previous", r"Objectif", r"Target",
            r"Last Year", r"Annee derniere", r"Budget"
        ]
        found_fab = []
        for kw in fabrication_keywords:
            if re.search(kw, app_code, re.IGNORECASE):
                found_fab.append(kw)
        if found_fab:
            errors.append(
                f"Fabrication keywords detected: {found_fab} — remove or compute from real data"
            )

        # Hardcoded numbers in insight/takeaway strings
        insight_hardcoded = re.findall(
            r"""(?:text|insight|takeaway)\s*[:=]\s*["'][^"']*\d+[.,]?\d*\s*(?:%|EUR|K|M|\u20ac|\$)[^"']*["']""",
            app_code,
        )
        if insight_hardcoded:
            errors.append(
                f"Hardcoded numbers in insights: {insight_hardcoded[:3]} — use template literals with computed values"
            )

        # Static takeaways without useMemo
        has_takeaways = re.search(r"(?:takeaways|insights)\s*=\s*\[", app_code)
        has_memo = re.search(r"(?:takeaways|insights)\s*=\s*useMemo", app_code)
        if has_takeaways and ("insight-item" in app_code or "insight-bar" in app_code):
            if not has_memo:
                errors.append(
                    "takeaways/insights defined without useMemo — must use useMemo with template literals"
                )

    # 4. Check data.js (Excel mode)
    if "src/data.js" in files:
        data_code = files["src/data.js"]
        if "__INJECT_DATA__" not in data_code:
            errors.append("src/data.js must contain __INJECT_DATA__ placeholder")

    # 5. Check db.js (Database mode)
    if "src/db.js" in files:
        db_code = files["src/db.js"]
        if "__DB_PROXY_URL__" not in db_code:
            errors.append("src/db.js must contain __DB_PROXY_URL__ placeholder")
        if "__DB_CREDENTIALS__" not in db_code:
            errors.append("src/db.js must contain __DB_CREDENTIALS__ placeholder")

    return errors, warnings


def main():
    # Read input
    if len(sys.argv) < 2:
        print("Usage: python validate_output.py <output.json>")
        print("   or: echo '{...}' | python validate_output.py -")
        sys.exit(1)

    try:
        if sys.argv[1] == "-":
            output = json.load(sys.stdin)
        else:
            with open(sys.argv[1], "r", encoding="utf-8") as f:
                output = json.load(f)
    except FileNotFoundError:
        print(f"Error: File {sys.argv[1]} not found")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON — {e}")
        sys.exit(1)

    errors, warnings = validate_output(output)

    if errors:
        print("ERRORS:")
        for err in errors:
            print(f"  [X] {err}")

    if warnings:
        print("WARNINGS:")
        for warn in warnings:
            print(f"  [!] {warn}")

    if not errors and not warnings:
        print("OK — validation passed, no errors or warnings")

    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
