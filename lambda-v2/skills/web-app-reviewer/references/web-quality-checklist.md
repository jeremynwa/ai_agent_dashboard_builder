# Web App Quality Checklist

Use this checklist after running the automated checks to catch issues the script cannot detect.

## 1. Error Handling & Resilience

- [ ] All `fetch()` / `axios` calls have try/catch or .catch()
- [ ] API errors display user-friendly messages (not raw error objects)
- [ ] Loading states shown during async operations (spinner/skeleton)
- [ ] Empty states handled (no data yet — show a message, not a blank screen)
- [ ] Network errors handled gracefully (offline detection, retry logic)

## 2. State Management

- [ ] No prop drilling more than 3 levels deep (use context or state manager)
- [ ] State updates are immutable (not mutating arrays/objects directly)
- [ ] No stale closure issues in useEffect dependencies
- [ ] useEffect cleanup functions where needed (event listeners, timers, subscriptions)

## 3. Performance

- [ ] Large lists use virtualization (react-window, react-virtual) if > 100 items
- [ ] Images have explicit width/height to prevent layout shift
- [ ] Heavy computations wrapped in useMemo/useCallback
- [ ] No unnecessary re-renders (check with React DevTools)
- [ ] Bundle splitting for large dependencies (dynamic import())

## 4. Accessibility

- [ ] All interactive elements are keyboard-accessible
- [ ] Form inputs have associated labels (htmlFor/aria-label)
- [ ] Color contrast meets WCAG AA (4.5:1 for text)
- [ ] Images have alt text
- [ ] Modal/dialog focus management (focus trap, escape to close)

## 5. Security (Manual Check)

- [ ] No user-controlled values injected into SQL queries (even via API calls)
- [ ] CORS headers on API calls are not * in production
- [ ] Sensitive data not logged to console
- [ ] Authentication tokens stored in memory or httpOnly cookies (not localStorage for sensitive apps)
- [ ] No server-side secrets in client bundle (check .env.local vs .env)

## 6. Code Quality

- [ ] No duplicate code blocks (> 15 lines repeated in 2+ places → extract function)
- [ ] Functions/components do one thing (< 50 lines ideally)
- [ ] No magic numbers/strings — use named constants
- [ ] Consistent naming conventions throughout
- [ ] No commented-out code blocks > 5 lines (use version control instead)

## 7. React-Specific

- [ ] Component files < 300 lines (split if larger)
- [ ] Custom hooks extract reusable logic (not repeated useEffect patterns)
- [ ] Context providers don't wrap the entire app unnecessarily
- [ ] Keys in lists are stable IDs (not array indices when list can reorder)
- [ ] No direct DOM manipulation with refs when state would suffice

## 8. API & Data

- [ ] API base URL comes from environment variable
- [ ] Request headers (Content-Type, Authorization) set correctly
- [ ] Responses validated before use (check for null/undefined)
- [ ] Pagination implemented for large datasets (not loading all records)
- [ ] API calls debounced on user input (not firing on every keystroke)

## Severity Guide

- **Critical**: Security vulnerability, data loss risk, complete app failure
- **High**: Poor UX, broken feature, significant performance issue
- **Medium**: Warning, tech debt, minor UX issue
- **Low**: Style, suggestion, nice-to-have improvement
