---
description: Mandatory pre-modification review of project principles and specifications
---

# Pre-Modification Review Workflow

**This workflow MUST be executed before ANY code modification in the project.**

## Steps

1. Read the development specification file:
// turbo
```
view_file: e:\require\xiao-a-note\plugins\DEVELOPMENT_SPEC.md
```

2. Read the plugin development guide:
// turbo
```
view_file: e:\require\xiao-a-note\plugins\ai_modification_guidelines.md
```

3. Before writing any code, verify your planned changes against:
   - The 5 core principles (Microkernel, Plugin-First, Zero Core Modification, Interface Contract, Traceability)
   - Coding standards (no console.log, no magic strings, no cross-plugin imports, no business logic in kernel)
   - AI collaboration guidelines (plugin layer only, check before write, incremental changes)

4. Only proceed with code modifications after confirming compliance.