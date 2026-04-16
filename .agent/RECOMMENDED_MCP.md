# Recommended MCP Servers for Xiao A Note

Based on the project analysis (Electron + React + TypeScript Markdown Editor), the following Model Context Protocol (MCP) servers are highly recommended to enhance your agentic workflow.

I have automatically cloned the reference implementations to `.agent/mcp-servers/`.

## 1. 🦑 Git / GitHub MCP
**Why?**
The project `frontend-notes` is under active development. You are using `agents_repo` and `superpowers` which implies a heavy "Git-Ops" workflow.
*   **Synergy**: Combine with `writing-plans` skill.
    *   *Plan*: "Create 5 tasks for Feature X" -> *MCP*: "Create 5 GitHub Issues".
    *   *Plan*: "Review PR" -> *MCP*: "Read PR diff directly".

**Location**: `.agent/mcp-servers/src/git` (Local Git) or use `@modelcontextprotocol/server-github` (Remote).

## 2. 🧠 Memory MCP
**Why?**
You are building a "Second Brain" app (`xiao-a-note`). Your agent should also have a memory!
*   **Synergy**: Combine with `brainstorming-ideas`.
    *   *Brainstorm*: "We decided to use Tiptap for the editor."
    *   *MCP*: The agent writes this decision to the Memory Graph.
    *   *Future*: "Why did we choose Tiptap?" -> Agent queries Memory.

**Location**: `.agent/mcp-servers/src/memory`

## 3. 📂 Filesystem MCP (Advanced)
**Why?**
While the agent has basic file tools, the Filesystem MCP offers safe, sandboxed access with specialized differencing tools.
*   **Synergy**: Combine with `refactoring-code`.
    *   Allows the agent to explore the directory structure more naturally and perform bulk operations if configured.

**Location**: `.agent/mcp-servers/src/filesystem`

## 4. 🌐 Fetch / Puppeteer MCP
**Why?**
The project uses `Playwright` for E2E testing.
*   **Synergy**: Combine with `testing-code`.
    *   Use a Puppeteer/Playwright MCP to *visually* inspect the running Electron app (if configured to serve over web) or verify DOM states during debugging sessions.

---

## 🛠️ Configuration Snippet (claude_desktop_config.json)

Add these to your MCP configuration to enable them:

```json
{
  "mcpServers": {
    "git": {
      "command": "node",
      "args": ["${PROJECT_ROOT}/.agent/mcp-servers/src/git/dist/index.js"]
    },
    "memory": {
      "command": "node",
      "args": ["${PROJECT_ROOT}/.agent/mcp-servers/src/memory/dist/index.js"]
    },
    "filesystem": {
      "command": "node",
      "args": ["${PROJECT_ROOT}/.agent/mcp-servers/src/filesystem/dist/index.js", "${PROJECT_ROOT}"]
    }
  }
}
```
*(Note: You will need to build these servers first using `npm install && npm run build` inside each directory).*
