---
name: creating-new-skill
description: Scaffolds a new skill directory with a standardized SKILL.md template and structure. Use when the user needs to create, generate, or add a new skill to the agent's capabilities.
---

# Creating a New Skill

## When to use this skill
- When the user asks to create, add, or scaffold a new skill.
- When the user provides a prompt describing a reusable workflow or capability they want to systemize.
- When the user mentions "creating a skill creator" or specific skill generation requirements.

## Workflow
1.  **Analyze Requirements**: Identify the skill name, description, trigger context, and complexity level.
    -   **Name**: Must be a gerund (e.g., `testing-ui`, `deploying-app`).
    -   **Description**: Third-person summary (e.g., "Deploys the application to...").
2.  **Validate Constraints**: 
    -   Name must be lowercase, hyphenated, max 64 chars.
    -   Name must NOT contain restricted terms (e.g., "claude", "anthropic").
3.  **Create Architecture**:
    -   Create directory: `.agent/skills/[skill-name]/`
    -   Create subdirectories if content exists: `scripts/` (helpers), `examples/` (refs), `resources/` (assets).
4.  **Generate SKILL.md**: Write the `SKILL.md` file using the **Master Template** below, adhering to "The Claude Way" principles.
5.  **Finalize**: Confirm creation to the user and mention the created path.

## Instructions
**Naming & Structure**
-   **Skill Name**: Gerund form (e.g., `managing-state`), max 64 chars, lowercase, hyphens only.
-   **File Paths**: Always use forward slashes `/`.
-   **Structure**:
    -   `SKILL.md` (Required)
    -   `scripts/`, `examples/`, `resources/` (Optional - only create if populated).

**Content Guidelines (The "Claude Way")**
-   **Conciseness**: Assume an expert agent. Avoid defining basic terms. Focus on unique logic.
-   **Progressive Disclosure**: Keep `SKILL.md` under 500 lines. Link to secondary files (e.g., `ADVANCED.md`) if complex.
-   **Degrees of Freedom**:
    -   **High Freedom (Heuristics)**: Use Bullet Points.
    -   **Medium Freedom (Templates)**: Use Code Blocks.
    -   **Low Freedom (Fragile Ops)**: Use Specific Bash Commands.

**Complexity Management**
For complex tasks, include in the `SKILL.md`:
1.  **Checklists**: A markdown checklist for the agent to copy and track state.
2.  **Validation Loops**: "Plan-Validate-Execute" patterns (e.g., "Check config before applying").
3.  **Error Handling**: Instructions for scripts should be "black boxes"—tell the agent to run `--help` if unsure.

## Master Template
Use this structure for the new `SKILL.md`. Maintain the YAML frontmatter and section headers.

````markdown
---
name: [gerund-name]
description: [3rd-person description of what the skill does]
---

# [Skill Title]

## When to use this skill
- [Trigger 1: Specific user intent]
- [Trigger 2: Specific keywords or context]

## Workflow
1.  [Step 1]
2.  [Step 2]
    -   [Sub-step]

## Instructions
[Specific logic, code snippets, or rules for the agent to follow]

### [Sub-section - e.g., Execution Rules]
- [Instruction 1]
- [Instruction 2]

## Resources
- [Link to scripts/ or resources/ if applicable]
````
