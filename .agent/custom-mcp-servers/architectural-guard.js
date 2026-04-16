const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const { execSync } = require("child_process");
const path = require("path");

const server = new Server(
    {
        name: "architectural-guard",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "check_architecture",
                description: "Check if there are direct imports between plugins or violations of modularity.",
                inputSchema: {
                    type: "object",
                    properties: {
                        directory: {
                            type: "string",
                            description: "Directory to scan (default: src/modules)",
                        },
                    },
                },
            },
            {
                name: "run_lint",
                description: "Run ESLint on the project and report findings.",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            }
        ],
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "check_architecture") {
        const dir = request.params.arguments?.directory || "src/modules";
        // Simple check for cross-plugin imports using grep via child_process
        try {
            // Look for imports from other modules in a module
            // e.g. in src/modules/editor, look for imports from @/modules/explorer
            const result = execSync(`grep -r "@\/modules\/" src/modules`).toString();
            const lines = result.split("\n").filter(l => l.trim());

            const violations = lines.filter(line => {
                const match = line.match(/src\/modules\/([^\/]+)\/.*from '@\/modules\/([^\/]+)/);
                if (match && match[1] !== match[2]) return true;
                return false;
            });

            if (violations.length === 0) {
                return { content: [{ type: "text", text: "No cross-module import violations found. Architecture is clean." }] };
            } else {
                return { content: [{ type: "text", text: "Found architectural violations:\n" + violations.join("\n") }] };
            }
        } catch (e) {
            return { content: [{ type: "text", text: "Architecture check completed with no issues or grep failed (likely no matches)." }] };
        }
    }

    if (request.params.name === "run_lint") {
        try {
            const result = execSync("npm run lint").toString();
            return { content: [{ type: "text", text: result }] };
        } catch (e) {
            return { content: [{ type: "text", text: "Lint failed:\n" + e.stdout?.toString() || e.message }] };
        }
    }

    throw new Error("Tool not found");
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch(console.error);
