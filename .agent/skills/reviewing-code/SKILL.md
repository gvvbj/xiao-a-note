---
name: reviewing-code
description: Reviews code changes from a software architect's perspective, focusing on security, stability, modularity, and scalability to ensure enterprise-grade quality.
---

# Architect-Level Code Review

## When to use this skill
- When the user asks "Review this code" or "Is this good?".
- Before merging a significant PR or feature branch.
- When evaluating legacy code for quality issues.

## Workflow
1.  **Macro Scan**: Check high-level architecture (Layers, Circular Dependencies).
2.  **Micro Scan**: Analyze line-by-line against the **6 Dimensions** (Security, Stability, etc.).
3.  **Grading**: Tag issues by severity (🔴 CRITICAL, 🟠 MAJOR, 🟡 MINOR, ⚪ NIT).
4.  **Reporting**: Output an Executive Summary and a Detailed Findings Table.
5.  **Refactoring Advice**: For Critical/Major issues, provide a "Before vs After" code snippet.

## Instructions
**1. The 6 Dimensions of Review**
-   **🛡️ Security**: Injection validation, PII masking, Auth checks.
-   **🧩 Modularity**: Layering violations (Controller -> DB), Cohesion.
-   **🏗️ Stability**: Error handling, timeouts, resource closing.
-   **🧩 Decoupling**: Dependency Inversion, Config extraction.
-   **📈 Scalability**: N+1 queries, Indexes, Async processing.
-   **🔌 Interfaces**: Idempotency, Backward compatibility.

**2. Severity Labels**
-   🔴 **[CRITICAL]**: Security holes, Data loss, Crashes. (Must Fix)
-   🟠 **[MAJOR]**: Arch violations, Performance blockers. (Blocking)
-   🟡 **[MINOR]**: Maintainability, Naming. (Suggested)
-   ⚪ **[NIT]**: Typos, Opinionated styles. (Optional)

**3. Output Format**
Use this table structure for findings:

| Severity | Location | Issue | Recommendation |
| :--- | :--- | :--- | :--- |
| 🔴 [CRITICAL] | `Auth.ts:20` | **Log Injection** | Mask passwords in logs. |
| 🟠 [MAJOR] | `Order.ts` | **Layering Violation** | Move DB logic to Service. |

**4. Refactoring Example**
*Always* show how to fix the worst issue:
```language
// ❌ Anti-Pattern
app.post((req) => db.query(req.body.sql));

// ✅ Standard
app.post((req) => service.safeQuery(req.body.id));
```
