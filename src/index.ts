#!/usr/bin/env node

import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { server } from "./server.js";
import express from "express";
import chalk from "chalk";
import { parseArgs } from "node:util";

const app = express();
app.use(express.json());
const transports: {
  streamable: Record<string, StreamableHTTPServerTransport>;
  sse: Record<string, SSEServerTransport>;
} = {
  streamable: {},
  sse: {},
};

const {
  values: { port },
} = parseArgs({
  options: {
    port: {
      type: "string",
      short: "p",
      default: "1110",
    },
  },
});

app.get("/sse", async (req, res) => {
  const transport = new SSEServerTransport("/messages", res);
  transports.sse[transport.sessionId] = transport;

  await server.connect(transport);

  res.on("close", () => {
    delete transports.sse[transport.sessionId];
  });
});

app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports.sse[sessionId];

  if (transport) {
    await transport.handlePostMessage(req, res, req.body);
  } else {
    res.status(400).send("No transport found for sessionId");
  }
});

const PORT = parseInt(port, 10);
app.listen(PORT, () => {
  console.log(
    chalk.green(`
╔════════════════════════════════════════════════════════════╗
║             Desktop Commander MCP Server                  ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  ${chalk.blue(
      `Server running on http://localhost:${PORT}`
    )}                   ║
║  ${chalk.yellow(
      `Modern endpoint: http://localhost:${PORT}/mcp`
    )}              ║
║  ${chalk.red(
      `Legacy SSE endpoint: http://localhost:${PORT}/sse`
    )}            ║
║                                                            ║
║  Press ${chalk.bgRed(
      "Ctrl+C"
    )} to stop the server                            ║
╚════════════════════════════════════════════════════════════╝
`)
  );
});
