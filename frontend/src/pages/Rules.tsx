import { useEffect, useState } from 'react';
import { getRules, createRule, updateRule, deleteRule, getConnections } from '../services/api';
import type { MaskingRule, RuleCreate, Connection, ProtectionMode, GraphElementKind } from '../types';
import type { ToastType } from '../hooks/useToast';

interface Props { addToast: (msg: string, type?: ToastType) => void; }

const strategyLabels: Record<string, string> = {
  substitution: 'Sustitución con datos ficticios',
  hashing:      'Hash SHA-256',
  redaction:    'Patrón con asteriscos',
  nullification:'Nulificación',
  fpe:          'Conserva formato (pseudo-FPE)',
  perturbation: 'Perturbación numérica/fecha',
};

const protectionLabels: Record<ProtectionMode, string> = {
  virtual_view: 'Nivel 1 · Máscara solo en consulta',
  masked_view: 'Nivel 1 · Crear vista enmascarada',
  masked_column: 'Nivel 1 · Crear columna/campo enmascarado',
  static_mask: 'Nivel 1 físico · Reemplazar dato con respaldo',
  symmetric_encryption: 'Nivel 2 · Encriptar con llave simétrica',
};

const protectionHelp: Record<ProtectionMode, string> = {
  virtual_view: 'No cambia la base: el backend aplica la máscara al visualizar.',
  masked_view: 'Crea una vista en la base con columnas protegidas y mantiene intacta la tabla original.',
  masked_column: 'Agrega una columna/campo derivado, por ejemplo dni_masked; el dato original queda intacto.',
  static_mask: 'Sobrescribe el dato original, guardando respaldo para poder desenmascarar.',
  symmetric_encryption: 'Cifra físicamente la columna original. Para desencriptar se requiere la misma llave simétrica.',
};

const graphProtectionLabels: Partial<Record<ProtectionMode, string>> = {
  virtual_view: 'Grafo · Vista virtual desde Enmask',
  masked_view: 'Grafo · Vista virtual enmascarada',
  masked_column: 'Grafo · Crear propiedad enmascarada',
  static_mask: 'Grafo físico · Reemplazar propiedad con respaldo',
  symmetric_encryption: 'Grafo nivel 2 · Encriptar propiedad',
};

const graphProtectionHelp: Partial<Record<ProtectionMode, string>> = {
  virtual_view: 'No modifica Neo4j: Enmask consulta nodos/relaciones y devuelve propiedades enmascaradas.',
  masked_view: 'Neo4j no tiene CREATE VIEW relacional; se registra como vista virtual de grafo generada por Enmask.',
  masked_column: 'Crea una propiedad derivada, por ejemplo dni_masked, en cada nodo o relación seleccionada.',
  static_mask: 'Sobrescribe la propiedad original del nodo/relación y guarda respaldo para restaurar.',
  symmetric_encryption: 'Cifra físicamente la propiedad del nodo/relación con la llave simétrica del backend.',
};

function modeLabel(mode: ProtectionMode, isGraph = false) {
  return (isGraph ? graphProtectionLabels[mode] : undefined) || protectionLabels[mode] || mode;
}

function modeHelp(mode: ProtectionMode, isGraph = false) {
  return (isGraph ? graphProtectionHelp[mode] : undefined) || protectionHelp[mode] || '';
}

const defaultForm: RuleCreate = {
  name: '',
  connection_id: '',
  target_table: '',
  target_column: '',
  strategy: 'redaction',
  protection_mode: 'masked_view',
  output_column: '',
  view_name: '',
  key_alias: '',
  strategy_options: { keep_left: 2, keep_right: 2, mask_char: '*', mask_length: 4 },
  graph_element: 'node',
};

export default function Rules({ addToast }: Props) {
  const [rules, setRules] = useState<MaskingRule[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<RuleCreate>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [r, c] = await Promise.all([getRules(), getConnections()]);
      setRules(r); setConnections(c);
    } catch { addToast('No se pudieron cargar las reglas', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const getConnectionName = (id: string) =>
    connections.find(c => c.id === id)?.name ?? id.slice(0, 8) + '…';

  const openNewModal = () => {
    setEditingId(null);
    setForm(defaultForm);
    setShowModal(true);
  };

  const openEditModal = (rule: MaskingRule) => {
    setEditingId(rule.id);
    setForm({
      name: rule.name,
      connection_id: rule.connection_id,
      target_table: rule.target_table,
      target_column: rule.target_column,
      strategy: rule.strategy,
      protection_mode: rule.protection_mode || 'masked_view',
      output_column: rule.output_column || '',
      view_name: rule.view_name || '',
      key_alias: rule.key_alias || '',
      strategy_options: rule.strategy_options || { keep_left: 2, keep_right: 2, mask_char: '*', mask_length: 4 },
      graph_element: rule.graph_element || 'node',
    });
    setShowModal(true);
  };

  const updatePatternOption = (key: string, value: string | number) => {
    setForm(p => ({ ...p, strategy_options: { ...p.strategy_options, [key]: value } }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const selectedConn = connections.find(c => c.id === form.connection_id);
      const cleanPayload: RuleCreate = {
        ...form,
        output_column: form.output_column?.trim() || null,
        view_name: form.view_name?.trim() || null,
        key_alias: form.key_alias?.trim() || null,
        graph_element: selectedConn?.type === 'neo4j' ? (form.graph_element || 'node') : null,
      };
      if (editingId) {
        await updateRule(editingId, cleanPayload);
        addToast('Regla actualizada correctamente', 'success');
      } else {
        await createRule(cleanPayload);
        addToast('Regla creada correctamente', 'success');
      }
      setShowModal(false);
      setForm(defaultForm);
      setEditingId(null);
      load();
    } catch (err: unknown) {
      addToast((err as Error).message ?? `No se pudo ${editingId ? 'actualizar' : 'crear'} la regla`, 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar esta regla?')) return;
    try {
      await deleteRule(id);
      addToast('Regla eliminada', 'success');
      load();
    } catch { addToast('No se pudo eliminar la regla', 'error'); }
  };

  const selectedMode = (form.protection_mode || 'masked_view') as ProtectionMode;
  const selectedConnection = connections.find(c => c.id === form.connection_id);
  const isNeo4j = selectedConnection?.type === 'neo4j';
  const graphElement = (form.graph_element || 'node') as GraphElementKind;

  return (
    <div className="page-content">
      <div className="card">
        <div className="card-header">
          <h2>Reglas de Protección de Datos</h2>
          <button id="btn-add-rule" className="btn btn-primary" onClick={openNewModal}>
            + Nueva regla
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : rules.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">◉</div>
            <h3>No hay reglas todavía</h3>
            <p>Crea una regla para indicar qué columna se protege y cómo se mostrará.</p>
            <button className="btn btn-primary" onClick={openNewModal}>Crear regla</button>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Conexión</th>
                  <th>Tabla / Colección / Label</th>
                  <th>Columna / Campo / Propiedad</th>
                  <th>Modo</th>
                  <th>Estrategia</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rules.map(r => (
                  <tr key={r.id}>
                    <td><span className="cell-primary">{r.name}</span></td>
                    <td>{getConnectionName(r.connection_id)}</td>
                    <td><code style={{ fontSize: 12, color: 'var(--color-accent-2)' }}>{connections.find(c => c.id === r.connection_id)?.type === 'neo4j' ? `${r.graph_element || 'node'}:${r.target_table}` : r.target_table}</code></td>
                    <td><code style={{ fontSize: 12, color: 'var(--color-success)' }}>{r.target_column}</code></td>
                    <td><span className="badge badge-warning">{modeLabel(r.protection_mode, connections.find(c => c.id === r.connection_id)?.type === 'neo4j')}</span></td>
                    <td><span className="badge badge-info">{strategyLabels[r.strategy] ?? r.strategy}</span></td>
                    <td style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-secondary btn-icon" onClick={() => openEditModal(r)} title="Editar regla">✎</button>
                      <button className="btn btn-danger btn-icon" id={`btn-del-rule-${r.id}`} onClick={() => handleDelete(r.id)} title="Eliminar regla">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Editar regla' : 'Nueva regla'}</h2>
              <button className="modal-close" id="btn-close-rule-modal" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="rule-name">Nombre de la regla</label>
                  <input id="rule-name" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ej. Enmascarar DNI de clientes" />
                </div>
                <div className="form-group">
                  <label htmlFor="rule-conn">Conexión</label>
                  <select id="rule-conn" required value={form.connection_id} onChange={e => { const conn = connections.find(c => c.id === e.target.value); setForm(p => ({ ...p, connection_id: e.target.value, graph_element: conn?.type === 'neo4j' ? (p.graph_element || 'node') : null })); }}>
                    <option value="">Selecciona una conexión…</option>
                    {connections.map(c => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)}
                  </select>
                </div>

                {isNeo4j && (
                  <div className="form-group">
                    <label htmlFor="rule-graph-element">Tipo de elemento del grafo</label>
                    <select id="rule-graph-element" value={graphElement} onChange={e => setForm(p => ({ ...p, graph_element: e.target.value as GraphElementKind }))}>
                      <option value="node">Nodo · Label</option>
                      <option value="relationship">Relación · Tipo</option>
                    </select>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>En Neo4j no se trabaja con tablas: se protege una propiedad de un nodo o de una relación.</p>
                  </div>
                )}

                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label htmlFor="rule-table">{isNeo4j ? (graphElement === 'node' ? 'Label del nodo' : 'Tipo de relación') : 'Tabla / Colección'}</label>
                    <input id="rule-table" required value={form.target_table} onChange={e => setForm(p => ({ ...p, target_table: e.target.value }))} placeholder={isNeo4j ? (graphElement === 'node' ? 'Cliente' : 'COMPRA') : 'clientes'} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="rule-column">{isNeo4j ? 'Propiedad sensible' : 'Columna / Campo sensible'}</label>
                    <input id="rule-column" required value={form.target_column} onChange={e => setForm(p => ({ ...p, target_column: e.target.value }))} placeholder={isNeo4j ? 'dni' : 'dni'} />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="rule-protection">Modo de protección</label>
                  <select id="rule-protection" value={selectedMode} onChange={e => setForm(p => ({ ...p, protection_mode: e.target.value as ProtectionMode }))}>
                    {Object.keys(protectionLabels).map(v => <option key={v} value={v}>{modeLabel(v as ProtectionMode, isNeo4j)}</option>)}
                  </select>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{modeHelp(selectedMode, isNeo4j)}</p>
                </div>

                {(selectedMode === 'masked_view') && (
                  <div className="form-group">
                    <label htmlFor="rule-view-name">{isNeo4j ? 'Nombre de vista virtual (opcional)' : 'Nombre de vista (opcional)'}</label>
                    <input id="rule-view-name" value={form.view_name || ''} onChange={e => setForm(p => ({ ...p, view_name: e.target.value }))} placeholder={isNeo4j ? 'vw_grafo_clientes_enmascarado' : 'vw_clientes_enmascarado'} />
                  </div>
                )}

                {(selectedMode === 'masked_column' || selectedMode === 'masked_view' || selectedMode === 'virtual_view') && (
                  <div className="form-group">
                    <label htmlFor="rule-output-column">{isNeo4j ? 'Propiedad enmascarada (opcional)' : 'Columna/campo enmascarado (opcional)'}</label>
                    <input id="rule-output-column" value={form.output_column || ''} onChange={e => setForm(p => ({ ...p, output_column: e.target.value }))} placeholder={`${form.target_column || (isNeo4j ? 'propiedad' : 'campo')}_masked`} />
                  </div>
                )}

                {selectedMode === 'symmetric_encryption' && (
                  <div className="form-group">
                    <label htmlFor="rule-key-alias">Alias de llave (opcional)</label>
                    <input id="rule-key-alias" value={form.key_alias || ''} onChange={e => setForm(p => ({ ...p, key_alias: e.target.value }))} placeholder="llave_admin_principal" />
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>La llave real se configura en ENMASK_MASTER_KEY del backend, no se guarda en la regla.</p>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="rule-strategy">Estrategia de máscara</label>
                  <select id="rule-strategy" value={form.strategy} onChange={e => setForm(p => ({ ...p, strategy: e.target.value as RuleCreate['strategy'] }))} disabled={selectedMode === 'symmetric_encryption'}>
                    {Object.entries(strategyLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  {selectedMode === 'symmetric_encryption' && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>En nivel 2 se usa encriptación simétrica; la estrategia de máscara solo aplica a visualización.</p>}
                </div>

                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label>Conservar al inicio</label>
                    <input type="number" min={0} value={Number(form.strategy_options?.keep_left ?? 2)} onChange={e => updatePatternOption('keep_left', parseInt(e.target.value || '0', 10))} />
                  </div>
                  <div className="form-group">
                    <label>Conservar al final</label>
                    <input type="number" min={0} value={Number(form.strategy_options?.keep_right ?? 2)} onChange={e => updatePatternOption('keep_right', parseInt(e.target.value || '0', 10))} />
                  </div>
                </div>

                {form.strategy === 'substitution' && (
                  <div className="form-group">
                    <label htmlFor="rule-provider">Proveedor Faker</label>
                    <input id="rule-provider" placeholder="name, email, phone_number" value={String(form.strategy_options?.provider ?? '')} onChange={e => updatePatternOption('provider', e.target.value)} />
                  </div>
                )}
                {form.strategy === 'hashing' && (
                  <div className="form-group">
                    <label htmlFor="rule-salt">Salt opcional</label>
                    <input id="rule-salt" placeholder="Salt opcional" value={String(form.strategy_options?.salt ?? '')} onChange={e => updatePatternOption('salt', e.target.value)} />
                  </div>
                )}
                {form.strategy === 'perturbation' && (
                  <div className="form-grid form-grid-2">
                    <div className="form-group">
                      <label htmlFor="rule-pert-type">Tipo de variación</label>
                      <select id="rule-pert-type" value={String(form.strategy_options?.variance_type ?? 'percentage')} onChange={e => updatePatternOption('variance_type', e.target.value)}>
                        <option value="percentage">Porcentaje</option>
                        <option value="days">Días</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="rule-pert-val">Valor (+/-)</label>
                      <input id="rule-pert-val" type="number" value={Number(form.strategy_options?.variance_value ?? 10)} onChange={e => updatePatternOption('variance_value', parseFloat(e.target.value || '0'))} />
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" id="btn-submit-rule" className="btn btn-primary" disabled={saving}>{saving ? <><span className="spinner" />Guardando…</> : 'Guardar regla'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
