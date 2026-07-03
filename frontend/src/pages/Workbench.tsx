import { useEffect, useMemo, useState } from 'react';
import {
  createRule,
  getConnections,
  getWorkbenchRecords,
  getWorkbenchSchema,
  previewWorkbenchMask,
} from '../services/api';
import type {
  Connection,
  GraphElementKind,
  MaskingStrategyType,
  ProtectionMode,
  SchemaTarget,
  TablePreviewResponse,
  WorkbenchMaskPreviewResponse,
} from '../types';

interface Props {
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const strategyOptions: { value: MaskingStrategyType; label: string; hint: string }[] = [
  { value: 'redaction', label: 'Redacción visual', hint: 'Conserva bordes y oculta el centro del valor.' },
  { value: 'substitution', label: 'Sustitución', hint: 'Reemplaza con datos ficticios consistentes.' },
  { value: 'hashing', label: 'Hash SHA-256', hint: 'Transformación irreversible para análisis.' },
  { value: 'fpe', label: 'Formato preservado', hint: 'Mantiene letras/números con forma similar.' },
  { value: 'perturbation', label: 'Perturbación', hint: 'Ajusta valores numéricos o fechas.' },
  { value: 'nullification', label: 'Nulificación', hint: 'Oculta el valor dejándolo nulo.' },
];

const protectionModes: { value: ProtectionMode; label: string }[] = [
  { value: 'virtual_view', label: 'Solo consulta virtual' },
  { value: 'masked_view', label: 'Vista enmascarada' },
  { value: 'masked_column', label: 'Columna/campo derivado' },
  { value: 'static_mask', label: 'Máscara física con respaldo' },
  { value: 'symmetric_encryption', label: 'Encriptación simétrica' },
];

function stringifyCell(value: unknown) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function displayTargetKind(target?: SchemaTarget) {
  if (!target) return 'Tabla / colección / label';
  if (target.kind === 'node') return 'Nodo Neo4j';
  if (target.kind === 'relationship') return 'Relación Neo4j';
  if (target.kind === 'collection') return 'Colección';
  if (target.kind === 'key') return 'Clave / patrón Redis';
  return 'Tabla';
}

function PreviewTable({ rows, protectedColumns }: { rows: Record<string, unknown>[]; protectedColumns?: string[] }) {
  const columns = useMemo(() => {
    const seen = new Set<string>();
    rows.slice(0, 20).forEach(row => Object.keys(row).forEach(key => seen.add(key)));
    return Array.from(seen).slice(0, 10);
  }, [rows]);

  if (!rows.length) {
    return <div className="empty-inline">No hay registros para mostrar. Selecciona una conexión y un objeto con datos.</div>;
  }

  return (
    <div className="table-wrapper workbench-table-wrap">
      <table className="dashboard-table workbench-preview-table">
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

export default function Workbench({ addToast }: Props) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState('');
  const [targets, setTargets] = useState<SchemaTarget[]>([]);
  const [selectedTargetName, setSelectedTargetName] = useState('');
  const [records, setRecords] = useState<TablePreviewResponse | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [strategy, setStrategy] = useState<MaskingStrategyType>('redaction');
  const [protectionMode, setProtectionMode] = useState<ProtectionMode>('virtual_view');
  const [keepLeft, setKeepLeft] = useState(2);
  const [keepRight, setKeepRight] = useState(2);
  const [maskLength, setMaskLength] = useState(4);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [savingRule, setSavingRule] = useState(false);
  const [preview, setPreview] = useState<WorkbenchMaskPreviewResponse | null>(null);

  const selectedConnection = connections.find(c => c.id === selectedConnectionId);
  const selectedTarget = targets.find(t => t.name === selectedTargetName);
  const graphElement = selectedTarget?.kind === 'node' || selectedTarget?.kind === 'relationship'
    ? selectedTarget.kind as GraphElementKind
    : null;

  useEffect(() => {
    getConnections()
      .then(setConnections)
      .catch(err => addToast(err.message, 'error'));
  }, [addToast]);

  useEffect(() => {
    if (!selectedConnectionId) return;
    setLoadingSchema(true);
    setTargets([]);
    setSelectedTargetName('');
    setRecords(null);
    setSelectedColumns([]);
    setPreview(null);
    getWorkbenchSchema(selectedConnectionId)
      .then(schema => setTargets(schema.targets))
      .catch(err => addToast(err.message, 'error'))
      .finally(() => setLoadingSchema(false));
  }, [selectedConnectionId, addToast]);

  useEffect(() => {
    if (!selectedConnectionId || !selectedTargetName) return;
    setLoadingRecords(true);
    setRecords(null);
    setSelectedColumns([]);
    setPreview(null);
    getWorkbenchRecords(selectedConnectionId, selectedTargetName, 20, graphElement)
      .then(setRecords)
      .catch(err => addToast(err.message, 'error'))
      .finally(() => setLoadingRecords(false));
  }, [selectedConnectionId, selectedTargetName, graphElement, addToast]);

  const toggleColumn = (column: string) => {
    setSelectedColumns(prev => prev.includes(column) ? prev.filter(c => c !== column) : [...prev, column]);
    setPreview(null);
  };

  const strategyOptionsPayload = useMemo(() => {
    if (strategy === 'redaction') return { keep_left: keepLeft, keep_right: keepRight, mask_length: maskLength, mask_char: '*' };
    if (strategy === 'substitution') return { provider: 'name' };
    if (strategy === 'perturbation') return { variance_type: 'percentage', variance_value: 10 };
    if (strategy === 'hashing') return { salt: 'enmask-local' };
    return {};
  }, [strategy, keepLeft, keepRight, maskLength]);

  const handlePreview = async () => {
    if (!selectedConnectionId || !selectedTargetName || selectedColumns.length === 0) {
      addToast('Selecciona conexión, objeto y al menos una columna/propiedad.', 'error');
      return;
    }
    setPreviewing(true);
    try {
      const response = await previewWorkbenchMask({
        connection_id: selectedConnectionId,
        target_table: selectedTargetName,
        target_columns: selectedColumns,
        strategy,
        strategy_options: strategyOptionsPayload,
        graph_element: graphElement,
        limit: 20,
      });
      setPreview(response);
      addToast('Vista previa generada sin modificar la base.', 'success');
    } catch (err) {
      addToast((err as Error).message, 'error');
    } finally {
      setPreviewing(false);
    }
  };

  const handleSaveRules = async () => {
    if (!selectedConnectionId || !selectedTargetName || selectedColumns.length === 0) {
      addToast('Primero selecciona columnas/propiedades para crear reglas.', 'error');
      return;
    }
    setSavingRule(true);
    try {
      await Promise.all(selectedColumns.map(column => createRule({
        name: `Workbench-${selectedTargetName}-${column}`,
        connection_id: selectedConnectionId,
        target_table: selectedTargetName,
        target_column: column,
        strategy,
        strategy_options: strategyOptionsPayload,
        protection_mode: protectionMode,
        output_column: `${column}_masked`,
        graph_element: graphElement,
      })));
      addToast(`${selectedColumns.length} regla(s) creadas desde el laboratorio.`, 'success');
    } catch (err) {
      addToast((err as Error).message, 'error');
    } finally {
      setSavingRule(false);
    }
  };

  const currentRows = preview?.original_rows ?? records?.rows ?? [];
  const processedRows = preview?.masked_rows ?? [];
  const selectedStrategy = strategyOptions.find(s => s.value === strategy);

  return (
    <div className="page-content workbench-page">
      <section className="workbench-hero">
        <div>
          <span className="eyebrow">Laboratorio de enmascaramiento</span>
          <h2>Explora datos reales y compara el resultado protegido antes de aplicar reglas.</h2>
          <p>
            Este apartado trabaja como una mesa de pruebas: lee una muestra limitada, aplica una máscara virtual
            y te permite guardar reglas sin alterar todavía la base de datos.
          </p>
        </div>
        <div className="workbench-safety-card">
          <strong>Modo seguro</strong>
          <span>No modifica datos</span>
          <small>Para cambios reales usa Reglas + Jobs.</small>
        </div>
      </section>

      <section className="card workbench-context-card">
        <div className="card-header compact-header">
          <div>
            <h2>Contexto de base de datos</h2>
            <p>Selecciona la conexión activa y el objeto que quieres inspeccionar.</p>
          </div>
          {selectedConnection && <span className="engine-pill">{selectedConnection.type}</span>}
        </div>
        <div className="form-grid form-grid-2">
          <div className="form-group">
            <label>Conexión activa</label>
            <select value={selectedConnectionId} onChange={e => setSelectedConnectionId(e.target.value)}>
              <option value="">Selecciona una conexión</option>
              {connections.map(conn => (
                <option key={conn.id} value={conn.id}>{conn.name} · {conn.type}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>{displayTargetKind(selectedTarget)}</label>
            <select value={selectedTargetName} onChange={e => setSelectedTargetName(e.target.value)} disabled={!selectedConnectionId || loadingSchema}>
              <option value="">{loadingSchema ? 'Leyendo esquema...' : 'Selecciona tabla / colección / label'}</option>
              {targets.map(target => (
                <option key={`${target.kind}:${target.name}`} value={target.name}>{target.label}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="workbench-grid">
        <div className="card workbench-config-card">
          <div className="card-header compact-header">
            <div>
              <h2>Panel de configuración</h2>
              <p>Elige columnas, algoritmo y tipo de regla que se guardará.</p>
            </div>
          </div>

          <div className="form-group">
            <label>Columnas / propiedades a proteger</label>
            <div className="column-picker">
              {loadingRecords && <div className="empty-inline">Cargando muestra...</div>}
              {!loadingRecords && !selectedTarget && <div className="empty-inline">Selecciona una conexión y un objeto.</div>}
              {!loadingRecords && selectedTarget && selectedTarget.columns.length === 0 && <div className="empty-inline">No se detectaron columnas o propiedades.</div>}
              {!loadingRecords && selectedTarget?.columns.map(column => (
                <label key={column} className={`column-chip ${selectedColumns.includes(column) ? 'active' : ''}`}>
                  <input type="checkbox" checked={selectedColumns.includes(column)} onChange={() => toggleColumn(column)} />
                  <span>{column}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Algoritmo de vista previa</label>
            <select value={strategy} onChange={e => { setStrategy(e.target.value as MaskingStrategyType); setPreview(null); }}>
              {strategyOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <small className="form-hint">{selectedStrategy?.hint}</small>
          </div>

          {strategy === 'redaction' && (
            <div className="form-grid form-grid-3">
              <div className="form-group">
                <label>Inicio visible</label>
                <input type="number" min={0} max={12} value={keepLeft} onChange={e => setKeepLeft(Number(e.target.value))} />
              </div>
              <div className="form-group">
                <label>Final visible</label>
                <input type="number" min={0} max={12} value={keepRight} onChange={e => setKeepRight(Number(e.target.value))} />
              </div>
              <div className="form-group">
                <label>Máscara</label>
                <input type="number" min={1} max={24} value={maskLength} onChange={e => setMaskLength(Number(e.target.value))} />
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Modo de protección al guardar regla</label>
            <select value={protectionMode} onChange={e => setProtectionMode(e.target.value as ProtectionMode)}>
              {protectionModes.map(mode => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
            </select>
            <small className="form-hint">La vista previa siempre es virtual. Este modo se usa cuando guardas la regla.</small>
          </div>

          <div className="workbench-actions">
            <button className="btn btn-primary" onClick={handlePreview} disabled={previewing || selectedColumns.length === 0}>
              {previewing ? 'Generando...' : 'Previsualizar máscara'}
            </button>
            <button className="btn btn-secondary" onClick={handleSaveRules} disabled={savingRule || selectedColumns.length === 0}>
              {savingRule ? 'Guardando...' : 'Guardar regla(s)'}
            </button>
          </div>
        </div>

        <div className="card workbench-preview-card">
          <div className="card-header compact-header">
            <div>
              <h2>Vista comparativa</h2>
              <p>Original versus resultado virtual enmascarado.</p>
            </div>
            <span className="badge badge-info">{preview ? `${preview.total_previewed} registros` : `${records?.total_returned ?? 0} muestra`}</span>
          </div>

          <div className="comparison-grid">
            <div className="comparison-panel original-panel">
              <div className="comparison-title"><span>Tabla original</span><small>{selectedTargetName || 'Esperando selección'}</small></div>
              <PreviewTable rows={currentRows} />
            </div>
            <div className="comparison-panel masked-panel">
              <div className="comparison-title"><span>Resultado protegido</span><small>{preview?.mode_hint ?? 'Genera una vista previa'}</small></div>
              <PreviewTable rows={processedRows} protectedColumns={preview?.protected_columns} />
            </div>
          </div>

          <div className="workbench-flow">
            <div>
              <strong>Flujo recomendado</strong>
              <p>Conexión → Objeto → Columnas sensibles → Vista previa → Guardar reglas → Ejecutar job.</p>
            </div>
            <div>
              <strong>Motor actual</strong>
              <p>{selectedConnection ? `${selectedConnection.type} · ${selectedConnection.database}` : 'Sin conexión seleccionada'}</p>
            </div>
            <div>
              <strong>Tratamiento</strong>
              <p>{selectedTarget?.kind === 'node' || selectedTarget?.kind === 'relationship' ? 'Grafo: label/tipo + propiedad' : 'Tabular/documental: objeto + campo'}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
