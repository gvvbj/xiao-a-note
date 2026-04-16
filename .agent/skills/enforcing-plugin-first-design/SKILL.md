---
name: enforcing-plugin-first-design
description: Enforces the "Plugin-First" principle for all new features and optimizations. Replaces hardcoded logic with extension points and kernel commands.
---

# Enforcing Plugin-First Design

## When to use this skill
- Whenever a new feature is being added to the system.
- When optimizing "God Components" (e.g., NoteEditor, EditorTabs) to decouple their logic.
- MUST be called in tandem with `assessing-development-impact`.

## Workflow
1.  **Identify Extension Points**: Determine if the feature can be implemented using existing registration methods (Sidebar, EditorHeader, CodeMirror Extension).
2.  **Define New Hooks**: If no existing point fits, the first step must be creating a new registration mechanism in the `kernel` or `PluginManager`.
3.  **Command Decoupling**: Ensure all primary logic is wrapped in `registerCommand` rather than direct method calls or `kernel.emit` broadcasts.

## Instructions
Adhere to the following rules to prevent the growth of "God Components":

### 1. Prohibition of Hardcoding
- **Rule**: Never add business-specific `if/else` or UI buttons directly into `NoteEditor.tsx` or `EditorTabs.tsx`.
- **Alternative**: Register a header item or an editor extension via the `PluginContext`.

### 2. Lifecycle & Cleanup
- All registrations must return a `dispose` function.
- The `deactivate` hook of the (internal) plugin must be used to ensure 100% cleanup (prevent jitter and memory leaks).

### 3. Dependency Inversion
- Ensure the UI components depend on the `Registry` or `CommandBus`, not the specific implementation of the feature.

## Resources
- [Plugin Development Guide](file:///e:/require/xiao-a-note/docs/plans/PluginDevelopmentGuide.md)
