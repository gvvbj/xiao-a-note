---
name: fixing-bugs
description: A comprehensive, systematic framework for debugging and resolving code issues. Combines SRE-grade Root Cause Analysis (RCA) with tactical debugging strategies (Binary Search, Differential Debugging).
---

# Fixing Bugs & Systematic Debugging

## When to use this skill
- When the user reports a "bug", "error", "crash", or "unexpected behavior".
- When you need to investigate performance issues or memory leaks.
- When applying a fix to a broken feature.

## Workflow
1.  **Reproduce & Triage**:
    -   Isolate the issue. Can you make it fail consistently?
    -   Create a minimal reproduction case.
2.  **Root Cause Analysis (RCA)**:
    -   Apply the **Scientific Method**: Observe -> Hypothesize -> Experiment -> Analyze.
    -   Use **The 5 Whys** to find the deeper systemic issue, not just the symptom.
3.  **Solution Design**:
    -   Evaluate **Band-aid vs. Cure**.
    -   Assess side effects and performance impact.
4.  **Implementation**:
    -   Write a failing test (red).
    -   Implement the fix (green).
5.  **Verification**:
    -   Run regression tests.
    -   Verify no new linting errors or performance regressions.

## Instructions
### 1. The Reproduction Checklist
*Before coding, verify:*
- [ ] **Environment**: Prod vs Local? Node version? Browser?
- [ ] **Inputs**: Specific data? Nulls? Edge cases?
- [ ] **Consistency**: 100% repro? Or flaky (race condition)?

### 2. Diagnosis Techniques
Use these specific tactics if stuck:
-   **Binary Search**: Comment out half the code/features to narrow down the culprit.
-   **Differential Debugging**: Compare "Correct Working State" vs "Broken State" (e.g., v1.0 vs v1.1).
-   **Rubber Ducking**: Explain the logic step-by-step to the user.

### 3. Output Format
When presenting the diagnosis, use this SRE-standard format:

**🚨 Issue Summary**
> Concise statement of the problem.

**🔍 Root Cause Analysis (RCA)**
| Factor | Details |
| :--- | :--- |
| **Error Type** | e.g. `Logic Error`, `Race Condition` |
| **Location** | `File.ts` method `func()` |
| **Root Cause** | Explanation of *why* it failed (The 5 Whys). |

**🛠️ Fix Strategy**
-   **Option A (Recommended)**: Description...
    -   *Pros*: ...
    -   *Cons*: ...
-   **Option B (Rejected)**: ...

### 4. Common Pitfalls (Don't do this)
-   ❌ **Guess-driven debugging**: Randomly changing things hoping it works.
-   ❌ **Swallowing errors**: Adding empty `try/catch` to hide the crash.
-   ❌ **Fixing without tests**: Every bug fix needs a regression test.

## Resources
### Quick Check
- [ ] Typos / Case sensitivity?
- [ ] `null` / `undefined` checks?
- [ ] Async/Await missing?
- [ ] Cache cleared?
