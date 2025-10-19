import express, { Request, Response } from "express";
import { MilesBookingMCPServer } from "../mcp/server.js";
import { registerTools, callTool } from "../mcp/tools.js";
import { listResources, readResource } from "../mcp/resources.js";

const router = express.Router();

// Create a single MCP server instance
const mcpServer = new MilesBookingMCPServer();

/**
 * @route GET /mcp/info
 * @desc Get information about the MCP server
 * @access Public
 */
router.get("/info", (req: Request, res: Response) => {
  res.json({
    name: "miles-booking-api",
    version: "1.0.0",
    description: "Model Context Protocol server for Miles Booking API",
    capabilities: {
      tools: true,
      resources: true,
    },
    protocol: "mcp",
    protocolVersion: "1.0",
  });
});

/**
 * @route GET /mcp/tools
 * @desc List all available MCP tools
 * @access Public
 */
router.get("/tools", async (req: Request, res: Response) => {
  try {
    const tools = registerTools();
    res.json({
      success: true,
      count: tools.length,
      tools,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route POST /mcp/tools/:toolName
 * @desc Call a specific MCP tool
 * @access Public
 */
router.post("/tools/:toolName", async (req: Request, res: Response) => {
  try {
    const { toolName } = req.params;
    const args = req.body;

    const result = await callTool(toolName, args);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: error.message,
          }),
        },
      ],
    });
  }
});

/**
 * @route GET /mcp/resources
 * @desc List all available MCP resources
 * @access Public
 */
router.get("/resources", async (req: Request, res: Response) => {
  try {
    const resources = await listResources();
    res.json({
      success: true,
      count: resources.length,
      resources,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route GET /mcp/resources/*
 * @desc Read a specific MCP resource
 * @access Public
 */
router.get("/resources/*", async (req: Request, res: Response) => {
  try {
    // Extract the resource path after /mcp/resources/
    const resourcePath = req.params[0];

    // Reconstruct the miles:// URI
    let uri = `miles://${resourcePath}`;

    // Add query parameters if present
    const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
    if (queryString) {
      uri += `?${queryString}`;
    }

    const result = await readResource(uri);

    // If it's a single resource with a specific mime type, set appropriate headers
    if (result.contents && result.contents.length === 1) {
      const content = result.contents[0];
      if (content.mimeType === "text/calendar") {
        res.setHeader("Content-Type", "text/calendar");
        res.send(content.text);
        return;
      }
    }

    res.json(result);
  } catch (error: any) {
    res.status(400).json({
      contents: [
        {
          uri: "error",
          mimeType: "application/json",
          text: JSON.stringify({
            error: error.message,
          }),
        },
      ],
    });
  }
});

/**
 * @route POST /mcp/messages
 * @desc Handle JSON-RPC 2.0 MCP messages
 * @access Public
 */
router.post("/messages", async (req: Request, res: Response) => {
  try {
    const message = req.body;

    // Validate JSON-RPC 2.0 format
    if (!message.jsonrpc || message.jsonrpc !== "2.0") {
      return res.status(400).json({
        jsonrpc: "2.0",
        id: message.id || null,
        error: {
          code: -32600,
          message: "Invalid Request - jsonrpc must be '2.0'",
        },
      });
    }

    // Handle different method types
    switch (message.method) {
      case "initialize":
        res.json({
          jsonrpc: "2.0",
          id: message.id,
          result: {
            protocolVersion: "1.0",
            serverInfo: {
              name: "miles-booking-api",
              version: "1.0.0",
            },
            capabilities: {
              tools: {},
              resources: {},
            },
          },
        });
        break;

      case "tools/list":
        const tools = registerTools();
        res.json({
          jsonrpc: "2.0",
          id: message.id,
          result: {
            tools,
          },
        });
        break;

      case "tools/call":
        const toolResult = await callTool(
          message.params.name,
          message.params.arguments
        );
        res.json({
          jsonrpc: "2.0",
          id: message.id,
          result: toolResult,
        });
        break;

      case "resources/list":
        const resources = await listResources();
        res.json({
          jsonrpc: "2.0",
          id: message.id,
          result: {
            resources,
          },
        });
        break;

      case "resources/read":
        const resourceResult = await readResource(message.params.uri);
        res.json({
          jsonrpc: "2.0",
          id: message.id,
          result: resourceResult,
        });
        break;

      default:
        res.status(400).json({
          jsonrpc: "2.0",
          id: message.id,
          error: {
            code: -32601,
            message: `Method not found: ${message.method}`,
          },
        });
    }
  } catch (error: any) {
    res.status(500).json({
      jsonrpc: "2.0",
      id: req.body.id || null,
      error: {
        code: -32603,
        message: `Internal error: ${error.message}`,
      },
    });
  }
});

/**
 * @route GET /mcp/sse
 * @desc Server-Sent Events endpoint for streaming MCP messages
 * @access Public
 */
router.get("/sse", (req: Request, res: Response) => {
  // Set headers for SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Send initial connection event
  res.write(
    `data: ${JSON.stringify({
      type: "connection",
      status: "connected",
      serverInfo: {
        name: "miles-booking-api",
        version: "1.0.0",
      },
    })}\n\n`
  );

  // Keep connection alive with periodic heartbeats
  const heartbeat = setInterval(() => {
    res.write(
      `data: ${JSON.stringify({
        type: "heartbeat",
        timestamp: new Date().toISOString(),
      })}\n\n`
    );
  }, 30000);

  // Clean up on client disconnect
  req.on("close", () => {
    clearInterval(heartbeat);
    res.end();
  });
});

export default router;
