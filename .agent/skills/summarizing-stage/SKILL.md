---
name: summarizing-stage
description: Generates detailed periodic summaries and documentation after completing development stages. Ensures project tracking, impact analysis, and knowledge management.
---

# Stage Summary & Documentation

## When to use this skill
- When completing a major feature or milestone.
- When the user asks to "summarize what we did".
- Before closing a session or switching context.

## Workflow
1.  **Audit Context**: Review Git log, file changes, and implemented features.
2.  **Analyze Impact**: Identify breaking changes, deprecated functions, or new dependencies.
3.  **Compile Statistics**: Count modified files, tests passed/failed.
4.  **Draft Summaries**:
    -   Functional Changes (New/Fixed/Optimized).
    -   Technical Debt/Roadmap.
5.  **Save**: Write to `docs/stage_summaries/NNN_title.md`.

## Instructions
**Documentation Checklist**
- [ ] **File Stats**: List added/modified/deleted files.
- [ ] **Functional**: Clearly distinguish "New Feature" vs "Bug Fix".
- [ ] **Impact**: Explicitly state if downstream modules are affected.
- [ ] **QA Status**: Summary of test results.

**Formatting Standards**
-   **Path**: `docs/stage_summaries/`
-   **Naming**: `SEQ_Description.md` (e.g., `001_auth_refactor.md`).
-   **Content**: Keep it structured (see Template).

**Output Template**
```markdown
# [Title] Stage Summary

## 1. Changes Overview
- **Implemented**: [Feature A], [Feature B]
- **Fixed**: [Bug #123]

## 2. File Impact
- `src/auth.ts` (Modified)
- `tests/auth_test.ts` (Created)

## 3. QA Report
- ✅ All Unit Tests Passed
- ⚠️ Integration Test flaky (Ticket #456)

## 4. Next Steps / Roadmap
- [ ] Refactor legacy User model
- [ ] Add caching
```
