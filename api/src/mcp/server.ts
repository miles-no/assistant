import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
	CallToolRequestSchema,
	ListResourcesRequestSchema,
	ListToolsRequestSchema,
	ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { listResources, readResource } from "./resources.js";
import { callTool, registerTools } from "./tools.js";

export class MilesBookingMCPServer {
	private server: Server;

	constructor() {
		this.server = new Server(
			{
				name: "miles-booking-api",
				version: "1.0.0",
			},
			{
				capabilities: {
					tools: {},
					resources: {},
				},
			},
		);

		this.setupHandlers();
	}

	private setupHandlers() {
		// List available tools
		this.server.setRequestHandler(ListToolsRequestSchema, async () => {
			return {
				tools: registerTools(),
			};
		});

		// Call a tool
		this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
			return await callTool(request.params.name, request.params.arguments);
		});

		// List available resources
		this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
			return {
				resources: await listResources(),
			};
		});

		// Read a resource
		this.server.setRequestHandler(
			ReadResourceRequestSchema,
			async (request) => {
				return await readResource(request.params.uri);
			},
		);
	}

	async run() {
		const transport = new StdioServerTransport();
		await this.server.connect(transport);
		console.error("Miles Booking MCP server running on stdio");
	}

	getServer() {
		return this.server;
	}
}

// Run the server if this file is executed directly
if (require.main === module) {
	const server = new MilesBookingMCPServer();
	server.run().catch(console.error);
}
