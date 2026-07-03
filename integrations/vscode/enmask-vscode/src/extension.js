const vscode = require('vscode');

const TOKEN_KEY = 'enmask.accessToken';

function getBackendUrl() {
  const configured = vscode.workspace.getConfiguration('enmask').get('backendUrl') || 'http://localhost:8000';
  return configured.replace(/\/$/, '');
}

function getFrontendUrl() {
  const configured = vscode.workspace.getConfiguration('enmask').get('frontendUrl') || 'http://localhost:5173';
  return configured.replace(/\/$/, '');
}

async function request(context, path, options = {}) {
  const url = `${getBackendUrl()}${path}`;
  const headers = Object.assign({ 'Accept': 'application/json' }, options.headers || {});
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  const token = await context.secrets.get(TOKEN_KEY);
  if (token && !options.skipAuth) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined
    });
  } catch (error) {
    throw new Error(`No se pudo alcanzar el backend Enmask en ${getBackendUrl()}: ${error.message}`);
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

function stringifyCompact(value) {
  return JSON.stringify(value, null, 2);
}

async function showDocument(title, content, language = 'json') {
  const document = await vscode.workspace.openTextDocument({ content, language });
  await vscode.window.showTextDocument(document, { preview: true });
}

class ConnectionsProvider {
  constructor(context) {
    this.context = context;
    this.emitter = new vscode.EventEmitter();
    this.onDidChangeTreeData = this.emitter.event;
    this.items = [];
  }

  refresh() {
    this.emitter.fire();
  }

  async getChildren() {
    try {
      this.items = await request(this.context, '/api/v1/connections/');
      if (!this.items.length) {
        return [new vscode.TreeItem('No hay conexiones guardadas', vscode.TreeItemCollapsibleState.None)];
      }
      return this.items.map(conn => {
        const item = new vscode.TreeItem(`${conn.name} (${conn.type})`, vscode.TreeItemCollapsibleState.None);
        item.description = `${conn.host}${conn.database ? ` / ${conn.database}` : ''}`;
        item.tooltip = stringifyCompact(conn);
        item.command = { command: 'enmask.inspectSchema', title: 'Inspect Schema', arguments: [conn.id] };
        return item;
      });
    } catch (error) {
      const item = new vscode.TreeItem(`Error: ${error.message}`, vscode.TreeItemCollapsibleState.None);
      item.tooltip = 'Ejecuta Enmask: Login y valida la URL del backend.';
      return [item];
    }
  }

  getTreeItem(element) {
    return element;
  }
}

class JobsProvider {
  constructor(context) {
    this.context = context;
    this.emitter = new vscode.EventEmitter();
    this.onDidChangeTreeData = this.emitter.event;
  }

  refresh() {
    this.emitter.fire();
  }

  async getChildren() {
    try {
      const jobs = await request(this.context, '/api/v1/jobs/');
      if (!jobs.length) {
        return [new vscode.TreeItem('No hay jobs registrados', vscode.TreeItemCollapsibleState.None)];
      }
      return jobs.map(job => {
        const item = new vscode.TreeItem(`${job.id.slice(0, 8)} - ${job.status}`, vscode.TreeItemCollapsibleState.None);
        item.description = `${job.run_mode} / ${job.records_processed || 0} registros`;
        item.tooltip = stringifyCompact(job);
        item.command = { command: 'enmask.listJobs', title: 'List Jobs' };
        return item;
      });
    } catch (error) {
      const item = new vscode.TreeItem(`Error: ${error.message}`, vscode.TreeItemCollapsibleState.None);
      return [item];
    }
  }

  getTreeItem(element) {
    return element;
  }
}

async function pickConnection(context) {
  const connections = await request(context, '/api/v1/connections/');
  if (!connections.length) {
    vscode.window.showWarningMessage('No hay conexiones registradas en Enmask. Crea una desde el dashboard web.');
    return null;
  }
  const selected = await vscode.window.showQuickPick(
    connections.map(conn => ({
      label: conn.name,
      description: `${conn.type} - ${conn.host}${conn.database ? ` / ${conn.database}` : ''}`,
      conn
    })),
    { placeHolder: 'Selecciona una conexión Enmask' }
  );
  return selected ? selected.conn : null;
}

async function inspectSchema(context, preselectedConnectionId) {
  let connectionId = preselectedConnectionId;
  if (!connectionId) {
    const conn = await pickConnection(context);
    if (!conn) return;
    connectionId = conn.id;
  }
  const schema = await request(context, `/api/v1/workbench/connections/${encodeURIComponent(connectionId)}/schema`);
  await showDocument('enmask-schema.json', stringifyCompact(schema), 'json');
}

async function previewMasking(context) {
  const conn = await pickConnection(context);
  if (!conn) return;

  const schema = await request(context, `/api/v1/workbench/connections/${encodeURIComponent(conn.id)}/schema`);
  const targets = schema.targets || [];
  if (!targets.length) {
    vscode.window.showWarningMessage('La conexión no devolvió objetos para inspeccionar.');
    return;
  }

  const targetPick = await vscode.window.showQuickPick(
    targets.map(t => ({ label: t.name, description: `${t.kind || 'target'} - ${(t.columns || []).length} propiedades/campos`, target: t })),
    { placeHolder: conn.type === 'neo4j' ? 'Selecciona label o relación' : 'Selecciona tabla, colección o estructura' }
  );
  if (!targetPick) return;

  const target = targetPick.target;
  const columnPick = await vscode.window.showQuickPick(
    (target.columns || []).map(col => ({ label: col })),
    { placeHolder: conn.type === 'neo4j' ? 'Selecciona propiedad sensible' : 'Selecciona campo/columna sensible' }
  );
  if (!columnPick) return;

  const strategyPick = await vscode.window.showQuickPick([
    { label: 'redaction', description: 'Oculta parcialmente con *' },
    { label: 'hashing', description: 'SHA-256 determinístico' },
    { label: 'substitution', description: 'Dato ficticio consistente' },
    { label: 'nullification', description: 'Convierte a null' },
    { label: 'fpe', description: 'Preserva formato aproximado' },
    { label: 'perturbation', description: 'Perturba números/fechas' }
  ], { placeHolder: 'Selecciona algoritmo' });
  if (!strategyPick) return;

  const protectionModePick = await vscode.window.showQuickPick([
    { label: 'virtual_view', description: 'Solo preview, no modifica' },
    { label: 'masked_column', description: 'Crea campo derivado como campo_masked' },
    { label: 'static_mask', description: 'Modifica el dato original' },
    { label: 'symmetric_encryption', description: 'Cifra físicamente el valor' }
  ], { placeHolder: 'Selecciona modo de protección para la vista previa' });
  if (!protectionModePick) return;

  const body = {
    connection_id: conn.id,
    target_table: target.name,
    field_rules: [{
      target_column: columnPick.label,
      strategy: strategyPick.label,
      strategy_options: {},
      protection_mode: protectionModePick.label
    }],
    graph_element: target.kind === 'relationship' ? 'relationship' : target.kind === 'node' ? 'node' : null,
    limit: 20
  };

  const preview = await request(context, '/api/v1/workbench/preview', { method: 'POST', body });
  await showDocument('enmask-preview.json', stringifyCompact(preview), 'json');
}

async function activate(context) {
  const connectionsProvider = new ConnectionsProvider(context);
  const jobsProvider = new JobsProvider(context);
  vscode.window.registerTreeDataProvider('enmaskConnections', connectionsProvider);
  vscode.window.registerTreeDataProvider('enmaskJobs', jobsProvider);

  context.subscriptions.push(
    vscode.commands.registerCommand('enmask.setBackendUrl', async () => {
      const current = getBackendUrl();
      const next = await vscode.window.showInputBox({ prompt: 'URL del backend Enmask', value: current });
      if (!next) return;
      await vscode.workspace.getConfiguration('enmask').update('backendUrl', next, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage(`Backend Enmask configurado: ${next}`);
    }),

    vscode.commands.registerCommand('enmask.login', async () => {
      const email = await vscode.window.showInputBox({ prompt: 'Correo Enmask', ignoreFocusOut: true });
      if (!email) return;
      const password = await vscode.window.showInputBox({ prompt: 'Contraseña Enmask', password: true, ignoreFocusOut: true });
      if (!password) return;
      const payload = await request(context, '/api/v1/auth/login', { method: 'POST', body: { email, password }, skipAuth: true });
      await context.secrets.store(TOKEN_KEY, payload.access_token);
      vscode.window.showInformationMessage(`Sesión iniciada como ${payload.user.email}`);
      connectionsProvider.refresh();
      jobsProvider.refresh();
    }),

    vscode.commands.registerCommand('enmask.logout', async () => {
      await context.secrets.delete(TOKEN_KEY);
      vscode.window.showInformationMessage('Sesión Enmask cerrada en VS Code.');
      connectionsProvider.refresh();
      jobsProvider.refresh();
    }),

    vscode.commands.registerCommand('enmask.testBackend', async () => {
      const health = await request(context, '/health', { skipAuth: true });
      const me = await request(context, '/api/v1/auth/me');
      vscode.window.showInformationMessage(`Backend OK: ${health.service}. Usuario: ${me.email}`);
    }),

    vscode.commands.registerCommand('enmask.openDashboard', async () => {
      await vscode.env.openExternal(vscode.Uri.parse(getFrontendUrl()));
    }),

    vscode.commands.registerCommand('enmask.listConnections', async () => {
      const connections = await request(context, '/api/v1/connections/');
      connectionsProvider.refresh();
      await showDocument('enmask-connections.json', stringifyCompact(connections), 'json');
    }),

    vscode.commands.registerCommand('enmask.inspectSchema', async (connectionId) => inspectSchema(context, connectionId)),

    vscode.commands.registerCommand('enmask.previewMasking', async () => previewMasking(context)),

    vscode.commands.registerCommand('enmask.listJobs', async () => {
      const jobs = await request(context, '/api/v1/jobs/');
      jobsProvider.refresh();
      await showDocument('enmask-jobs.json', stringifyCompact(jobs), 'json');
    })
  );
}

function deactivate() {}

module.exports = { activate, deactivate };
