import { useEffect, useState, useCallback } from 'react';
import { getJobs, createJob, runJob, unmaskJob, getJob, deleteJob, getConnections, getRules, queryJob, getAuditLog } from '../services/api';
import type { MaskingJob, JobCreate, Connection, MaskingRule, JobStatus, AuditLogEntry, MaskingRunMode, ProtectionMode } from '../types';
import type { ToastType } from '../hooks/useToast';

interface Props { addToast: (msg: string, type?: ToastType) => void; }

const statusBadge: Record<JobStatus, string> = {
  pending: 'badge-pending',
  running: 'badge-warning',
  completed: 'badge-success',
  failed: 'badge-danger',
  unmasked: 'badge-info',
};

const modeLabel: Record<MaskingRunMode, string> = {
  dry_run: 'Dry-run',
  apply: 'Apply',
};

const protectionLabels: Record<ProtectionMode, string> = {
  virtual_view: 'Vista virtual',
  masked_view: 'Vista enmascarada',
  masked_column: 'Campo derivado',
  static_mask: 'Máscara física',
  symmetric_encryption: 'Encriptación simétrica',
};

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString();
}

function hasApplyArtifacts(job: MaskingJob) {
  return job.run_mode === 'apply' && job.status === 'completed';
}

export default function Jobs({ addToast }: Props) {
  const [jobs, setJobs] = useState<MaskingJob[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [rules, setRules] = useState<MaskingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedConn, setSelectedConn] = useState('');
  const [selectedRules, setSelectedRules] = useState<string[]>([]);
  const [runMode, setRunMode] = useState<MaskingRunMode>('dry_run');
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<Set<string>>(new Set());

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([]);
  const [previewIsMasked, setPreviewIsMasked] = useState<boolean>(false);
  const [previewingJob, setPreviewingJob] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewMaskPreference, setPreviewMaskPreference] = useState<boolean>(true);

  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditingJob, setAuditingJob] = useState<string | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [j, c, r] = await Promise.all([getJobs(), getConnections(), getRules()]);
      setJobs(j);
      setConnections(c);
      setRules(r);
    } catch {
      addToast('No se pudo cargar el historial de jobs', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  const getConnectionName = (id: string) =>
    connections.find(c => c.id === id)?.name ?? id.slice(0, 8) + '…';

  const getJobRules = (job: MaskingJob) => rules.filter(r => job.rule_ids.includes(r.id));

  const hasPhysicalOrRestorableRule = (job: MaskingJob) =>
    getJobRules(job).some(r => ['masked_view', 'masked_column', 'static_mask', 'symmetric_encryption'].includes(r.protection_mode));

  const toggleRule = (id: string) =>
    setSelectedRules(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);

  const filteredRules = rules.filter(r => r.connection_id === selectedConn);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConn) { addToast('Selecciona una conexión', 'error'); return; }
    if (selectedRules.length < 1) { addToast('Selecciona al menos una regla', 'error'); return; }
    setSaving(true);
    try {
      await createJob({ connection_id: selectedConn, rule_ids: selectedRules, run_mode: runMode } as JobCreate);
      addToast('Job creado correctamente', 'success');
      setShowModal(false);
      setSelectedConn('');
      setSelectedRules([]);
      setRunMode('dry_run');
      load();
    } catch (err: unknown) {
      addToast((err as Error).message ?? 'No se pudo crear el job', 'error');
    } finally { setSaving(false); }
  };

  const pollJob = async (jobId: string, successMessage: (job: MaskingJob) => string) => {
    const updated = await getJob(jobId);
    setJobs(prev => prev.map(j => j.id === jobId ? updated : j));
    if (updated.status === 'running' || updated.status === 'pending' || updated.status === 'completed') {
      if (updated.status === 'completed' && successMessage(updated).includes('restaur')) {
        setTimeout(() => pollJob(jobId, successMessage), 1200);
        return;
      }
      if (updated.status === 'running' || updated.status === 'pending') {
        setTimeout(() => pollJob(jobId, successMessage), 1500);
        return;
      }
    }
    setRunning(prev => { const s = new Set(prev); s.delete(jobId); return s; });
    if (updated.status === 'completed' || updated.status === 'unmasked') {
      addToast(successMessage(updated), 'success');
    } else if (updated.status === 'failed') {
      addToast(updated.error_message ?? 'El job falló', 'error');
    }
  };

  const handleRun = async (job: MaskingJob) => {
    setRunning(prev => new Set(prev).add(job.id));
    try {
      await runJob(job.id);
      addToast('Job iniciado en segundo plano', 'info');
      setTimeout(() => pollJob(job.id, updated =>
        updated.run_mode === 'dry_run'
          ? `Previsualización completada: ${updated.records_previewed} registros evaluados`
          : `Apply completado: ${updated.records_processed} registros procesados y ${updated.generated_artifacts?.length || 0} artefactos generados`
      ), 1200);
    } catch (err: unknown) {
      addToast((err as Error).message ?? 'No se pudo ejecutar el job', 'error');
      setRunning(prev => { const s = new Set(prev); s.delete(job.id); return s; });
    }
  };

  const handleRestore = async (job: MaskingJob) => {
    const rulesForJob = getJobRules(job);
    const hasStatic = rulesForJob.some(r => r.protection_mode === 'static_mask');
    const hasEncryption = rulesForJob.some(r => r.protection_mode === 'symmetric_encryption');
    const message = hasStatic || hasEncryption
      ? 'Esto restaurará datos físicos desde el vault o descifrará con la llave simétrica configurada. ¿Continuar?'
      : 'Esto eliminará vistas, columnas/campos derivados o artefactos generados. ¿Continuar?';
    if (!window.confirm(message)) return;

    setRunning(prev => new Set(prev).add(job.id));
    try {
      await unmaskJob(job.id);
      addToast('Restauración iniciada en segundo plano', 'info');
      const pollRestore = async () => {
        const updated = await getJob(job.id);
        setJobs(prev => prev.map(j => j.id === job.id ? updated : j));
        if (updated.status === 'running' || updated.status === 'pending' || updated.status === 'completed') {
          setTimeout(pollRestore, 1500);
          return;
        }
        setRunning(prev => { const s = new Set(prev); s.delete(job.id); return s; });
        if (updated.status === 'unmasked') {
          addToast('Job restaurado correctamente', 'success');
        } else if (updated.status === 'failed') {
          addToast(updated.error_message ?? 'No se pudo restaurar el job', 'error');
        }
      };
      setTimeout(pollRestore, 1200);
    } catch (err: unknown) {
      addToast((err as Error).message ?? 'No se pudo restaurar el job', 'error');
      setRunning(prev => { const s = new Set(prev); s.delete(job.id); return s; });
    }
  };

  const handleDelete = async (job: MaskingJob) => {
    const warning = hasApplyArtifacts(job) && hasPhysicalOrRestorableRule(job)
      ? 'Este job tiene artefactos o datos aplicados. Primero debes restaurarlo antes de eliminarlo. ¿Quieres intentar eliminarlo de todos modos?'
      : '¿Eliminar este masking job del historial?';
    if (!window.confirm(warning)) return;
    setDeleting(prev => new Set(prev).add(job.id));
    try {
      await deleteJob(job.id, false);
      addToast('Job eliminado', 'success');
      load();
    } catch (err: unknown) {
      addToast((err as Error).message ?? 'No se pudo eliminar. Si el job está aplicado, restáuralo primero.', 'error');
    } finally {
      setDeleting(prev => { const s = new Set(prev); s.delete(job.id); return s; });
    }
  };

  const handlePreview = async (jobId: string) => {
    setPreviewingJob(jobId);
    setShowPreviewModal(true);
    setPreviewLoading(true);
    setPreviewData([]);
    setPreviewMaskPreference(true);
    try {
      const response = await queryJob(jobId, true);
      setPreviewData(response.data || []);
      setPreviewIsMasked(response.is_masked);
    } catch (err: unknown) {
      addToast((err as Error).message ?? 'No se pudo consultar los datos', 'error');
      setShowPreviewModal(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleToggleMasking = async () => {
    if (!previewingJob) return;
    setPreviewLoading(true);
    try {
      const newMaskPref = !previewMaskPreference;
      const response = await queryJob(previewingJob, newMaskPref);
      setPreviewData(response.data || []);
      setPreviewIsMasked(response.is_masked);
      setPreviewMaskPreference(newMaskPref);
      addToast(newMaskPref ? 'Mostrando datos protegidos' : 'Mostrando datos originales', 'info');
    } catch (err: unknown) {
      addToast((err as Error).message ?? 'No se pudo alternar la vista', 'error');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleShowAudit = async (jobId: string) => {
    setAuditingJob(jobId);
    setShowAuditModal(true);
    setAuditLoading(true);
    setAuditLogs([]);
    try {
      const logs = await getAuditLog(jobId);
      setAuditLogs(logs);
    } catch (err: unknown) {
      addToast((err as Error).message ?? 'No se pudo cargar la auditoría', 'error');
      setShowAuditModal(false);
    } finally {
      setAuditLoading(false);
    }
  };

  return (
    <div className="page-content">
      <div className="card">
        <div className="card-header">
          <div>
            <h2>Historial de Jobs</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>
              Ejecuta, restaura, consulta, audita o elimina jobs de enmascaramiento.
            </p>
          </div>
          <button id="btn-add-job" className="btn btn-primary" onClick={() => setShowModal(true)}>
            + Nuevo job
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : jobs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">▶</div>
            <h3>No hay jobs todavía</h3>
            <p>Crea un job desde Protección de Datos o desde este panel.</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>Crear job</button>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Conexión</th>
                  <th>Reglas</th>
                  <th>Modo</th>
                  <th>Estado</th>
                  <th>Registros / artefactos</th>
                  <th>Inicio</th>
                  <th>Fin</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(j => {
                  const jobRules = getJobRules(j);
                  const canRestore = j.status === 'completed' && j.run_mode === 'apply';
                  const canDelete = j.status !== 'running';
                  return (
                    <tr key={j.id}>
                      <td><span className="cell-primary">{getConnectionName(j.connection_id)}</span></td>
                      <td>
                        <div>{j.rule_ids.length} regla{j.rule_ids.length !== 1 ? 's' : ''}</div>
                        <small style={{ color: 'var(--text-muted)' }}>
                          {jobRules.slice(0, 2).map(r => `${r.target_column}: ${protectionLabels[r.protection_mode]}`).join(' · ')}
                          {jobRules.length > 2 ? '…' : ''}
                        </small>
                      </td>
                      <td><span className={`badge ${j.run_mode === 'apply' ? 'badge-danger' : 'badge-info'}`}>{modeLabel[j.run_mode]}</span></td>
                      <td><span className={`badge ${statusBadge[j.status]}`}>{j.status}</span></td>
                      <td>{j.run_mode === 'apply' ? `${j.records_processed.toLocaleString()} procesados · ${(j.generated_artifacts?.length || 0)} artefactos` : `${j.records_previewed.toLocaleString()} evaluados`}</td>
                      <td style={{ fontSize: 12 }}>{formatDate(j.started_at)}</td>
                      <td style={{ fontSize: 12 }}>{formatDate(j.completed_at)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {j.status !== 'running' && j.status !== 'unmasked' && (
                            <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => handleRun(j)} disabled={running.has(j.id)} title="Ejecutar job">
                              {running.has(j.id) ? '⌛' : '▶ Ejecutar'}
                            </button>
                          )}
                          {canRestore && (
                            <button className="btn btn-warning" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => handleRestore(j)} disabled={running.has(j.id)} title="Restaurar: elimina artefactos, restaura desde vault o descifra con llave simétrica">
                              {running.has(j.id) ? '⌛' : '↺ Restaurar'}
                            </button>
                          )}
                          <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => handlePreview(j.id)} title="Consultar datos protegidos/originales">
                            👁 Consultar
                          </button>
                          <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => handleShowAudit(j.id)} title="Ver auditoría">
                            📋 Auditoría
                          </button>
                          {canDelete && (
                            <button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => handleDelete(j)} disabled={deleting.has(j.id)} title="Eliminar job del historial">
                              {deleting.has(j.id) ? '⌛' : '🗑 Eliminar'}
                            </button>
                          )}
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
              <h2>Crear masking job</h2>
              <button className="modal-close" id="btn-close-job-modal" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="job-conn">Conexión</label>
                  <select id="job-conn" value={selectedConn} onChange={e => { setSelectedConn(e.target.value); setSelectedRules([]); }}>
                    <option value="">Selecciona una conexión…</option>
                    {connections.map(c => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="job-mode">Tipo de ejecución</label>
                  <select id="job-mode" value={runMode} onChange={e => setRunMode(e.target.value as MaskingRunMode)}>
                    <option value="dry_run">Dry-run · simular sin modificar</option>
                    <option value="apply">Apply · aplicar según modo de cada regla</option>
                  </select>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                    Apply puede crear vistas/campos derivados, aplicar máscara física o encriptar. Luego puedes usar Restaurar.
                  </p>
                </div>
                {selectedConn && (
                  <div className="form-group">
                    <label>Reglas</label>
                    {filteredRules.length === 0 ? (
                      <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' }}>No hay reglas para esta conexión.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto', padding: '4px 0' }}>
                        {filteredRules.map(r => (
                          <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, color: 'var(--text-secondary)' }}>
                            <input type="checkbox" id={`check-rule-${r.id}`} checked={selectedRules.includes(r.id)} onChange={() => toggleRule(r.id)} style={{ accentColor: 'var(--color-accent)', width: 16, height: 16 }} />
                            <span><strong style={{ color: 'var(--text-primary)' }}>{r.name}</strong>&nbsp;·&nbsp;{r.target_table}.{r.target_column} · {protectionLabels[r.protection_mode]}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" id="btn-submit-job" className="btn btn-primary" disabled={saving}>{saving ? <><span className="spinner" />Creando…</> : 'Crear job'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPreviewModal && previewingJob && (
        <div className="modal-overlay" onClick={() => setShowPreviewModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 900, width: '90%' }}>
            <div className="modal-header">
              <h2>Consulta del job</h2>
              <button className="modal-close" onClick={() => setShowPreviewModal(false)}>×</button>
            </div>
            <div style={{ padding: '0 24px' }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <span className={`badge ${previewIsMasked ? 'badge-warning' : 'badge-success'}`}>
                  {previewIsMasked ? '🔒 Datos protegidos' : '🔓 Datos originales'}
                </span>
              </div>
              {previewLoading ? (
                <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
              ) : previewData.length === 0 ? (
                <div className="empty-state"><p>No se encontraron registros.</p></div>
              ) : (
                <div className="table-wrapper" style={{ maxHeight: 420, overflow: 'auto' }}>
                  <table>
                    <thead><tr>{Object.keys(previewData[0]).map(k => <th key={k}>{k}</th>)}</tr></thead>
                    <tbody>{previewData.map((row, i) => <tr key={i}>{Object.values(row).map((v, j) => <td key={j}>{String(v)}</td>)}</tr>)}</tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={handleToggleMasking} disabled={previewLoading || previewData.length === 0}>
                {previewMaskPreference ? 'Ver original' : 'Ver protegido'}
              </button>
              <button className="btn btn-secondary" onClick={() => setShowPreviewModal(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {showAuditModal && auditingJob && (
        <div className="modal-overlay" onClick={() => setShowAuditModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 800, width: '90%' }}>
            <div className="modal-header">
              <h2>Auditoría</h2>
              <button className="modal-close" onClick={() => setShowAuditModal(false)}>×</button>
            </div>
            <div style={{ padding: '0 24px' }}>
              {auditLoading ? (
                <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
              ) : auditLogs.length === 0 ? (
                <div className="empty-state"><p>Todavía no hay consultas auditadas.</p></div>
              ) : (
                <div className="table-wrapper" style={{ maxHeight: 420, overflow: 'auto' }}>
                  <table>
                    <thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>¿Enmascarado?</th></tr></thead>
                    <tbody>{auditLogs.map(log => (
                      <tr key={log.id}>
                        <td>{formatDate(log.timestamp)}</td>
                        <td>{log.user_email}</td>
                        <td>{log.action}</td>
                        <td><span className={`badge ${log.is_masked ? 'badge-warning' : 'badge-success'}`}>{log.is_masked ? 'Sí' : 'No'}</span></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowAuditModal(false)}>Cerrar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
