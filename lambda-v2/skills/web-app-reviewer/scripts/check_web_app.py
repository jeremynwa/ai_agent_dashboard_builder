#!/usr/bin/env python3
"""
check_web_app.py — Static analysis for any web application
Usage: python check_web_app.py /path/to/webapp/

Checks for:
- Hardcoded secrets / API keys
- Dangerous JavaScript patterns (eval, innerHTML, document.write)
- Development artifacts (console.log, debugger, alert, TODO/FIXME)
- Missing error handling in async functions
- Insecure patterns (dangerouslySetInnerHTML, href="javascript:")
- Large files
"""

import sys
import os
import re
import json

def check_file(filepath, content):
    issues = []
    lines = content.splitlines()
    rel_path = filepath

    # --- CRITICAL: Hardcoded secrets ---
    secret_patterns = [
        (r'(?i)(api[_-]?key|apikey|secret[_-]?key|access[_-]?token|password|passwd|private[_-]?key)\s*[:=]\s*["\'][A-Za-z0-9+/=_\-]{8,}["\']', 'HARDCODED_SECRET', 'Potential hardcoded secret — use environment variables'),
        (r'(?i)(sk-[A-Za-z0-9]{32,}|AKIA[A-Z0-9]{16}|ghp_[A-Za-z0-9]{36})', 'EXPOSED_KEY', 'Looks like an API key or token hardcoded in source'),
    ]
    for pattern, rule, msg in secret_patterns:
        for i, line in enumerate(lines, 1):
            if re.search(pattern, line) and 'process.env' not in line and 'import.meta.env' not in line:
                issues.append({'severity': 'critical', 'rule': rule, 'file': rel_path, 'line': i, 'message': msg, 'fix': 'Replace with process.env.YOUR_VAR or import.meta.env.VITE_YOUR_VAR'})

    # --- CRITICAL: eval() ---
    for i, line in enumerate(lines, 1):
        stripped = line.strip()
        if re.search(r'\beval\s*\(', stripped) and not stripped.startswith('//'):
            issues.append({'severity': 'critical', 'rule': 'EVAL_USAGE', 'file': rel_path, 'line': i, 'message': 'eval() is a security risk — enables code injection attacks', 'fix': 'Replace eval() with JSON.parse() or a safe alternative'})

    # --- CRITICAL: innerHTML assignment (not reading) ---
    for i, line in enumerate(lines, 1):
        if re.search(r'\.innerHTML\s*=', line) and not line.strip().startswith('//'):
            issues.append({'severity': 'critical', 'rule': 'UNSAFE_INNERHTML', 'file': rel_path, 'line': i, 'message': 'Direct innerHTML assignment can cause XSS — sanitize user content', 'fix': 'Use textContent for plain text, or DOMPurify.sanitize() for HTML'})

    # --- CRITICAL: dangerouslySetInnerHTML without sanitization ---
    for i, line in enumerate(lines, 1):
        if 'dangerouslySetInnerHTML' in line and 'DOMPurify' not in content and 'sanitize' not in content.lower():
            issues.append({'severity': 'critical', 'rule': 'DANGEROUS_HTML', 'file': rel_path, 'line': i, 'message': 'dangerouslySetInnerHTML used without sanitization — XSS risk', 'fix': 'Wrap with DOMPurify.sanitize() or use textContent'})
            break  # Only report once per file

    # --- CRITICAL: document.write ---
    for i, line in enumerate(lines, 1):
        if re.search(r'\bdocument\.write\s*\(', line) and not line.strip().startswith('//'):
            issues.append({'severity': 'critical', 'rule': 'DOCUMENT_WRITE', 'file': rel_path, 'line': i, 'message': 'document.write() overwrites the entire page and is an XSS vector', 'fix': 'Use DOM manipulation (appendChild, innerHTML with sanitization) instead'})

    # --- HIGH: href="javascript:" ---
    for i, line in enumerate(lines, 1):
        if re.search(r'href\s*=\s*["\']javascript:', line, re.IGNORECASE):
            issues.append({'severity': 'high', 'rule': 'JAVASCRIPT_HREF', 'file': rel_path, 'line': i, 'message': 'href="javascript:..." is an XSS vector', 'fix': 'Use onClick handler or a proper link with "#" and e.preventDefault()'})

    # --- HIGH: .catch() missing on promises ---
    async_calls = [i+1 for i, line in enumerate(lines) if re.search(r'\.then\s*\(', line)]
    for line_no in async_calls:
        # Check if there's a .catch nearby (within 5 lines)
        nearby = '\n'.join(lines[line_no-1:min(line_no+5, len(lines))])
        if '.catch' not in nearby and 'try' not in '\n'.join(lines[max(0,line_no-3):line_no]):
            issues.append({'severity': 'high', 'rule': 'MISSING_CATCH', 'file': rel_path, 'line': line_no, 'message': 'Promise .then() without .catch() — unhandled rejections crash the app', 'fix': 'Add .catch(err => console.error(err)) or use try/catch with async/await'})
            break  # Limit to 1 per file to avoid noise

    # --- MEDIUM: console.log / console.error left in ---
    console_count = 0
    for i, line in enumerate(lines, 1):
        stripped = line.strip()
        if re.search(r'\bconsole\.(log|warn|error|debug|info)\s*\(', stripped) and not stripped.startswith('//'):
            console_count += 1
    if console_count > 0:
        issues.append({'severity': 'medium', 'rule': 'CONSOLE_STATEMENTS', 'file': rel_path, 'line': 0, 'message': f'{console_count} console statement(s) found — remove before production deployment', 'fix': 'Remove console.log statements or replace with a proper logging library'})

    # --- MEDIUM: debugger statement ---
    for i, line in enumerate(lines, 1):
        if re.search(r'\bdebugger\b', line.strip()) and not line.strip().startswith('//'):
            issues.append({'severity': 'medium', 'rule': 'DEBUGGER_STATEMENT', 'file': rel_path, 'line': i, 'message': 'debugger statement left in production code — pauses execution in DevTools', 'fix': 'Remove all debugger statements'})

    # --- MEDIUM: alert() / confirm() / prompt() ---
    for i, line in enumerate(lines, 1):
        stripped = line.strip()
        if re.search(r'\b(alert|confirm|prompt)\s*\(', stripped) and not stripped.startswith('//'):
            issues.append({'severity': 'medium', 'rule': 'BROWSER_DIALOG', 'file': rel_path, 'line': i, 'message': 'Browser dialog (alert/confirm/prompt) — poor UX in production apps', 'fix': 'Replace with a proper modal/dialog component'})
            break

    # --- MEDIUM: TODO/FIXME/HACK in code ---
    todo_count = sum(1 for line in lines if re.search(r'\b(TODO|FIXME|HACK|XXX)\b', line))
    if todo_count >= 3:
        issues.append({'severity': 'medium', 'rule': 'TODO_COMMENTS', 'file': rel_path, 'line': 0, 'message': f'{todo_count} TODO/FIXME comments found — unresolved technical debt', 'fix': 'Resolve or create tickets for all TODO/FIXME items before deployment'})

    # --- LOW: Large file ---
    if len(lines) > 600:
        issues.append({'severity': 'low', 'rule': 'LARGE_FILE', 'file': rel_path, 'line': 0, 'message': f'File has {len(lines)} lines — consider splitting into smaller modules', 'fix': 'Break into sub-components or separate utility files'})

    # --- LOW: Missing key prop in map() for React ---
    if filepath.endswith(('.jsx', '.tsx')):
        for i, line in enumerate(lines, 1):
            if re.search(r'\.map\s*\(\s*[\w(]', line) and 'key=' not in line:
                # Check a few lines ahead for key prop
                nearby = '\n'.join(lines[i-1:min(i+3, len(lines))])
                if 'key=' not in nearby:
                    issues.append({'severity': 'low', 'rule': 'MISSING_KEY_PROP', 'file': rel_path, 'line': i, 'message': 'Array .map() without key prop — React warning and potential rendering issues', 'fix': 'Add key={item.id} or key={index} to the outermost element returned from map()'})
                    break

    return issues


def main():
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Usage: check_web_app.py <directory>'}))
        sys.exit(1)

    webapp_dir = sys.argv[1]
    if not os.path.exists(webapp_dir):
        print(json.dumps({'error': f'Directory not found: {webapp_dir}'}))
        sys.exit(1)

    # File extensions to check
    CODE_EXTENSIONS = {'.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.vue', '.svelte', '.html'}
    # Directories to skip
    SKIP_DIRS = {'node_modules', '.git', 'dist', 'build', '.next', '__pycache__', 'coverage'}

    all_issues = []
    files_checked = 0

    for root, dirs, files in os.walk(webapp_dir):
        # Skip ignored directories
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]

        for filename in files:
            ext = os.path.splitext(filename)[1].lower()
            if ext not in CODE_EXTENSIONS:
                continue

            filepath = os.path.join(root, filename)
            rel_path = os.path.relpath(filepath, webapp_dir)

            try:
                with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
                    content = f.read()
                issues = check_file(rel_path, content)
                all_issues.extend(issues)
                files_checked += 1
            except Exception as e:
                all_issues.append({'severity': 'low', 'rule': 'READ_ERROR', 'file': rel_path, 'line': 0, 'message': f'Could not read file: {e}', 'fix': 'Ensure file is valid UTF-8 encoded text'})

    output = {
        'files_checked': files_checked,
        'total_issues': len(all_issues),
        'critical': sum(1 for i in all_issues if i['severity'] == 'critical'),
        'high': sum(1 for i in all_issues if i['severity'] == 'high'),
        'medium': sum(1 for i in all_issues if i['severity'] == 'medium'),
        'low': sum(1 for i in all_issues if i['severity'] == 'low'),
        'issues': all_issues,
    }

    print(json.dumps(output, indent=2))


if __name__ == '__main__':
    main()
