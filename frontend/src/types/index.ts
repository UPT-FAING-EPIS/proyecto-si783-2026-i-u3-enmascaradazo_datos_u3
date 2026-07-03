export type ConnectionType = 'postgres' | 'mysql' | 'mariadb' | 'sqlite' | 'sqlserver' | 'oracle' | 'cassandra' | 'mongodb' | 'redis' | 'neo4j';
export type MaskingStrategyType = 'substitution' | 'hashing' | 'redaction' | 'nullification' | 'fpe' | 'perturbation';
export type MaskingRunMode = 'dry_run' | 'apply';
export type ProtectionMode = 'virtual_view' | 'masked_view' | 'masked_column' | 'static_mask' | 'symmetric_encryption';
export type GraphElementKind = 'node' | 'relationship';
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'unmasked';

export interface Connection {
  id: string;
  name: string;
  type: ConnectionType;
  host: string;
  port: number;
  database: string;
  username: string;
  additional_options?: Record<string, unknown> | null;
}

export interface ConnectionCreate {
  name: string;
  type: ConnectionType;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  additional_options?: Record<string, unknown>;
}


export interface SupportedDatabaseInfo {
  type: ConnectionType;
  label: string;
  category: string;
  default_port: number;
  database_label: string;
  requires_host: boolean;
  supports_native_view: boolean;
  supports_masked_column: boolean;
  notes: string;
}

export interface ConnectionTestResponse {
  success: boolean;
  message: string;
  type: ConnectionType;
  host: string;
  port: number;
  database: string;
}

export interface MaskingRule {
  id: string;
  name: string;
  connection_id: string;
  target_table: string;
  target_column: string;
  strategy: MaskingStrategyType;
  strategy_options: Record<string, unknown>;
  protection_mode: ProtectionMode;
  output_column?: string | null;
  view_name?: string | null;
  key_alias?: string | null;
  graph_element?: GraphElementKind | null;
}

export interface RuleCreate {
  name: string;
  connection_id: string;
  target_table: string;
  target_column: string;
  strategy: MaskingStrategyType;
  strategy_options?: Record<string, unknown>;
  protection_mode?: ProtectionMode;
  output_column?: string | null;
  view_name?: string | null;
  key_alias?: string | null;
  graph_element?: GraphElementKind | null;
}

export interface MaskingJob {
  id: string;
  connection_id: string;
  rule_ids: string[];
  run_mode: MaskingRunMode;
  status: JobStatus;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  records_processed: number;
  records_previewed: number;
  affected_tables: string[];
  preview_sample: Record<string, unknown>[];
  generated_artifacts: Record<string, unknown>[];
  owner_id?: string | null;
  shared_with: string[];
}

export interface JobCreate {
  connection_id: string;
  rule_ids: string[];
  run_mode?: MaskingRunMode;
}

export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  role: 'user' | 'admin';
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Summary {
  total_connections: number;
  total_rules: number;
  total_jobs: number;
  total_records_processed: number;
}

export interface DynamicQueryResponse {
  data: Record<string, unknown>[];
  total_records: number;
  is_masked: boolean;
}

export interface MaskingPreviewResponse {
  job_id: string;
  run_mode: MaskingRunMode;
  records_previewed: number;
  preview_sample: Record<string, unknown>[];
  generated_artifacts: Record<string, unknown>[];
}

export interface ShareJobRequest {
  email: string;
}

export interface AuditLogEntry {
  id: string;
  job_id: string;
  user_id: string;
  user_email: string;
  user_role: string;
  action: string;
  is_masked: boolean;
  timestamp: string;
}

export interface SchemaTarget {
  name: string;
  label: string;
  columns: string[];
  kind: 'table' | 'collection' | 'key' | 'node' | 'relationship' | string;
  row_count_available?: boolean;
}

export interface ConnectionSchemaResponse {
  connection_id: string;
  engine: ConnectionType;
  targets: SchemaTarget[];
  graph_nodes: Record<string, string[]>;
  graph_relationships: Record<string, string[]>;
}

export interface TablePreviewResponse {
  connection_id: string;
  engine: ConnectionType;
  target: string;
  graph_element?: GraphElementKind | null;
  columns: string[];
  rows: Record<string, unknown>[];
  total_returned: number;
}

export interface WorkbenchFieldRuleRequest {
  target_column: string;
  strategy: MaskingStrategyType;
  strategy_options?: Record<string, unknown>;
  protection_mode?: ProtectionMode;
}

export interface WorkbenchMaskPreviewRequest {
  connection_id: string;
  target_table: string;
  target_columns?: string[];
  strategy?: MaskingStrategyType;
  strategy_options?: Record<string, unknown>;
  field_rules?: WorkbenchFieldRuleRequest[];
  graph_element?: GraphElementKind | null;
  limit?: number;
}

export interface WorkbenchMaskPreviewResponse {
  connection_id: string;
  engine: ConnectionType;
  target: string;
  graph_element?: GraphElementKind | null;
  original_rows: Record<string, unknown>[];
  masked_rows: Record<string, unknown>[];
  protected_columns: string[];
  total_previewed: number;
  mode_hint: string;
}
