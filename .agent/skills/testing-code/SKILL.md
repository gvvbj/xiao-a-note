---
name: testing-code
description: Generates comprehensive test suites (Unit/Integration/E2E). Use to verify features, prevent regressions, and ensure code robustness.
---

# Lead SDET Test Generation

## When to use this skill
- When the user asks to "write tests" or "verify this feature".
- When implementing a new module (TDD).
- Before refactoring legacy code (Safety Net).

## Workflow
1.  **Define Strategy**: Balance the **Test Pyramid** (Unit > Integration > E2E).
2.  **Edge Case Matrix**: Brainstorm strict data/network/concurrency edge cases (Nulls, Timeouts, Race Conditions).
3.  **Draft Scenarios**: List test case names and expectations *before* coding.
4.  **Implement**: Write tests with **Atomic Assertions** and **Strict Mocking**.
5.  **Review**: Verify coverage targets (>80% Line, 100% Branch).

## Instructions
**1. Strategic Pillars**
-   **Unit Tests**: Mock everything. Test logic in isolation.
-   **Integration**: Test real DB/API interactions.
-   **Mocking**: Use strict stubs. Fail if an unexpected call happens.

**2. The Detail Protocol**
-   **Atomic Assertions**: Don't just check `!= null`. Check specific field values.
-   **Exact Errors**: Assert the *exact* exception type and message text.
-   **Side Effects**: Always `verify()` that side effects (emails, DB saves) happened exactly once.

**3. Output Template**
```markdown
### 📋 Test Strategy
> **Scope**: OrderService
> **Pyramid**: 80% Unit, 20% Integration

### 🧪 Test Cases
| Type | Name | Scenario | Expectation |
| :--- | :--- | :--- | :--- |
| Unit | `testOrderSuccess` | Valid Input | Return ID, Status=CREATED |
| Unit | `testOrderFail` | Stock=0 | Throw OutOfStockException |
```

**4. Implementation Code**
Provide the full `@Test` code including mocks and assertions.
