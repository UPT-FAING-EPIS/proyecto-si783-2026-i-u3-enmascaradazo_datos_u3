#!/usr/bin/env node

const DEFAULT_BASE_URL = 'http://localhost:8000';
const baseUrl = (process.env.ENMASK_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
let cachedToken = process.env.ENMASK_TOKEN || '';

function logError(message) {
  process.stderr.write(`[enmask-mcp] ${message}\n`);
}

async function enmaskRequest(path, options = {}) {
  const headers = Object.assign({ Accept: 'application/json' }, options.headers || {});
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  const token = await getToken(options.skipAuth);
  if (token && !options.skipAuth) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: options.method || 'GET',
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
    const detail = payload && typeof payload === 'object' && payload.detail ? payload.detail : text;
    throw new Error(`${response.status} ${response.statusText}: ${detail || 'Error sin detalle'}`);
  }
  return payload;
}

async function getToken(skipAuth = false) {
  if (skipAuth) return '';
  if (cachedToken) return cachedToken;
  const email = process.env.ENMASK_EMAIL;
  const password = process.env.ENMASK_PASSWORD;
  if (!email || !password) {
    throw new Error('Falta ENMASK_TOKEN o ENMASK_EMAIL/ENMASK_PASSWORD para autenticar contra Enmask.');
  }
  const payload = await enmaskRequest('/api/v1/auth/login', {
    method: 'POST',
    skipAuth: true,
    body: { email, password }
  });
  cachedToken = payload.access_token;
  return cachedToken;
}

const tools = [
  {
    name: 'enmask_health',
    description: 'Verifica que el backend Enmask esté levantado y devuelve su estado.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {}
    }
  },
  {
    name: 'enmask_list_connections',
    description: 'Lista las conexiones guardadas en Enmask para el usuario autenticado.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {}
    }
  },
  {
    name: 'enmask_test_connection',
    description: 'Prueba una conexión existente de Enmask por id.',
    inputSchema: {
      type: 'object',
      required: ['connection_id'],
      additionalProperties: false,
      properties: {
        connection_id: { type: 'string', description: 'ID de conexión Enmask.' }
      }
    }
  },
  {
    name: 'enmask_inspect_schema',
    description: 'Lee el esquema de una conexión. En SQL devuelve schema.tabla, en Mongo colecciones, en Neo4j labels/relaciones y propiedades.',
    inputSchema: {
      type: 'object',
      required: ['connection_id'],
      additionalProperties: false,
      properties: {
        connection_id: { type: 'string', description: 'ID de conexión Enmask.' }
      }
    }
  },
  {
    name: 'enmask_preview_masking',
    description: 'Genera una vista previa de enmascaramiento sin modificar la base de datos.',
    inputSchema: {
      type: 'object',
      required: ['connection_id', 'target_table', 'field_rules'],
      additionalProperties: false,
      properties: {
        connection_id: { type: 'string' },
        target_table: { type: 'string', description: 'Tabla, colección, clave/patrón, label o relación. Para SQL Server usar schema.tabla.' },
        graph_element: { type: ['string', 'null'], enum: ['node', 'relationship', null], description: 'Solo para Neo4j.' },
        limit: { type: 'number', default: 20 },
        field_rules: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            required: ['target_column', 'strategy'],
            additionalProperties: true,
            properties: {
              target_column: { type: 'string', description: 'Columna, campo o propiedad.' },
              strategy: { type: 'string', enum: ['redaction', 'hashing', 'substitution', 'nullification', 'fpe', 'perturbation'] },
              protection_mode: { type: 'string', enum: ['virtual_view', 'masked_view', 'masked_column', 'static_mask', 'symmetric_encryption'], default: 'virtual_view' },
              strategy_options: { type: 'object', default: {} }
            }
          }
        }
      }
    }
  },
  {
    name: 'enmask_list_jobs',
    description: 'Lista jobs de enmascaramiento del usuario autenticado.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {}
    }
  },
  {
    name: 'enmask_get_job_status',
    description: 'Obtiene el estado y detalle de un job de Enmask.',
    inputSchema: {
      type: 'object',
      required: ['job_id'],
      additionalProperties: false,
      properties: {
        job_id: { type: 'string' }
      }
    }
  }
];

async function callTool(name, args = {}) {
  switch (name) {
    case 'enmask_health':
      return enmaskRequest('/health', { skipAuth: true });
    case 'enmask_list_connections':
      return enmaskRequest('/api/v1/connections/');
    case 'enmask_test_connection':
      return enmaskRequest(`/api/v1/connections/${encodeURIComponent(args.connection_id)}/test`, { method: 'POST' });
    case 'enmask_inspect_schema':
      return enmaskRequest(`/api/v1/workbench/connections/${encodeURIComponent(args.connection_id)}/schema`);
    case 'enmask_preview_masking':
      return enmaskRequest('/api/v1/workbench/preview', {
        method: 'POST',
        body: {
          connection_id: args.connection_id,
          target_table: args.target_table,
          field_rules: args.field_rules,
          graph_element: args.graph_element || null,
          limit: args.limit || 20
        }
      });
    case 'enmask_list_jobs':
      return enmaskRequest('/api/v1/jobs/');
    case 'enmask_get_job_status':
      return enmaskRequest(`/api/v1/jobs/${encodeURIComponent(args.job_id)}`);
    default:
      throw new Error(`Tool no soportada: ${name}`);
  }
}

function asToolResult(data) {
  return {
    content: [
      {
        type: 'text',
        text: typeof data === 'string' ? data : JSON.stringify(data, null, 2)
      }
    ]
  };
}

async function handleMessage(message) {
  const { id, method, params } = message;
  try {
    if (method === 'initialize') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: params && params.protocolVersion ? params.protocolVersion : '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'enmask-mcp-server', version: '0.1.0' }
        }
      };
    }
    if (method === 'notifications/initialized') {
      return null;
    }
    if (method === 'tools/list') {
      return { jsonrpc: '2.0', id, result: { tools } };
    }
    if (method === 'tools/call') {
      const result = await callTool(params.name, params.arguments || {});
      return { jsonrpc: '2.0', id, result: asToolResult(result) };
    }
    return {
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Method not found: ${method}` }
    };
  } catch (error) {
    return {
      jsonrpc: '2.0',
      id,
      error: { code: -32000, message: error.message }
    };
  }
}

function writeMessage(message) {
  if (!message) return;
  const body = JSON.stringify(message);
  process.stdout.write(`Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n${body}`);
}

let buffer = Buffer.alloc(0);
function tryReadMessages() {
  while (true) {
    const headerEnd = buffer.indexOf('\r\n\r\n');
    if (headerEnd === -1) return;
    const header = buffer.slice(0, headerEnd).toString('utf8');
    const match = /Content-Length:\s*(\d+)/i.exec(header);
    if (!match) {
      buffer = buffer.slice(headerEnd + 4);
      continue;
    }
    const length = Number(match[1]);
    const bodyStart = headerEnd + 4;
    const bodyEnd = bodyStart + length;
    if (buffer.length < bodyEnd) return;
    const body = buffer.slice(bodyStart, bodyEnd).toString('utf8');
    buffer = buffer.slice(bodyEnd);
    let message;
    try {
      message = JSON.parse(body);
    } catch (error) {
      logError(`JSON inválido: ${error.message}`);
      continue;
    }
    handleMessage(message).then(writeMessage).catch(error => {
      writeMessage({ jsonrpc: '2.0', id: message.id, error: { code: -32000, message: error.message } });
    });
  }
}

if (process.argv.includes('--smoke')) {
  console.log(JSON.stringify({ ok: true, baseUrl, tools: tools.map(t => t.name) }, null, 2));
  process.exit(0);
}

process.stdin.on('data', chunk => {
  buffer = Buffer.concat([buffer, chunk]);
  tryReadMessages();
});

process.stdin.on('end', () => process.exit(0));
