const express = require("express");

const app = express();

app.use(express.json({ limit: "2mb" }));

const PORT = process.env.PORT || 3000;
const DEFAULT_BASE_URL = "http://localhost:8000";

const baseUrl = (process.env.ENMASK_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
let cachedToken = process.env.ENMASK_TOKEN || "";

/**
 * Seguridad simple del MCP HTTP.
 * Si MCP_API_KEY existe, exige:
 * - header x-mcp-key
 * o
 * - Authorization: Bearer <MCP_API_KEY>
 */
function checkMcpKey(req, res, next) {
  const expectedKey = process.env.MCP_API_KEY;

  if (!expectedKey) {
    return next();
  }

  const headerKey = req.headers["x-mcp-key"];
  const bearer = req.headers.authorization;

  if (headerKey === expectedKey || bearer === `Bearer ${expectedKey}`) {
    return next();
  }

  return res.status(401).json({
    error: "Unauthorized",
    detail: "Falta o es incorrecto el header x-mcp-key."
  });
}

/**
 * Obtiene token de Enmask.
 * Puede usar:
 * - ENMASK_TOKEN directamente
 * - o ENMASK_EMAIL + ENMASK_PASSWORD para login
 */
async function getToken(skipAuth = false) {
  if (skipAuth) return "";
  if (cachedToken) return cachedToken;

  const email = process.env.ENMASK_EMAIL;
  const password = process.env.ENMASK_PASSWORD;

  if (!email || !password) {
    throw new Error("Falta ENMASK_TOKEN o ENMASK_EMAIL/ENMASK_PASSWORD.");
  }

  const payload = await enmaskRequest("/api/v1/auth/login", {
    method: "POST",
    skipAuth: true,
    body: { email, password }
  });

  cachedToken = payload.access_token;
  return cachedToken;
}

/**
 * Cliente HTTP hacia el backend Enmask.
 */
async function enmaskRequest(path, options = {}) {
  const headers = Object.assign(
    { Accept: "application/json" },
    options.headers || {}
  );

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const token = await getToken(options.skipAuth);

  if (token && !options.skipAuth) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: options.method || "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined
    });
  } catch (error) {
    throw new Error(`No se pudo alcanzar Enmask en ${baseUrl}: ${error.message}`);
  }

  const text = await response.text();
  let payload = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch (_) {
      payload = text;
    }
  }

  if (!response.ok) {
    const detail =
      payload && typeof payload === "object" && payload.detail
        ? payload.detail
        : text;

    throw new Error(`${response.status} ${response.statusText}: ${detail || "Error sin detalle"}`);
  }

  return payload;
}

/**
 * Tools MCP expuestas.
 */
const tools = [
  {
    name: "enmask_health",
    description: "Verifica que el backend Enmask este levantado y devuelve su estado.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {}
    }
  },
  {
    name: "enmask_list_connections",
    description: "Lista las conexiones guardadas en Enmask para el usuario autenticado.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {}
    }
  },
  {
    name: "enmask_test_connection",
    description: "Prueba una conexion existente de Enmask por id.",
    inputSchema: {
      type: "object",
      required: ["connection_id"],
      additionalProperties: false,
      properties: {
        connection_id: {
          type: "string",
          description: "ID de conexion Enmask."
        }
      }
    }
  },
  {
    name: "enmask_inspect_schema",
    description: "Lee el esquema de una conexion Enmask.",
    inputSchema: {
      type: "object",
      required: ["connection_id"],
      additionalProperties: false,
      properties: {
        connection_id: {
          type: "string",
          description: "ID de conexion Enmask."
        }
      }
    }
  },
  {
    name: "enmask_preview_masking",
    description: "Genera una vista previa de enmascaramiento sin modificar la base de datos.",
    inputSchema: {
      type: "object",
      required: ["connection_id", "target_table", "field_rules"],
      additionalProperties: false,
      properties: {
        connection_id: {
          type: "string"
        },
        target_table: {
          type: "string",
          description: "Tabla, coleccion, clave/patron, label o relacion. Para SQL Server usar schema.tabla."
        },
        graph_element: {
          type: ["string", "null"],
          enum: ["node", "relationship", null],
          description: "Solo para Neo4j."
        },
        limit: {
          type: "number",
          default: 20
        },
        field_rules: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            required: ["target_column", "strategy"],
            additionalProperties: true,
            properties: {
              target_column: {
                type: "string"
              },
              strategy: {
                type: "string",
                enum: [
                  "redaction",
                  "hashing",
                  "substitution",
                  "nullification",
                  "fpe",
                  "perturbation"
                ]
              },
              protection_mode: {
                type: "string",
                enum: [
                  "virtual_view",
                  "masked_view",
                  "masked_column",
                  "static_mask",
                  "symmetric_encryption"
                ],
                default: "virtual_view"
              },
              strategy_options: {
                type: "object",
                default: {}
              }
            }
          }
        }
      }
    }
  },
  {
    name: "enmask_list_jobs",
    description: "Lista jobs de enmascaramiento del usuario autenticado.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {}
    }
  },
  {
    name: "enmask_get_job_status",
    description: "Obtiene el estado y detalle de un job de Enmask.",
    inputSchema: {
      type: "object",
      required: ["job_id"],
      additionalProperties: false,
      properties: {
        job_id: {
          type: "string"
        }
      }
    }
  }
];

/**
 * Ejecuta tools contra el backend Enmask.
 */
async function callTool(name, args = {}) {
  switch (name) {
    case "enmask_health":
      return enmaskRequest("/health", { skipAuth: true });

    case "enmask_list_connections":
      return enmaskRequest("/api/v1/connections/");

    case "enmask_test_connection":
      return enmaskRequest(
        `/api/v1/connections/${encodeURIComponent(args.connection_id)}/test`,
        {
          method: "POST"
        }
      );

    case "enmask_inspect_schema":
      return enmaskRequest(
        `/api/v1/workbench/connections/${encodeURIComponent(args.connection_id)}/schema`
      );

    case "enmask_preview_masking":
      return enmaskRequest("/api/v1/workbench/preview", {
        method: "POST",
        body: {
          connection_id: args.connection_id,
          target_table: args.target_table,
          field_rules: args.field_rules,
          graph_element: args.graph_element || null,
          limit: args.limit || 20
        }
      });

    case "enmask_list_jobs":
      return enmaskRequest("/api/v1/jobs/");

    case "enmask_get_job_status":
      return enmaskRequest(`/api/v1/jobs/${encodeURIComponent(args.job_id)}`);

    default:
      throw new Error(`Tool no soportada: ${name}`);
  }
}

/**
 * Convierte respuesta normal a formato MCP tool result.
 */
function asToolResult(data) {
  return {
    content: [
      {
        type: "text",
        text: typeof data === "string" ? data : JSON.stringify(data, null, 2)
      }
    ]
  };
}

/**
 * Maneja mensajes JSON-RPC MCP.
 */
async function handleMcpMessage(message) {
  const { id, method, params } = message || {};

  try {
    if (!method) {
      return {
        jsonrpc: "2.0",
        id: id || null,
        error: {
          code: -32600,
          message: "Invalid Request: falta method."
        }
      };
    }

    if (method === "initialize") {
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion:
            params && params.protocolVersion
              ? params.protocolVersion
              : "2025-06-18",
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: "enmask-mcp-server",
            version: "0.1.0"
          }
        }
      };
    }

    if (method === "notifications/initialized") {
      return null;
    }

    if (method === "tools/list") {
      return {
        jsonrpc: "2.0",
        id,
        result: {
          tools
        }
      };
    }

    if (method === "tools/call") {
      if (!params || !params.name) {
        return {
          jsonrpc: "2.0",
          id,
          error: {
            code: -32602,
            message: "Invalid params: falta params.name."
          }
        };
      }

      const result = await callTool(params.name, params.arguments || {});

      return {
        jsonrpc: "2.0",
        id,
        result: asToolResult(result)
      };
    }

    return {
      jsonrpc: "2.0",
      id,
      error: {
        code: -32601,
        message: `Method not found: ${method}`
      }
    };
  } catch (error) {
    return {
      jsonrpc: "2.0",
      id,
      error: {
        code: -32000,
        message: error.message
      }
    };
  }
}

/**
 * Rutas HTTP normales.
 */
app.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "enmask-mcp-server",
    mode: "http",
    mcpEndpoint: "/mcp",
    backend: baseUrl
  });
});

app.get("/health", async (_req, res) => {
  try {
    const backendHealth = await callTool("enmask_health", {});

    res.json({
      ok: true,
      service: "enmask-mcp-server",
      backend: baseUrl,
      backendHealth
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      service: "enmask-mcp-server",
      backend: baseUrl,
      error: error.message
    });
  }
});

app.get("/tools", checkMcpKey, (_req, res) => {
  res.json({
    ok: true,
    tools: tools.map((tool) => ({
      name: tool.name,
      description: tool.description
    }))
  });
});

app.get("/smoke", checkMcpKey, (_req, res) => {
  res.json({
    ok: true,
    baseUrl,
    tools: tools.map((tool) => tool.name)
  });
});

/**
 * GET /mcp solo informa.
 * El endpoint funcional para MCP HTTP en esta demo es POST /mcp.
 */
app.get(["/mcp", "/mcp/"], (_req, res) => {
  res.status(405).json({
    error: "Method Not Allowed",
    detail: "GET /mcp no implementa SSE en esta demo. Usa POST /mcp."
  });
});

/**
 * POST /mcp y POST /mcp/
 * Endpoint JSON-RPC del MCP HTTP.
 */
app.post(["/mcp", "/mcp/"], checkMcpKey, async (req, res) => {
  const response = await handleMcpMessage(req.body);

  if (!response) {
    return res.status(202).send();
  }

  return res.json(response);
});

/**
 * Alias opcional para pruebas, por si algun cliente usa /rpc.
 */
app.post(["/rpc", "/rpc/"], checkMcpKey, async (req, res) => {
  const response = await handleMcpMessage(req.body);

  if (!response) {
    return res.status(202).send();
  }

  return res.json(response);
});

/**
 * 404 controlado para ver claramente que metodo y ruta fallaron.
 */
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    method: req.method,
    path: req.path,
    detail: "Ruta no encontrada en enmask-mcp-server."
  });
});

app.listen(PORT, () => {
  console.log(`Enmask MCP HTTP server running on port ${PORT}`);
  console.log(`Backend: ${baseUrl}`);
  console.log(`MCP endpoint: /mcp`);
});