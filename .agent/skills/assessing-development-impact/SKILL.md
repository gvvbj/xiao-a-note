---
name: assessing-development-impact
description: Mandates a comprehensive impact assessment document before any code modification or optimization. Analyzes file responsibilities, dependencies, and side effects.
---

# Assessing Development Impact

## When to use this skill
- Before starting any new feature development.
- Before performing any code optimization or refactoring.
- When the user requests a "pre-development plan" or "impact analysis".

## Workflow
1.  **Draft Impact Document**: Create a markdown file (e.g., `IMPACT_ANALYSIS.md`) covering the required sections.
2.  **Verify Linkage**: Mandatory check: If the task involves a new feature or optimization, YOU MUST also invoke the `enforcing-plugin-first-design` skill to align with the project's architectural vision.
3.  **User Review**: Present the analysis to the user and wait for approval before making any code changes.

## Instructions
The produced analysis document MUST include the following sections with maximum detail:

### 1. Target Files & Responsibilities
- **Modified Files**: List absolute paths of files to be changed.
- **Role & Scope**: Describe the specific responsibility of each file and what role it plays in the current system.

### 2. Dependency & Association Analysis
- **Linked Files**: Identify files that import, utilize, or are observed by the target files.
- **Inter-file Impact**: Detail whether modifying File A will break or require changes in its associated File B.

### 3. Functional Impact Scope
- **Affected Features**: List specific user-facing or internal functionalities that are within the "blast radius" of this change.
- **Regression Risks**: Identify potential side effects (e.g., performance hits, state race conditions).

### 4. Architectural Alignment
- Explicitly state how this change complies with the project's "Security, Stability, Scalability, and Modularity" principles.
