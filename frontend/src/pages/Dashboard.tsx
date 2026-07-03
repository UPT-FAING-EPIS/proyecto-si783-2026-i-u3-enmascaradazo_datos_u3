import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getConnections, getJobs, getRules, getSummary, getSupportedDatabases } from '../services/api';
import type { Connection, ConnectionType, JobStatus, MaskingJob, MaskingRule, ProtectionMode, Summary, SupportedDatabaseInfo } from '../types';

interface DashboardState {
  summary: Summary;
  connections: Connection[];
  rules: MaskingRule[];
  jobs: MaskingJob[];
  supported: SupportedDatabaseInfo[];
}

const emptySummary: Summary = {
  total_connections: 0,
  total_rules: 0,
  total_jobs: 0,
  total_records_processed: 0,
};

const protectionLabels: Record<ProtectionMode, string> = {
  virtual_view: 'Vista virtual',
  masked_view: 'Vista enmascarada',
  masked_column: 'Columna/campo derivado',
  static_mask: 'Máscara física',
  symmetric_encryption: 'Encriptación simétrica',
};

const statusLabels: Record<JobStatus, string> = {
  pending: 'Pendiente',
  running: 'En ejecución',
  completed: 'Completado',
  failed: 'Fallido',
  unmasked: 'Desenmascarado',
};

const engineAliases: Record<ConnectionType, string> = {
  postgres: 'PostgreSQL',
  mysql: 'MySQL',
  mariadb: 'MariaDB',
  sqlite: 'SQLite',
  sqlserver: 'SQL Server',
  oracle: 'Oracle',
  cassandra: 'Cassandra',
  mongodb: 'MongoDB',
  redis: 'Redis',
  neo4j: 'Neo4j',
};

const engineAccent: Record<ConnectionType, string> = {
  postgres: 'engine-postgres',
  mysql: 'engine-mysql',
  mariadb: 'engine-mariadb',
  sqlite: 'engine-sqlite',
  sqlserver: 'engine-sqlserver',
  oracle: 'engine-oracle',
  cassandra: 'engine-cassandra',
  mongodb: 'engine-mongodb',
  redis: 'engine-redis',
  neo4j: 'engine-neo4j',
};

const statCards = [
  { label: 'Conexiones activas', key: 'total_connections' as const, icon: '⬡', hint: 'Motores registrados para aplicar protección' },
  { label: 'Reglas definidas', key: 'total_rules' as const, icon: '◉', hint: 'Campos, columnas o propiedades sensibles' },
  { label: 'Jobs creados', key: 'total_jobs' as const, icon: '▶', hint: 'Ejecuciones dry-run, apply o unmask' },
  { label: 'Registros procesados', key: 'total_records_processed' as const, icon: '🔒', hint: 'Filas, documentos, claves o nodos protegidos' },
];

function countBy<T extends string>(values: T[]): Record<T, number> {
  return values.reduce((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {} as Record<T, number>);
}

function maxValue(values: number[]) {
  return Math.max(1, ...values);
}

function formatEndpoint(connection: Connection) {
  if (connection.type === 'sqlite') return connection.database;
  return `${connection.host}:${connection.port}`;
}

function statusClass(status: JobStatus) {
  if (status === 'completed') return 'badge-success';
  if (status === 'failed') return 'badge-danger';
  if (status === 'running') return 'badge-warning';
  if (status === 'unmasked') return 'badge-info';
  return 'badge-pending';
}

function BarRow({ label, value, total, helper }: { label: string; value: number; total: number; helper?: string }) {
  const width = Math.round((value / Math.max(1, total)) * 100);
  return (
    <div className="bar-row">
      <div className="bar-row-meta">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="bar-track" title={helper}>
        <div className="bar-fill" style={{ width: `${width}%` }} />
      </div>
      {helper && <small>{helper}</small>}
    </div>
  );
}

function DonutChart({ completed, failed, pending }: { completed: number; failed: number; pending: number }) {
  const total = completed + failed + pending;
  const completedPercent = total ? Math.round((completed / total) * 100) : 0;
  const failedPercent = total ? Math.round((failed / total) * 100) : 0;
  const gradient = total
    ? `conic-gradient(var(--color-success) 0 ${completedPercent}%, var(--color-danger) ${completedPercent}% ${completedPercent + failedPercent}%, var(--color-warning) ${completedPercent + failedPercent}% 100%)`
    : 'conic-gradient(var(--color-border) 0 100%)';

  return (
    <div className="donut-wrap">
      <div className="donut" style={{ background: gradient }}>
        <div className="donut-hole">
          <strong>{total}</strong>
          <span>jobs</span>
        </div>
      </div>
      <div className="donut-legend">
        <span><i className="dot success" /> Completados: {completed}</span>
        <span><i className="dot danger" /> Fallidos: {failed}</span>
        <span><i className="dot warning" /> Pendientes/ejecución: {pending}</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [state, setState] = useState<DashboardState>({
    summary: emptySummary,
    connections: [],
    rules: [],
    jobs: [],
    supported: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const [summaryResult, connectionsResult, rulesResult, jobsResult, supportedResult] = await Promise.allSettled([
      getSummary(),
      getConnections(),
      getRules(),
      getJobs(),
      getSupportedDatabases(),
    ]);

    const nextState: DashboardState = {
      summary: summaryResult.status === 'fulfilled' ? summaryResult.value : emptySummary,
      connections: connectionsResult.status === 'fulfilled' ? connectionsResult.value : [],
      rules: rulesResult.status === 'fulfilled' ? rulesResult.value : [],
      jobs: jobsResult.status === 'fulfilled' ? jobsResult.value : [],
      supported: supportedResult.status === 'fulfilled' ? supportedResult.value : [],
    };

    if ([summaryResult, connectionsResult, rulesResult, jobsResult, supportedResult].some(result => result.status === 'rejected')) {
      setError('Algunos indicadores no pudieron cargarse. Verifica que el backend esté activo y que tu sesión siga vigente.');
    }
    setState(nextState);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const metrics = useMemo(() => {
    const engines = countBy(state.connections.map(connection => connection.type));
    const categories = state.connections.reduce<Record<string, number>>((acc, connection) => {
      const capability = state.supported.find(item => item.type === connection.type);
      const category = capability?.category ?? 'Sin categoría';
      acc[category] = (acc[category] ?? 0) + 1;
      return acc;
    }, {});
    const protections = countBy(state.rules.map(rule => rule.protection_mode));
    const statuses = countBy(state.jobs.map(job => job.status));
    const jobsProcessed = state.jobs.reduce((sum, job) => sum + (job.records_processed ?? 0), 0);
    const generatedArtifacts = state.jobs.reduce((sum, job) => sum + (job.generated_artifacts?.length ?? 0), 0);
    const latestJobs = [...state.jobs]
      .sort((a, b) => String(b.started_at ?? b.completed_at ?? '').localeCompare(String(a.started_at ?? a.completed_at ?? '')))
      .slice(0, 5);
    const recentConnections = state.connections.slice(-5).reverse();

    return {
      engines,
      categories,
      protections,
      statuses,
      jobsProcessed,
      generatedArtifacts,
      latestJobs,
      recentConnections,
    };
  }, [state]);

  const maxEngineCount = maxValue(Object.values(metrics.engines));
  const maxProtectionCount = maxValue(Object.values(metrics.protections));
  const completedJobs = metrics.statuses.completed ?? 0;
  const failedJobs = metrics.statuses.failed ?? 0;
  const pendingJobs = (metrics.statuses.pending ?? 0) + (metrics.statuses.running ?? 0) + (metrics.statuses.unmasked ?? 0);

  return (
    <div className="page-content dashboard-page">
      <section className="hero-panel">
        <div>
          <span className="eyebrow">Centro de control</span>
          <h2>Protección de datos sensible por motor, regla y job</h2>
          <p>
            Supervisa conexiones SQL, NoSQL y grafos; revisa el avance de jobs, los modos de protección aplicados y los artefactos generados sin tocar datos originales cuando se usa enmascaramiento no destructivo.
          </p>
        </div>
        <div className="hero-actions">
          <button className="btn btn-secondary" onClick={load} disabled={loading}>{loading ? 'Actualizando...' : 'Actualizar métricas'}</button>
          <Link className="btn btn-primary" to="/connections">Nueva conexión</Link>
        </div>
      </section>

      {error && <div className="dashboard-alert">{error}</div>}

      <div className="stats-grid dashboard-stats">
        {statCards.map(card => (
          <div key={card.key} className="stat-card stat-card-pro">
            <div className="stat-icon">{card.icon}</div>
            <div className="stat-info">
              {loading ? <div className="spinner" /> : <div className="stat-value">{state.summary[card.key] ?? 0}</div>}
              <div className="stat-label">{card.label}</div>
              <p>{card.hint}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid dashboard-grid-main">
        <div className="card dashboard-card wide-card">
          <div className="card-header compact-header">
            <div>
              <h2>Conexiones por motor</h2>
              <p>Distribución de bases registradas en esta sesión/usuario.</p>
            </div>
            <span className="badge badge-info">{state.supported.length} motores disponibles</span>
          </div>

          {state.connections.length === 0 ? (
            <div className="empty-inline">Aún no hay conexiones. Registra una base para ver el gráfico.</div>
          ) : (
            <div className="engine-chart">
              {Object.entries(metrics.engines).map(([type, value]) => (
                <div key={type} className="engine-column">
                  <div className="engine-bar-shell">
                    <div
                      className={`engine-bar ${engineAccent[type as ConnectionType]}`}
                      style={{ height: `${Math.max(12, (value / maxEngineCount) * 100)}%` }}
                    />
                  </div>
                  <strong>{value}</strong>
                  <span>{engineAliases[type as ConnectionType] ?? type}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card dashboard-card">
          <div className="card-header compact-header">
            <div>
              <h2>Estado de jobs</h2>
              <p>Resumen operativo de ejecuciones.</p>
            </div>
          </div>
          <DonutChart completed={completedJobs} failed={failedJobs} pending={pendingJobs} />
        </div>
      </div>

      <div className="dashboard-grid dashboard-grid-secondary">
        <div className="card dashboard-card">
          <div className="card-header compact-header">
            <div>
              <h2>Modos de protección</h2>
              <p>Cómo se están protegiendo los datos.</p>
            </div>
          </div>
          {state.rules.length === 0 ? (
            <div className="empty-inline">Aún no hay reglas de protección.</div>
          ) : (
            <div className="bar-list">
              {Object.entries(metrics.protections).map(([mode, value]) => (
                <BarRow
                  key={mode}
                  label={protectionLabels[mode as ProtectionMode] ?? mode}
                  value={value}
                  total={maxProtectionCount}
                  helper={mode === 'masked_column' ? 'Ideal para columnas/campos derivados' : undefined}
                />
              ))}
            </div>
          )}
        </div>

        <div className="card dashboard-card">
          <div className="card-header compact-header">
            <div>
              <h2>Familias de motores</h2>
              <p>Relacional, documental, clave-valor, wide-column o grafo.</p>
            </div>
          </div>
          {Object.keys(metrics.categories).length === 0 ? (
            <div className="empty-inline">Sin conexiones categorizadas.</div>
          ) : (
            <div className="category-list">
              {Object.entries(metrics.categories).map(([category, value]) => (
                <div key={category} className="category-item">
                  <span>{category}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card dashboard-card">
          <div className="card-header compact-header">
            <div>
              <h2>Artefactos generados</h2>
              <p>Vistas, columnas/campos, propiedades o cifrados creados por jobs.</p>
            </div>
          </div>
          <div className="artifact-summary">
            <strong>{metrics.generatedArtifacts}</strong>
            <span>artefactos registrados</span>
            <p>{metrics.jobsProcessed} registros procesados por jobs ejecutados.</p>
          </div>
        </div>
      </div>

      <div className="dashboard-grid dashboard-grid-main">
        <div className="card dashboard-card wide-card">
          <div className="card-header compact-header">
            <div>
              <h2>Conexiones recientes</h2>
              <p>Vista rápida de motores, endpoint y base/keyspace/database.</p>
            </div>
          </div>
          {metrics.recentConnections.length === 0 ? (
            <div className="empty-inline">No hay conexiones registradas.</div>
          ) : (
            <div className="table-wrapper dashboard-table">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Motor</th>
                    <th>Endpoint</th>
                    <th>Base / Keyspace</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.recentConnections.map(connection => (
                    <tr key={connection.id}>
                      <td><span className="cell-primary">{connection.name}</span></td>
                      <td><span className="engine-pill">{engineAliases[connection.type]}</span></td>
                      <td>{formatEndpoint(connection)}</td>
                      <td>{connection.database}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card dashboard-card">
          <div className="card-header compact-header">
            <div>
              <h2>Últimos jobs</h2>
              <p>Control de ejecución y desenmascaramiento.</p>
            </div>
          </div>
          {metrics.latestJobs.length === 0 ? (
            <div className="empty-inline">Aún no se crearon jobs.</div>
          ) : (
            <div className="job-feed">
              {metrics.latestJobs.map(job => (
                <div key={job.id} className="job-feed-item">
                  <div>
                    <strong>{job.run_mode === 'dry_run' ? 'Simulación' : 'Aplicación real'}</strong>
                    <span>{job.records_processed || job.records_previewed || 0} registros</span>
                  </div>
                  <span className={`badge ${statusClass(job.status)}`}>{statusLabels[job.status]}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card workflow-card">
        <div className="card-header compact-header">
          <div>
            <h2>Flujo recomendado de uso</h2>
            <p>Ruta segura para demostrar el sistema en localhost.</p>
          </div>
        </div>
        <div className="workflow-steps">
          <div><span>1</span><strong>Conectar</strong><p>Registra el motor y prueba credenciales.</p></div>
          <div><span>2</span><strong>Crear regla</strong><p>Elige tabla/campo o label/propiedad en Neo4j.</p></div>
          <div><span>3</span><strong>Dry-run</strong><p>Previsualiza sin tocar la base real.</p></div>
          <div><span>4</span><strong>Apply / Unmask</strong><p>Aplica vista, campo derivado, cifrado o restauración.</p></div>
        </div>
      </div>
    </div>
  );
}
