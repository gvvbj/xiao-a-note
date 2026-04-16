---
name: writing-plans
description: Generates comprehensive implementation plans with bite-sized tasks, TDD steps, and exact file paths. Use when you have a spec and need a detailed plan before coding.
---

# Writing Implementation Plans

## When to use this skill
- When you have a clear design or spec and are ready to implement.
- When the user asks for a "plan" or "implementation steps".
- Before writing complex code, to ensure a TDD approach.

## Workflow
1.  **Initialize Plan**: Create a header with Goal, Architecture, and Tech Stack.
2.  **Break Down Tasks**: specific atomic tasks (2-5 mins execution time).
3.  **Define Steps per Task**:
    -   Write failing test.
    -   Run test (fail).
    -   Write minimal code.
    -   Run test (pass).
    -   Commit.
4.  **Review & Save**: Save to `docs/plans/YYYY-MM-DD-feature.md`.

## Instructions
**Task Granularity**
-   Each task must be "bite-sized".
-   Assume the executor has zero context.
-   **DRY, YAGNI, TDD** are the governing laws.

**Plan Structure (Template)**
```markdown
### Task N: [Component Name]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

**Step 1: Write the failing test**
[Code snippet]

**Step 2: Run test to verify it fails**
Command: `[test command]`
Expected: FAIL

**Step 3: Write minimal implementation**
[Code snippet]

**Step 4: Run test to verify it passes**
Command: `[test command]`
Expected: PASS

**Step 5: Commit**
Command: `git commit -m "..."`
```

**Critical Rules**
-   **Exact Paths**: Never use placeholders like `path/to/file`. Use real paths.
-   **Complete Code**: Provide the actual code to be written, not just comments.
-   **Verification**: Every step must have a verification command.

## Resources
-   [Reference: Original Superpowers Spec](https://github.com/obra/superpowers/tree/main/skills/writing-plans)
