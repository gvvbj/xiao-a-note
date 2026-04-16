---
name: brainstorming-ideas
description: Helps turn ideas into fully formed designs and specs through natural collaborative dialogue. Use when the user wants to brainstorm, explore concepts, or clarify requirements.
---

# Brainstorming Ideas Into Designs

## When to use this skill
- When the user says "brainstorm" or "let's think about X".
- When the user has a vague idea that needs refining into a spec.
- Before starting any major feature implementation or complex task.

## Workflow
1.  **Analyze Context**: Check current project state (files, docs) to ground the discussion.
2.  **Refine Idea**: Ask sequential questions to clarify purpose, constraints, and success criteria.
    -   *Rule*: One question per message.
    -   *Preference*: Use multiple choice when possible.
3.  **Explore Approaches**: Propose 2-3 options with trade-offs.
4.  **Draft Design**: Present the design in small chunks (200-300 words) for validation.
5.  **Finalize**: Write the validated design to a markdown file in `docs/plans/` (or equivalent).

## Instructions
**Interaction Principles**
-   **One Question Rule**: Never overwhelm the user. Ask one thing at a time.
-   **Multiple Choice**: Reduce cognitive load by offering options (A, B, C) plus "Other".
-   **YAGNI**: Ruthlessly cut unnecessary features during the design phase.
-   **Incremental Validation**: Check "Does this look right so far?" after every major section.

**Output Artifact**
-   The final output should be a design document (e.g., `docs/design/YYYY-MM-DD-topic.md`).
-   Include: Architecture, Components, Data Flow, Error Handling, Testing Strategy.

## Resources
-   [Reference: Original Superpowers Spec](https://github.com/obra/superpowers/tree/main/skills/brainstorming)
