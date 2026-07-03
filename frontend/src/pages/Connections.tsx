import { useEffect, useMemo, useState } from 'react';
import {
  getConnections,
  createConnection,
  deleteConnection,
  discoverPii,
  createRule,
  getSupportedDatabases,
  testConnection,
  testExistingConnection,
} from '../services/api';
import type { Connection, ConnectionCreate, RuleCreate, SupportedDatabaseInfo } from '../types';
import type { ToastType } from '../hooks/useToast';

interface Props {
  addToast: (msg: string, type?: ToastType) => void;
}

const fallbackDatabases: SupportedDatabaseInfo[] = [
  { type: 'postgres', label: 'PostgreSQL', category: 'Relacional', default_port: 5432, database_label: 'Base de datos', requires_host: true, supports_native_view: true, supports_masked_column: true, notes: 'Acepta host separado o URI completa postgresql://, incluido Supabase.' },
  { type: 'mysql', label: 'MySQL', category: 'Relacional', default_port: 3306, database_label: 'Base de datos', requires_host: true, supports_native_view: true, supports_masked_column: true, notes: '' },
  { type: 'mariadb', label: 'MariaDB', category: 'Relacional', default_port: 3306, database_label: 'Base de datos', requires_host: true, supports_native_view: true, supports_masked_column: true, notes: '' },
  { type: 'sqlite', label: 'SQLite', category: 'Relacional local', default_port: 0, database_label: 'Ruta del archivo .db', requires_host: false, supports_native_view: true, supports_masked_column: true, notes: 'No usa puerto.' },
  { type: 'sqlserver', label: 'SQL Server', category: 'Relacional', default_port: 1433, database_label: 'Base de datos', requires_host: true, supports_native_view: true, supports_masked_column: true, notes: 'Requiere Microsoft ODBC Driver 18 en el backend. Si Enmask corre en Docker y SQL Server está en Windows, usa host.docker.internal, no localhost.' },
  { type: 'oracle', label: 'Oracle Database', category: 'Relacional', default_port: 1521, database_label: 'Service name / SID', requires_host: true, supports_native_view: true, supports_masked_column: true, notes: '' },
  { type: 'cassandra', label: 'Apache Cassandra', category: 'NoSQL wide-column', default_port: 9042, database_label: 'Keyspace', requires_host: true, supports_native_view: false, supports_masked_column: true, notes: 'Vistas virtuales desde Enmask.' },
  { type: 'mongodb', label: 'MongoDB', category: 'NoSQL documental', default_port: 27017, database_label: 'Base de datos', requires_host: true, supports_native_view: true, supports_masked_column: true, notes: 'Acepta URI completa de Atlas en Host: mongodb+srv://usuario:clave@cluster... o solo cluster.mongodb.net.' },
  { type: 'redis', label: 'Redis', category: 'NoSQL clave-valor', default_port: 6379, database_label: 'Índice lógico DB', requires_host: true, supports_native_view: false, supports_masked_column: true, notes: 'Acepta redis:// y rediss:// para Redis Cloud/TLS. Tabla = patrón de clave.' },
  { type: 'neo4j', label: 'Neo4j', category: 'NoSQL grafo', default_port: 7687, database_label: 'Database', requires_host: true, supports_native_view: false, supports_masked_column: true, notes: 'Acepta bolt://, neo4j:// y neo4j+s:// para Aura. Usa puerto Bolt 7687.' },
];

const defaultForm: ConnectionCreate = {
  name: '',
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  database: '',
  username: '',
  password: '',
};

const databaseBadges: Record<ConnectionCreate['type'], string> = {
  postgres: 'badge-info',
  mysql: 'badge-warning',
  mariadb: 'badge-warning',
  sqlite: 'badge-info',
  sqlserver: 'badge-danger',
  oracle: 'badge-danger',
  cassandra: 'badge-warning',
  mongodb: 'badge-success',
  redis: 'badge-danger',
  neo4j: 'badge-success',
};

function defaultDatabaseValue(type: ConnectionCreate['type']) {
  if (type === 'sqlite') return '/absolute/path/to/data.db';
  if (type === 'redis') return '0';
  if (type === 'neo4j') return 'neo4j';
  if (type === 'oracle') return 'XEPDB1';
  if (type === 'cassandra') return 'keyspace_name';
  return '';
}

function isUriLike(value: string) {
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test((value || '').trim());
}

function placeholderForTarget(type: ConnectionCreate['type']) {
  if (type === 'mongodb') return 'Puedes pegar URI completa de Atlas o usar host + usuario + contraseña.';
  if (type === 'postgres') return 'Puedes pegar URI completa de Supabase/PostgreSQL o usar host + usuario + contraseña.';
  if (type === 'mysql' || type === 'mariadb') return 'Puedes pegar URI mysql:// / mariadb:// o usar host separado.';
  if (type === 'sqlserver') return 'Puedes pegar URI mssql:// o usar host/instancia. En Docker usa host.docker.internal.';
  if (type === 'redis') return 'Puedes pegar URI redis:// o rediss:// de Redis Cloud/TLS. Para reglas: target_table = patrón de clave.';
  if (type === 'neo4j') return 'Puedes pegar URI bolt://, neo4j:// o neo4j+s:// de Aura.';
  if (type === 'cassandra') return 'Puedes pegar URI cassandra://, multiples hosts separados por coma o secure_connect_bundle para Astra.';
  return 'Puedes pegar URI completa o usar host + usuario + contraseña.';
}

function hostLabel(type: ConnectionCreate['type']) {
  if (type === 'sqlite') return 'Ruta del archivo';
  if (type === 'neo4j') return 'URI Bolt/Neo4j o Host';
  return 'URI de conexión o Host';
}

function hostPlaceholder(type: ConnectionCreate['type']) {
  if (type === 'postgres') return 'postgresql://user:clave@host:5432/bd o db.xxx.supabase.co';
  if (type === 'mongodb') return 'mongodb+srv://usuario:clave@cluster.mongodb.net/ o cluster.mongodb.net';
  if (type === 'mysql') return 'mysql://user:clave@localhost:3306/bd o localhost';
  if (type === 'mariadb') return 'mariadb://user:clave@localhost:3306/bd o localhost';
  if (type === 'sqlserver') return 'host.docker.internal, DESKTOP\\SQLEXPRESS o mssql://user:clave@host:1433/bd';
  if (type === 'oracle') return 'oracle://user:clave@host:1521/servicio o oracle://user:clave@alias/servicio?config_dir=C:/wallet';
  if (type === 'redis') return 'rediss://default:clave@redis-cloud-host:port/0 o localhost';
  if (type === 'neo4j') return 'neo4j+s://neo4j:clave@xxxx.databases.neo4j.io:7687/neo4j o localhost';
  if (type === 'cassandra') return 'cassandra://user:clave@host:9042/keyspace?local_datacenter=datacenter1&ssl=true';
  return 'localhost';
}

function portHelp(type: ConnectionCreate['type'], port: number, host: string) {
  if (isUriLike(host)) return 'Si pegas una URI completa, Enmask usa el host/puerto/base incluidos en esa URI.';
  if (type === 'mongodb') return 'Si pegas una URI mongodb+srv completa, Enmask ignora el puerto. Para MongoDB local usa 27017.';
  if (type === 'postgres') return 'Supabase directo suele usar 5432; pooler de transacción suele usar 6543.';
  if (type === 'sqlserver') return 'SQL Server usa 1433 por TCP. Enmask trabaja con schema.tabla, ejemplo dbo.Clientes o SalesLT.Customer.';
  if (port === 0) return 'Este motor no necesita puerto explícito o lo obtiene de la URI.';
  return '';
}

export default function Connections({ addToast }: Props) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [supported, setSupported] = useState<SupportedDatabaseInfo[]>(fallbackDatabases);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<ConnectionCreate>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [showDiscoverModal, setShowDiscoverModal] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [suggestions, setSuggestions] = useState<RuleCreate[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<number[]>([]);
  const [creatingSuggestions, setCreatingSuggestions] = useState(false);

  const capabilityByType = useMemo(() => {
    return Object.fromEntries(supported.map(db => [db.type, db])) as Record<ConnectionCreate['type'], SupportedDatabaseInfo>;
  }, [supported]);

  const selectedCapability = capabilityByType[form.type] ?? fallbackDatabases[0];

  const load = async () => {
    setLoading(true);
    try {
      const [items, dbs] = await Promise.all([getConnections(), getSupportedDatabases().catch(() => fallbackDatabases)]);
      setConnections(items);
      setSupported(dbs);
    } catch {
      addToast('No se pudieron cargar las conexiones', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleTypeChange = (t: ConnectionCreate['type']) => {
    const cap = capabilityByType[t] ?? fallbackDatabases.find(db => db.type === t);
    const port = cap?.default_port ?? 0;
    const host = t === 'sqlite' ? 'local-file' : (form.host === 'local-file' ? 'localhost' : form.host || 'localhost');
    setForm(prev => ({
      ...prev,
      type: t,
      host,
      port,
      database: defaultDatabaseValue(t),
      username: t === 'sqlite' ? '' : prev.username,
      password: t === 'sqlite' ? '' : prev.password,
    }));
  };

  const handleTestForm = async () => {
    setTesting(true);
    try {
      const result = await testConnection(form);
      addToast(result.message, result.success ? 'success' : 'error');
    } catch (err: unknown) {
      addToast((err as Error).message ?? 'No se pudo probar la conexión', 'error');
    } finally {
      setTesting(false);
    }
  };

  const handleTestExisting = async (conn: Connection) => {
    try {
      const result = await testExistingConnection(conn.id);
      addToast(`${conn.name}: ${result.message}`, result.success ? 'success' : 'error');
    } catch (err: unknown) {
      addToast((err as Error).message ?? 'No se pudo probar la conexión', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createConnection(form);
      addToast('Conexión creada correctamente', 'success');
      setShowModal(false);
      setForm(defaultForm);
      load();
    } catch (err: unknown) {
      addToast((err as Error).message ?? 'No se pudo crear la conexión', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`¿Eliminar la conexión "${name}"?`)) return;
    try {
      await deleteConnection(id);
      addToast(`Conexión "${name}" eliminada`, 'success');
      load();
    } catch { addToast('No se pudo eliminar la conexión', 'error'); }
  };

  const handleDiscover = async (id: string) => {
    setDiscovering(true);
    setShowDiscoverModal(true);
    setSuggestions([]);
    setSelectedSuggestions([]);
    try {
      const data = await discoverPii(id);
      setSuggestions(data);
      setSelectedSuggestions(data.map((_, idx) => idx));
      if (data.length === 0) addToast('No se detectaron columnas sensibles', 'info');
    } catch (err: unknown) {
      addToast((err as Error).message ?? 'Falló el descubrimiento', 'error');
      setShowDiscoverModal(false);
    } finally {
      setDiscovering(false);
    }
  };

  const toggleSuggestion = (idx: number) => {
    setSelectedSuggestions(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
  };

  const handleCreateSuggestions = async () => {
    setCreatingSuggestions(true);
    try {
      const selectedRules = selectedSuggestions.map(idx => suggestions[idx]);
      for (const rule of selectedRules) await createRule(rule);
      addToast(`${selectedRules.length} reglas creadas correctamente`, 'success');
      setShowDiscoverModal(false);
    } catch (err: unknown) {
      addToast((err as Error).message ?? 'No se pudieron crear las reglas', 'error');
    } finally {
      setCreatingSuggestions(false);
    }
  };

  const hostIsUri = isUriLike(form.host);
  const requiresUsername = form.type !== 'sqlite' && form.type !== 'redis' && !hostIsUri;
  const passwordHint = form.type === 'mysql' || form.type === 'mariadb'
    ? 'Déjalo vacío si tu usuario no tiene contraseña. En XAMPP suele ocurrir con root.'
    : hostIsUri
      ? 'Puedes dejarlo vacío si la URI ya trae usuario y contraseña. Enmask codifica caracteres especiales automáticamente.'
      : 'Opcional: complétalo solo si el motor lo exige.';

  return (
    <div className="page-content">
      <div className="card">
        <div className="card-header">
          <h2>Conexiones de Bases de Datos</h2>
          <button id="btn-add-connection" className="btn btn-primary" onClick={() => setShowModal(true)}>
            + Nueva conexión
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : connections.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">⬡</div>
            <h3>No hay conexiones todavía</h3>
            <p>Agrega PostgreSQL, MySQL/MariaDB, SQLite, SQL Server, Oracle, Cassandra, MongoDB, Redis o Neo4j.</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>Agregar conexión</button>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Motor</th>
                  <th>Host / Puerto</th>
                  <th>BD / Servicio</th>
                  <th>Usuario</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {connections.map(c => {
                  const cap = capabilityByType[c.type] ?? fallbackDatabases.find(db => db.type === c.type);
                  return (
                    <tr key={c.id}>
                      <td><span className="cell-primary">{c.name}</span></td>
                      <td><span className={`badge ${databaseBadges[c.type]}`}>{cap?.label ?? c.type}</span></td>
                      <td>{c.type === 'sqlite' ? 'archivo local' : `${c.host}:${c.port}`}</td>
                      <td>{c.database}</td>
                      <td>{c.username || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn btn-secondary btn-icon" onClick={() => handleTestExisting(c)} title="Probar conexión">⚡</button>
                          <button className="btn btn-secondary btn-icon" onClick={() => handleDiscover(c.id)} title="Descubrir PII">🔍</button>
                          <button className="btn btn-danger btn-icon" onClick={() => handleDelete(c.id, c.name)} title="Eliminar conexión" id={`btn-delete-conn-${c.id}`}>✕</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nueva conexión</h2>
              <button className="modal-close" id="btn-close-conn-modal" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="conn-name">Nombre de conexión</label>
                  <input id="conn-name" required value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Ej. Base de clientes" />
                </div>
                <div className="form-group">
                  <label htmlFor="conn-type">Motor de base de datos</label>
                  <select id="conn-type" value={form.type}
                    onChange={e => handleTypeChange(e.target.value as ConnectionCreate['type'])}>
                    {supported.map(db => <option key={db.type} value={db.type}>{db.label} · {db.category}</option>)}
                  </select>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                    Puerto por defecto: {selectedCapability.default_port || 'no usa'} · {placeholderForTarget(form.type)}
                  </p>
                </div>
                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label htmlFor="conn-host">{hostLabel(form.type)}</label>
                    <input id="conn-host" required={selectedCapability.requires_host} disabled={!selectedCapability.requires_host} value={form.host}
                      onChange={e => setForm(p => ({ ...p, host: e.target.value }))}
                      placeholder={hostPlaceholder(form.type)} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="conn-port">Puerto</label>
                    <input id="conn-port" type="number" required value={form.port}
                      disabled={form.type === 'sqlite'}
                      onChange={e => setForm(p => ({ ...p, port: Number(e.target.value) }))} />
                    {portHelp(form.type, form.port, form.host) && (
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{portHelp(form.type, form.port, form.host)}</p>
                    )}
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="conn-database">{selectedCapability.database_label}</label>
                  <input id="conn-database" required={!hostIsUri} value={form.database}
                    onChange={e => setForm(p => ({ ...p, database: e.target.value }))}
                    placeholder={defaultDatabaseValue(form.type) || 'nombre_bd'} />
                </div>
                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label htmlFor="conn-user">Usuario</label>
                    <input id="conn-user" required={requiresUsername} value={form.username}
                      onChange={e => setForm(p => ({ ...p, username: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="conn-pass">Contraseña <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>(opcional)</span></label>
                    <input id="conn-pass" type="password" value={form.password}
                      onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                      placeholder="Sin contraseña" />
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{passwordHint}</p>
                  </div>
                </div>
                {selectedCapability.notes && (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{selectedCapability.notes}</p>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="button" className="btn btn-secondary" onClick={handleTestForm} disabled={testing}>
                  {testing ? <><span className="spinner" />Probando…</> : 'Probar conexión'}
                </button>
                <button type="submit" id="btn-submit-connection" className="btn btn-primary" disabled={saving}>
                  {saving ? <><span className="spinner" />Guardando…</> : 'Guardar conexión'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDiscoverModal && (
        <div className="modal-overlay" onClick={() => setShowDiscoverModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%' }}>
            <div className="modal-header">
              <h2>Descubrir datos sensibles</h2>
              <button className="modal-close" onClick={() => setShowDiscoverModal(false)}>×</button>
            </div>
            <div style={{ padding: '0 24px' }}>
              {discovering ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <div className="spinner" style={{ margin: '0 auto' }} />
                  <p style={{ marginTop: 16 }}>Analizando esquema y campos sensibles...</p>
                </div>
              ) : suggestions.length === 0 ? (
                <div className="empty-state"><p>No se detectaron columnas sensibles en esta conexión.</p></div>
              ) : (
                <>
                  <p style={{ marginBottom: 16 }}>Se encontraron {suggestions.length} campos posiblemente sensibles. Selecciona cuáles convertir en reglas.</p>
                  <div className="table-wrapper" style={{ maxHeight: '400px', overflow: 'auto' }}>
                    <table>
                      <thead>
                        <tr><th style={{ width: 40 }}></th><th>Tabla/Colección</th><th>Campo</th><th>Estrategia sugerida</th></tr>
                      </thead>
                      <tbody>
                        {suggestions.map((s, idx) => (
                          <tr key={idx}>
                            <td><input type="checkbox" checked={selectedSuggestions.includes(idx)} onChange={() => toggleSuggestion(idx)} style={{ accentColor: 'var(--color-accent)', width: 16, height: 16 }} /></td>
                            <td>{s.target_table}</td>
                            <td><strong>{s.target_column}</strong></td>
                            <td><span className="badge badge-info">{s.strategy}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDiscoverModal(false)}>Cerrar</button>
              {!discovering && suggestions.length > 0 && (
                <button className="btn btn-primary" onClick={handleCreateSuggestions} disabled={selectedSuggestions.length === 0 || creatingSuggestions}>
                  {creatingSuggestions ? <><span className="spinner" />Creando…</> : `Crear ${selectedSuggestions.length} reglas`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
