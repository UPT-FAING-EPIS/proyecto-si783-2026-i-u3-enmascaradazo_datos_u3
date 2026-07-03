import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createJob,
  createRule,
  getConnections,
  getJob,
  getJobs,
  getWorkbenchRecords,
  getWorkbenchSchema,
  previewWorkbenchMask,
  runJob,
  unmaskJob,
} from '../services/api';
import type {
  Connection,
  GraphElementKind,
  JobCreate,
  MaskingJob,
  MaskingRule,
  MaskingRunMode,
  MaskingStrategyType,
  ProtectionMode,
  RuleCreate,
  SchemaTarget,
  TablePreviewResponse,
  WorkbenchFieldRuleRequest,
  WorkbenchMaskPreviewResponse,
} from '../types';

interface Props {
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

type FieldConfig = {
  column: string;
  strategy: MaskingStrategyType;
  protection_mode: ProtectionMode;
  strategy_options: Record<string, unknown>;
};

const strategyOptions: { value: MaskingStrategyType; label: string; hint: string }[] = [
  { value: 'redaction', label: 'Redacción visual', hint: 'Oculta una parte y deja visible el patrón.' },
  { value: 'substitution', label: 'Sustitución', hint: 'Reemplaza por datos ficticios coherentes.' },
  { value: 'hashing', label: 'Hash SHA-256', hint: 'Convierte a una huella irreversible.' },
  { value: 'fpe', label: 'Formato preservado', hint: 'Mantiene una forma parecida al dato original.' },
  { value: 'perturbation', label: 'Perturbación', hint: 'Ajusta números o fechas con una variación controlada.' },
  { value: 'nullification', label: 'Nulificación', hint: 'Devuelve el dato como vacío o nulo.' },
];

const protectionModes: { value: ProtectionMode; label: string; description: string; destructive: boolean }[] = [
  { value: 'virtual_view', label: 'Vista virtual', description: 'Solo compara en Enmask. No altera la base.', destructive: false },
  { value: 'masked_view', label: 'Vista enmascarada', description: 'Crea una vista o equivalente si el motor lo permite.', destructive: false },
  { value: 'masked_column', label: 'Campo derivado', description: 'Crea una columna/campo/propiedad *_masked.', destructive: false },
  { value: 'static_mask', label: 'Máscara física', description: 'Reemplaza el dato original con respaldo.', destructive: true },
  { value: 'symmetric_encryption', label: 'Encriptación simétrica', description: 'Cifra físicamente la columna/campo.', destructive: true },
];

const piiKeywords = [
  'dni', 'documento', 'ruc', 'cedula', 'passport', 'pasaporte', 'email', 'correo',
  'phone', 'telefono', 'celular', 'mobile', 'nombre', 'apellido', 'address', 'direccion',
  'tarjeta', 'card', 'cuenta', 'password', 'clave', 'token', 'secret', 'ssn', 'birth', 'nacimiento',
];

function stringifyCell(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function normalize(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function targetLabelFor(target?: SchemaTarget) {
  if (!target) return 'Objeto de datos';
  if (target.kind === 'node') return 'Label de nodo';
  if (target.kind === 'relationship') return 'Tipo de relación';
  if (target.kind === 'collection') return 'Colección';
  if (target.kind === 'key') return 'Clave / patrón Redis';
  return 'Tabla';
}

function targetFamily(target?: SchemaTarget) {
  if (!target) return 'Sin objeto seleccionado';
  if (target.kind === 'node') return 'Grafo · Nodo';
  if (target.kind === 'relationship') return 'Grafo · Relación';
  if (target.kind === 'collection') return 'NoSQL · Documento';
  if (target.kind === 'key') return 'NoSQL · Clave-valor';
  return 'Relacional · Tabla';
}

function formatDate(value: string | null) {
  if (!value) return '—';
  try { return new Date(value).toLocaleString(); } catch { return value; }
}

function statusLabel(job: MaskingJob) {
  if (job.status === 'completed' && job.run_mode === 'dry_run') return 'dry-run OK';
  return job.status;
}

function strategyLabel(value: MaskingStrategyType) {
  return strategyOptions.find(option => option.value === value)?.label ?? value;
}

function protectionLabel(value: ProtectionMode) {
  return protectionModes.find(option => option.value === value)?.label ?? value;
}

function isDestructive(mode: ProtectionMode) {
  return protectionModes.find(option => option.value === mode)?.destructive ?? false;
}

function defaultOptionsFor(column: string, strategy: MaskingStrategyType): Record<string, unknown> {
  const name = normalize(column);
  if (strategy === 'redaction') {
    if (name.includes('phone') || name.includes('telefono') || name.includes('celular') || name.includes('mobile')) {
      return { keep_left: 3, keep_right: 2, mask_length: 4, mask_char: '*' };
    }
    if (name.includes('email') || name.includes('correo')) {
      return { keep_left: 1, keep_right: 10, mask_length: 6, mask_char: '*' };
    }
    if (name.includes('dni') || name.includes('document') || name.includes('ruc') || name.includes('passport') || name.includes('pasaporte')) {
      return { keep_left: 2, keep_right: 2, mask_length: 4, mask_char: '*' };
    }
    return { keep_left: 2, keep_right: 2, mask_length: 4, mask_char: '*' };
  }
  if (strategy === 'substitution') {
    if (name.includes('email') || name.includes('correo')) return { provider: 'email' };
    if (name.includes('phone') || name.includes('telefono') || name.includes('celular')) return { provider: 'phone_number' };
    if (name.includes('address') || name.includes('direccion')) return { provider: 'street_address' };
    if (name.includes('birth') || name.includes('nacimiento')) return { provider: 'date_of_birth' };
    if (name.includes('apellido')) return { provider: 'last_name' };
    if (name.includes('nombre') || name.includes('name')) return { provider: 'name' };
    return { provider: 'word' };
  }
  if (strategy === 'perturbation') {
    if (name.includes('fecha') || name.includes('date') || name.includes('birth') || name.includes('nacimiento')) {
      return { variance_type: 'days', variance_value: 15 };
    }
    return { variance_type: 'percentage', variance_value: 10 };
  }
  if (strategy === 'hashing') return { salt: 'enmask-local' };
  if (strategy === 'fpe') return { seed: 'enmask-local' };
  return {};
}

function suggestedStrategyFor(column: string): MaskingStrategyType {
  const name = normalize(column);
  if (name.includes('password') || name.includes('clave') || name.includes('token') || name.includes('secret')) return 'hashing';
  if (name.includes('fecha') || name.includes('birth') || name.includes('nacimiento') || name.includes('monto') || name.includes('precio') || name.includes('amount')) return 'perturbation';
  if (name.includes('nombre') || name.includes('apellido')) return 'substitution';
  return 'redaction';
}

function buildFieldConfig(column: string, strategy?: MaskingStrategyType, mode: ProtectionMode = 'masked_column'): FieldConfig {
  const chosenStrategy = strategy ?? suggestedStrategyFor(column);
  return {
    column,
    strategy: chosenStrategy,
    protection_mode: mode,
    strategy_options: defaultOptionsFor(column, chosenStrategy),
  };
}

function redactionNumber(options: Record<string, unknown>, key: string, fallback: number) {
  const raw = options[key];
  return typeof raw === 'number' ? raw : Number(raw ?? fallback);
}

function PreviewTable({
  rows,
  fallbackColumns,
  protectedColumns,
  emptyMessage,
}: {
  rows: Record<string, unknown>[];
  fallbackColumns?: string[];
  protectedColumns?: string[];
  emptyMessage?: string;
}) {
  const columns = useMemo(() => {
    const seen = new Set<string>();
    rows.slice(0, 20).forEach(row => Object.keys(row).forEach(key => seen.add(key)));
    if (seen.size === 0) (fallbackColumns ?? []).forEach(col => seen.add(col));
    return Array.from(seen).slice(0, 12);
  }, [rows, fallbackColumns]);

  if (!rows.length) {
    return (
      <div className="empty-inline preview-empty">
        {emptyMessage ?? 'Selecciona un objeto para cargar una muestra de datos.'}
        {columns.length > 0 && (
          <div className="empty-columns-hint">Columnas detectadas: {columns.slice(0, 8).join(', ')}{columns.length > 8 ? '…' : ''}</div>
        )}
      </div>
    );
  }

  return (
    <div className="table-wrapper workbench-table-wrap compact-table-wrap">
      <table className="dashboard-table workbench-preview-table compact-preview-table">
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col} className={protectedColumns?.includes(col) ? 'protected-col' : ''}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 8).map((row, idx) => (
            <tr key={idx}>
              {columns.map(col => (
                <td key={col} className={protectedColumns?.includes(col) ? 'protected-col' : ''} title={stringifyCell(row[col])}>
                  {stringifyCell(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DataProtection({ addToast }: Props) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [jobs, setJobs] = useState<MaskingJob[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState('');
  const [targets, setTargets] = useState<SchemaTarget[]>([]);
  const [selectedTargetName, setSelectedTargetName] = useState('');
  const [records, setRecords] = useState<TablePreviewResponse | null>(null);
  const [fieldConfigs, setFieldConfigs] = useState<FieldConfig[]>([]);
  const [columnToAdd, setColumnToAdd] = useState('');
  const [draftStrategy, setDraftStrategy] = useState<MaskingStrategyType>('redaction');
  const [draftProtectionMode, setDraftProtectionMode] = useState<ProtectionMode>('masked_column');
  const [runMode, setRunMode] = useState<MaskingRunMode>('dry_run');
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [savingRules, setSavingRules] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [preview, setPreview] = useState<WorkbenchMaskPreviewResponse | null>(null);
  const [lastJob, setLastJob] = useState<MaskingJob | null>(null);

  const selectedConnection = connections.find(c => c.id === selectedConnectionId);
  const selectedTarget = targets.find(t => t.name === selectedTargetName);
  const graphElement = selectedTarget?.kind === 'node' || selectedTarget?.kind === 'relationship'
    ? selectedTarget.kind as GraphElementKind
    : null;
  const availableColumns = useMemo(() => {
    if (selectedTarget?.columns?.length) return selectedTarget.columns;
    if (records?.columns?.length) return records.columns;
    return [];
  }, [selectedTarget, records]);
  const selectedColumns = fieldConfigs.map(field => field.column);
  const availableToAdd = availableColumns.filter(column => !selectedColumns.includes(column));
  const anyDestructive = fieldConfigs.some(field => isDestructive(field.protection_mode));
  const selectedDraftStrategy = strategyOptions.find(option => option.value === draftStrategy);
  const selectedDraftMode = protectionModes.find(option => option.value === draftProtectionMode);

  const loadBaseData = useCallback(async () => {
    setLoadingConnections(true);
    try {
      const [connectionList, jobList] = await Promise.all([getConnections(), getJobs().catch(() => [])]);
      setConnections(connectionList);
      setJobs(jobList);
    } catch (err) {
      addToast((err as Error).message, 'error');
    } finally {
      setLoadingConnections(false);
    }
  }, [addToast]);

  useEffect(() => { loadBaseData(); }, [loadBaseData]);

  useEffect(() => {
    if (!selectedConnectionId) return;
    setLoadingSchema(true);
    setTargets([]);
    setSelectedTargetName('');
    setRecords(null);
    setFieldConfigs([]);
    setColumnToAdd('');
    setPreview(null);
    setLastJob(null);

    getWorkbenchSchema(selectedConnectionId)
      .then(schema => {
        setTargets(schema.targets);
        if (schema.targets.length === 1) setSelectedTargetName(schema.targets[0].name);
      })
      .catch(err => addToast(err.message, 'error'))
      .finally(() => setLoadingSchema(false));
  }, [selectedConnectionId, addToast]);

  const loadRecords = useCallback(async () => {
    if (!selectedConnectionId || !selectedTargetName) return;
    setLoadingRecords(true);
    setRecords(null);
    setFieldConfigs([]);
    setColumnToAdd('');
    setPreview(null);
    setLastJob(null);

    try {
      const response = await getWorkbenchRecords(selectedConnectionId, selectedTargetName, 30, graphElement);
      setRecords(response);
      const columns = selectedTarget?.columns?.length ? selectedTarget.columns : response.columns;
      const smartColumns = columns.filter(col => piiKeywords.some(key => normalize(col).includes(key))).slice(0, 3);
      if (smartColumns.length) {
        setFieldConfigs(smartColumns.map(column => buildFieldConfig(column)));
      } else if (columns.length) {
        const first = columns[0];
        setColumnToAdd(first);
        setDraftStrategy(suggestedStrategyFor(first));
      }
      if (response.rows.length === 0) {
        addToast('La estructura cargó correctamente, pero la muestra devolvió 0 filas. Esa tabla puede estar vacía.', 'info');
      }
    } catch (err) {
      addToast((err as Error).message, 'error');
    } finally {
      setLoadingRecords(false);
    }
  }, [selectedConnectionId, selectedTargetName, graphElement, selectedTarget?.columns, addToast]);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  const fieldRulesPayload = useMemo<WorkbenchFieldRuleRequest[]>(() => {
    return fieldConfigs.map(field => ({
      target_column: field.column,
      strategy: field.strategy,
      strategy_options: field.strategy_options,
      protection_mode: field.protection_mode,
    }));
  }, [fieldConfigs]);

  const generatePreview = useCallback(async (silent = false) => {
    if (!selectedConnectionId || !selectedTargetName || fieldConfigs.length === 0) return;
    setPreviewing(true);
    try {
      const response = await previewWorkbenchMask({
        connection_id: selectedConnectionId,
        target_table: selectedTargetName,
        field_rules: fieldRulesPayload,
        graph_element: graphElement,
        limit: 30,
      });
      setPreview(response);
      if (!silent) addToast('Vista previa generada por campo sin modificar la base.', 'success');
    } catch (err) {
      if (!silent) addToast((err as Error).message, 'error');
    } finally {
      setPreviewing(false);
    }
  }, [selectedConnectionId, selectedTargetName, fieldConfigs.length, fieldRulesPayload, graphElement, addToast]);

  useEffect(() => {
    if (!selectedConnectionId || !selectedTargetName || fieldConfigs.length === 0 || loadingRecords) return;
    const timer = window.setTimeout(() => generatePreview(true), 450);
    return () => window.clearTimeout(timer);
  }, [selectedConnectionId, selectedTargetName, fieldConfigs, loadingRecords, generatePreview]);

  const addSelectedColumn = () => {
    if (!columnToAdd || fieldConfigs.some(field => field.column === columnToAdd)) return;
    setFieldConfigs(prev => [...prev, buildFieldConfig(columnToAdd, draftStrategy, draftProtectionMode)]);
    const remaining = availableToAdd.filter(column => column !== columnToAdd);
    setColumnToAdd(remaining[0] ?? '');
    setPreview(null);
  };

  const removeSelectedColumn = (column: string) => {
    setFieldConfigs(prev => prev.filter(field => field.column !== column));
    setPreview(null);
  };

  const updateFieldConfig = (column: string, patch: Partial<FieldConfig>) => {
    setFieldConfigs(prev => prev.map(field => {
      if (field.column !== column) return field;
      const next = { ...field, ...patch };
      if (patch.strategy && patch.strategy !== field.strategy) {
        next.strategy_options = defaultOptionsFor(column, patch.strategy);
      }
      return next;
    }));
    setPreview(null);
  };

  const updateRedactionOption = (column: string, key: string, value: number) => {
    setFieldConfigs(prev => prev.map(field => {
      if (field.column !== column) return field;
      return { ...field, strategy_options: { ...field.strategy_options, [key]: value } };
    }));
    setPreview(null);
  };

  const buildRulePayloads = (): RuleCreate[] => {
    return fieldConfigs.map(field => ({
      name: `${selectedTargetName}-${field.column}-${field.protection_mode}-${field.strategy}`,
      connection_id: selectedConnectionId,
      target_table: selectedTargetName,
      target_column: field.column,
      strategy: field.strategy,
      strategy_options: field.strategy_options,
      protection_mode: field.protection_mode,
      output_column: `${field.column}_masked`,
      graph_element: graphElement,
    }));
  };

  const validateSelection = () => {
    if (!selectedConnectionId) { addToast('Selecciona una conexión.', 'error'); return false; }
    if (!selectedTargetName) { addToast('Selecciona una tabla, colección, clave o label.', 'error'); return false; }
    if (fieldConfigs.length === 0) { addToast('Agrega al menos una regla de campo.', 'error'); return false; }
    return true;
  };

  const createSelectedRules = async (): Promise<MaskingRule[]> => {
    const payloads = buildRulePayloads();
    return Promise.all(payloads.map(payload => createRule(payload)));
  };

  const handleSaveRules = async () => {
    if (!validateSelection()) return;
    setSavingRules(true);
    try {
      const created = await createSelectedRules();
      addToast(`${created.length} regla(s) guardada(s) para ${selectedTargetName}.`, 'success');
      await loadBaseData();
    } catch (err) {
      addToast((err as Error).message, 'error');
    } finally {
      setSavingRules(false);
    }
  };

  const refreshCurrentTargetAfterApply = async () => {
    if (!selectedConnectionId || !selectedTargetName) return;
    try {
      const [schema, freshRecords] = await Promise.all([
        getWorkbenchSchema(selectedConnectionId),
        getWorkbenchRecords(selectedConnectionId, selectedTargetName, 30, graphElement),
      ]);
      setTargets(schema.targets);
      setRecords(freshRecords);
      setPreview(null);
      addToast('Muestra recargada desde la base real para verificar el cambio aplicado.', 'info');
    } catch (err) {
      addToast(`No se pudo recargar la muestra: ${(err as Error).message}`, 'error');
    }
  };

  const pollJob = async (jobId: string) => {
    const updated = await getJob(jobId);
    setLastJob(updated);
    setJobs(prev => [updated, ...prev.filter(j => j.id !== jobId)].slice(0, 8));
    if (updated.status === 'pending' || updated.status === 'running') {
      window.setTimeout(() => pollJob(jobId), 1800);
      return;
    }
    setExecuting(false);
    if (updated.status === 'completed') {
      addToast(
        updated.run_mode === 'dry_run'
          ? `Dry-run completado: ${updated.records_previewed} registros evaluados.`
          : `Protección aplicada en la base: ${updated.records_processed} registros procesados y ${updated.generated_artifacts.length} artefacto(s).`,
        'success'
      );
      if (updated.run_mode === 'apply') {
        await refreshCurrentTargetAfterApply();
      }
    } else if (updated.status === 'failed') {
      addToast(updated.error_message || 'El job falló.', 'error');
    }
  };

  const handleExecute = async () => {
    if (!validateSelection()) return;
    if (runMode === 'apply') {
      const accepted = window.confirm(
        anyDestructive
          ? 'Hay campos configurados con protección física. Verifica respaldo antes de continuar. ¿Deseas aplicar?'
          : 'Se aplicará la protección configurada por campo. ¿Deseas continuar?'
      );
      if (!accepted) return;
    }

    setExecuting(true);
    try {
      const createdRules = await createSelectedRules();
      const job = await createJob({
        connection_id: selectedConnectionId,
        rule_ids: createdRules.map(rule => rule.id),
        run_mode: runMode,
      } as JobCreate);
      setLastJob(job);
      await runJob(job.id);
      addToast(runMode === 'dry_run' ? 'Dry-run enviado a ejecución.' : 'Job de protección enviado a ejecución.', 'info');
      window.setTimeout(() => pollJob(job.id), 1500);
    } catch (err) {
      setExecuting(false);
      addToast((err as Error).message, 'error');
    }
  };

  const handleRestoreLastJob = async () => {
    if (!lastJob) return;
    const accepted = window.confirm('Se restaurará/desencriptará el último job aplicado. ¿Deseas continuar?');
    if (!accepted) return;
    setExecuting(true);
    try {
      await unmaskJob(lastJob.id);
      addToast('Restauración/desencriptación enviada. Revisa Historial para confirmar el estado.', 'info');
      window.setTimeout(() => pollJob(lastJob.id), 1500);
    } catch (err) {
      setExecuting(false);
      addToast((err as Error).message, 'error');
    }
  };

  const currentRows = preview?.original_rows ?? records?.rows ?? [];
  const maskedRows = preview?.masked_rows ?? [];
  const recentJobs = jobs.slice(0, 4);
  const emptyOriginalMessage = loadingRecords
    ? 'Cargando muestra de datos...'
    : records
      ? 'No se encontraron registros en la muestra. La estructura cargó correctamente; la tabla seleccionada parece estar vacía o el usuario no tiene filas visibles.'
      : 'Selecciona una conexión y un objeto para cargar la tabla original.';
  const emptyMaskedMessage = fieldConfigs.length === 0
    ? 'Agrega campos desde el combo para generar la vista protegida.'
    : previewing
      ? 'Generando vista protegida...'
      : records?.rows.length === 0
        ? 'No hay filas para transformar; agrega datos a la tabla o selecciona otra.'
        : 'Aún no se generó una vista protegida.';

  return (
    <div className="page-content protection-page protection-page-simplified">
      <section className="protection-header-lite">
        <div>
          <span className="eyebrow">Protección de Datos</span>
          <h2>Previsualiza y aplica protección por campo desde un solo flujo.</h2>
          <p>Cada columna, campo o propiedad puede tener su propio algoritmo y tipo de protección.</p>
        </div>
        <div className="protection-status-lite">
          <span>{selectedConnection ? selectedConnection.type.toUpperCase() : 'Sin conexión'}</span>
          <strong>{selectedTarget ? targetFamily(selectedTarget) : 'Selecciona objeto'}</strong>
        </div>
      </section>

      <section className="card compact-protection-card">
        <div className="form-grid form-grid-2">
          <div className="form-group">
            <label>Conexión activa</label>
            <select value={selectedConnectionId} onChange={e => setSelectedConnectionId(e.target.value)} disabled={loadingConnections}>
              <option value="">{loadingConnections ? 'Cargando conexiones...' : 'Selecciona una conexión'}</option>
              {connections.map(conn => <option key={conn.id} value={conn.id}>{conn.name} · {conn.type}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>{targetLabelFor(selectedTarget)}</label>
            <div className="inline-select-action">
              <select value={selectedTargetName} onChange={e => setSelectedTargetName(e.target.value)} disabled={!selectedConnectionId || loadingSchema}>
                <option value="">{loadingSchema ? 'Leyendo esquema...' : 'Selecciona tabla / colección / label'}</option>
                {targets.map(target => <option key={`${target.kind}:${target.name}`} value={target.name}>{target.label}</option>)}
              </select>
              <button className="btn btn-secondary btn-small" onClick={loadRecords} disabled={!selectedTargetName || loadingRecords}>Recargar</button>
            </div>
          </div>
        </div>
        <div className="compact-context-row">
          <span>Objetos: <strong>{targets.length}</strong></span>
          <span>Campos: <strong>{availableColumns.length}</strong></span>
          <span>Muestra: <strong>{records?.total_returned ?? 0}</strong></span>
          {selectedConnection && <span>BD: <strong>{selectedConnection.database}</strong></span>}
        </div>
      </section>

      <section className="protection-main-compact">
        <div className="card protection-config-lite">
          <div className="card-header compact-header">
            <div>
              <h2>Configuración por campo</h2>
              <p>Agrega cada campo con su propio algoritmo y tipo de protección.</p>
            </div>
          </div>

          <div className="field-rule-builder">
            <div className="form-group">
              <label>Campo / columna / propiedad</label>
              <select value={columnToAdd} onChange={e => {
                const column = e.target.value;
                setColumnToAdd(column);
                if (column) setDraftStrategy(suggestedStrategyFor(column));
              }} disabled={!availableToAdd.length}>
                <option value="">{availableToAdd.length ? 'Selecciona un campo' : 'No hay campos disponibles'}</option>
                {availableToAdd.map(column => <option key={column} value={column}>{column}</option>)}
              </select>
            </div>
            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label>Algoritmo para este campo</label>
                <select value={draftStrategy} onChange={e => setDraftStrategy(e.target.value as MaskingStrategyType)}>
                  {strategyOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <small className="form-hint">{selectedDraftStrategy?.hint}</small>
              </div>
              <div className="form-group">
                <label>Tipo de protección</label>
                <select value={draftProtectionMode} onChange={e => setDraftProtectionMode(e.target.value as ProtectionMode)}>
                  {protectionModes.map(mode => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
                </select>
                <small className="form-hint">{selectedDraftMode?.description}</small>
                <small className="form-hint impact-hint">{selectedDraftMode?.destructive ? 'Impacto: modifica físicamente la base al ejecutar Apply.' : 'Impacto: no modifica el dato original.'}</small>
              </div>
            </div>
            <button className="btn btn-secondary" onClick={addSelectedColumn} disabled={!columnToAdd}>Agregar regla de campo</button>
            <small className="form-hint">Sugerencia: documento/DNI puede ir con hash o redacción, teléfono con redacción, fechas y montos con perturbación, nombres con sustitución.</small>
          </div>

          <div className="field-rules-list">
            {fieldConfigs.length === 0 ? (
              <div className="empty-inline compact-empty">Ninguna regla de campo agregada.</div>
            ) : fieldConfigs.map(field => (
              <div key={field.column} className="field-rule-card">
                <div className="field-rule-title">
                  <strong>{field.column}</strong>
                  <button type="button" onClick={() => removeSelectedColumn(field.column)}>Quitar</button>
                </div>
                <div className="form-grid form-grid-2 field-rule-controls">
                  <div className="form-group">
                    <label>Algoritmo</label>
                    <select value={field.strategy} onChange={e => updateFieldConfig(field.column, { strategy: e.target.value as MaskingStrategyType })}>
                      {strategyOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Tipo de protección</label>
                    <select value={field.protection_mode} onChange={e => updateFieldConfig(field.column, { protection_mode: e.target.value as ProtectionMode })}>
                      {protectionModes.map(mode => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
                    </select>
                  </div>
                </div>
                {field.strategy === 'redaction' && (
                  <div className="form-grid form-grid-3 redaction-controls mini-redaction-controls">
                    <div className="form-group">
                      <label>Inicio</label>
                      <input type="number" min={0} max={12} value={redactionNumber(field.strategy_options, 'keep_left', 2)} onChange={e => updateRedactionOption(field.column, 'keep_left', Number(e.target.value))} />
                    </div>
                    <div className="form-group">
                      <label>Final</label>
                      <input type="number" min={0} max={12} value={redactionNumber(field.strategy_options, 'keep_right', 2)} onChange={e => updateRedactionOption(field.column, 'keep_right', Number(e.target.value))} />
                    </div>
                    <div className="form-group">
                      <label>Máscara</label>
                      <input type="number" min={1} max={24} value={redactionNumber(field.strategy_options, 'mask_length', 4)} onChange={e => updateRedactionOption(field.column, 'mask_length', Number(e.target.value))} />
                    </div>
                  </div>
                )}
                <div className="field-rule-meta">
                  <span>{strategyLabel(field.strategy)}</span>
                  <span>{protectionLabel(field.protection_mode)}</span>
                  <span>{isDestructive(field.protection_mode) ? 'Modifica BD en Apply' : 'No toca dato original'}</span>
                  {isDestructive(field.protection_mode) && <span className="danger-chip">físico</span>}
                </div>
              </div>
            ))}
          </div>

          <div className="form-group">
            <label>Tipo de ejecución</label>
            <select value={runMode} onChange={e => setRunMode(e.target.value as MaskingRunMode)}>
              <option value="dry_run">Dry-run · simular sin modificar</option>
              <option value="apply">Apply · aplicar en base de datos</option>
            </select>
          </div>

          <div className="workbench-actions compact-actions">
            <button className="btn btn-secondary" onClick={() => generatePreview(false)} disabled={!fieldConfigs.length || previewing}>
              {previewing ? 'Generando...' : 'Actualizar vista previa'}
            </button>
            <button className="btn btn-secondary" onClick={handleSaveRules} disabled={savingRules || !fieldConfigs.length}>
              {savingRules ? 'Guardando...' : 'Guardar regla(s)'}
            </button>
            <button className={`btn ${runMode === 'apply' ? 'btn-danger' : 'btn-primary'}`} onClick={handleExecute} disabled={executing || !fieldConfigs.length}>
              {executing ? 'Ejecutando...' : runMode === 'dry_run' ? 'Ejecutar dry-run' : 'Aplicar protección'}
            </button>
            {lastJob?.run_mode === 'apply' && lastJob.status === 'completed' && (
              <button className="btn btn-secondary" onClick={handleRestoreLastJob} disabled={executing}>
                Restaurar / desencriptar último apply
              </button>
            )}
          </div>
        </div>

        <div className="card protection-preview-lite">
          <div className="card-header compact-header">
            <div>
              <h2>Vista comparativa</h2>
              <p>{selectedTarget ? `${targetFamily(selectedTarget)} · ${selectedTarget.name}` : 'Selecciona un objeto para cargar datos.'}</p>
            </div>
            <span className="engine-pill">{loadingRecords ? 'Cargando...' : `${records?.total_returned ?? 0} registros`}</span>
          </div>

          <div className="comparison-grid compact-comparison-grid">
            <div className="comparison-panel original-panel">
              <div className="comparison-title"><span>Original</span><small>No se modifica la base al previsualizar.</small></div>
              <PreviewTable rows={currentRows} fallbackColumns={availableColumns} protectedColumns={[]} emptyMessage={emptyOriginalMessage} />
            </div>
            <div className="comparison-panel masked-panel">
              <div className="comparison-title"><span>Protegido</span><small>{preview?.mode_hint ?? 'Resultado calculado por Enmask.'}</small></div>
              <PreviewTable rows={maskedRows} fallbackColumns={availableColumns} protectedColumns={preview?.protected_columns ?? selectedColumns} emptyMessage={emptyMaskedMessage} />
            </div>
          </div>

          <div className="execution-summary-lite">
            <div><strong>Reglas de campo</strong><span>{fieldConfigs.length ? fieldConfigs.map(field => `${field.column}: ${strategyLabel(field.strategy)}`).join(' · ') : 'Sin reglas'}</span></div>
            <div><strong>Impacto en BD</strong><span>{anyDestructive ? 'Apply modificará la tabla real; luego puedes restaurar/desencriptar desde esta pantalla o Historial.' : 'Apply puede crear vista/campo derivado; dry-run solo simula.'}</span></div>
            <div><strong>Último job</strong><span>{lastJob ? `${statusLabel(lastJob)} · ${lastJob.run_mode}` : 'Sin ejecución'}</span></div>
          </div>
        </div>
      </section>

      <section className="card protection-history-card compact-history-card">
        <div className="card-header compact-header">
          <div>
            <h2>Historial reciente</h2>
            <p>Resumen rápido de las últimas ejecuciones.</p>
          </div>
        </div>
        {recentJobs.length === 0 ? (
          <div className="empty-inline">No hay jobs registrados todavía.</div>
        ) : (
          <div className="compact-job-list">
            {recentJobs.map(job => (
              <div key={job.id} className="compact-job-item">
                <strong>{connections.find(c => c.id === job.connection_id)?.name ?? job.connection_id.slice(0, 8)}</strong>
                <span>{statusLabel(job)} · {job.run_mode} · {job.run_mode === 'apply' ? job.records_processed : job.records_previewed} registros</span>
                <small>{formatDate(job.completed_at)}</small>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
