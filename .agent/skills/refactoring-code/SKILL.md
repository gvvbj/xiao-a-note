---
name: refactoring-code
description: A comprehensive skill for architectural refactoring. Enhances code quality across six dimensions (Security, Stability, Decoupling, etc.) using risk-aware execution.
---

# Architect-Level Refactoring

## When to use this skill
- When the user asks to "refactor", "cleanup", or "improve" code structure.
- When you identify high technical debt that blocks new features.
- When moving from a "hacky" solution to a production-grade one.

## Workflow
1.  **Prioritize Goal**: Select ONE primary dimension (e.g., Decoupling or Security). Don't boil the ocean.
2.  **Assess Risk**: Check the impact on business-critical paths. Identify a fallback plan.
3.  **Establish Safety Net**: Ensure characterization tests cover 100% of the affected path *before* touching code.
4.  **Execute (Strangler Fig)**:
    -   Create new structure alongside old.
    -   Migrate consumers incrementally.
    -   Delete old structure.
5.  **Validate**: Verify backward compatibility and run regression tests.

## Instructions
**1. Dimensions of Refactoring**
Focus on ONE of these at a time:
-   **🛡️ Security**: Patching vulnerabilities, enforcing Least Privilege.
-   **🏗️ Stability**: Adding error boundaries, retries, circuit breakers.
-   **📈 Scalability**: Fixing N+1 queries, adding caching.
-   **🧩 Decoupling**: Inverting dependencies (DIP), isolating domains.
-   **🧱 Modularity**: Improving cohesion, DDD boundaries.
-   **🔌 Interfaces**: Standardizing API contracts.

**2. Execution Checklist**
- [ ] **Goal Defined**: "I am refactoring X to improve Y".
- [ ] **Tests Green**: Existing tests pass.
- [ ] **Feature Flag Created**: Can we toggle the new code off? (If risky).
- [ ] **Incremental Step**: Don't do a "Big Bang" rewrite.

**3. Output Format**
Sumzarize the plan before starting:
> **Target**: 🧩 Decoupling
> **Risk**: 🟠 MEDIUM
> **Strategy**: Introduce Repository Pattern to replace direct SQL.

```language
// ❌ [Before] Coupled
class Service {
  update() { db.query("UPDATE...") }
}

// ✅ [After] Decoupled (DI)
class Service {
  constructor(repo) { this.repo = repo }
  update() { this.repo.update() }
}
```
