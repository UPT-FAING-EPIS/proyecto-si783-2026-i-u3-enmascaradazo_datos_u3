from datetime import datetime
from fnmatch import fnmatch
from typing import Any, Dict, List, Optional, Tuple

from app.application.schemas import JobCreate, JobResponse, MaskingPreviewResponse
from app.core.crypto import decrypt_value, encrypt_value
from app.core.exceptions import ResourceNotFoundError
from app.domain.entities.audit_log import AuditLog
from app.domain.entities.masking_job import JobStatus, MaskingJob
from app.domain.entities.masking_rule import MaskingRule
from app.domain.interfaces.repository import (
    AuditLogRepository,
    ConnectionRepository,
    JobRepository,
    RuleRepository,
    UserRepository,
)
from app.domain.value_objects.database_type import DatabaseType
from app.domain.value_objects.masking_algorithm import MaskingAlgorithm
from app.domain.value_objects.graph_element_kind import GraphElementKind
from app.domain.value_objects.masking_run_mode import MaskingRunMode
from app.domain.value_objects.protection_mode import ProtectionMode
from app.infrastructure.db.factory import create_database_client, is_document_database, is_graph_database, is_sql_database
from app.infrastructure.masking.strategies import (
    FPEStrategy,
    HashingStrategy,
    NullificationStrategy,
    PerturbationStrategy,
    RedactionStrategy,
    SubstitutionStrategy,
)
from app.infrastructure.repositories.memory_repository import connection_repository, job_repository, rule_repository
from app.infrastructure.repositories.vault_repo import file_vault_repository


class JobOrchestrator:
    def __init__(
        self,
        connection_repository: ConnectionRepository,
        rule_repository: RuleRepository,
        job_repository: JobRepository,
        audit_repository: AuditLogRepository = None,
        user_repository: UserRepository = None,
        vault_repository=None,
    ):
        self._connection_repository = connection_repository
        self._rule_repository = rule_repository
        self._job_repository = job_repository
        self._audit_repository = audit_repository
        self._user_repository = user_repository
        self._vault_repository = vault_repository
        self._strategies = {
            MaskingAlgorithm.SUBSTITUTION: SubstitutionStrategy(),
            MaskingAlgorithm.HASHING: HashingStrategy(),
            MaskingAlgorithm.REDACTION: RedactionStrategy(),
            MaskingAlgorithm.NULLIFICATION: NullificationStrategy(),
            MaskingAlgorithm.FPE: FPEStrategy(),
            MaskingAlgorithm.PERTURBATION: PerturbationStrategy(),
        }

    async def create_job(self, data: JobCreate, owner_id: str) -> JobResponse:
        connection = await self._connection_repository.get_by_id(data.connection_id)
        if not connection or getattr(connection, "owner_id", None) != owner_id:
            raise ResourceNotFoundError("Connection", data.connection_id)

        for rule_id in data.rule_ids:
            rule = await self._rule_repository.get_by_id(rule_id)
            if not rule or getattr(rule, "owner_id", None) != owner_id:
                raise ResourceNotFoundError("Rule", rule_id)
            if rule.connection_id != data.connection_id:
                raise ValueError("Todas las reglas del job deben pertenecer a la misma conexión.")

        job = MaskingJob(
            connection_id=data.connection_id,
            rule_ids=data.rule_ids,
            run_mode=data.run_mode,
            owner_id=owner_id,
        )
        created = await self._job_repository.create(job)
        return JobResponse.model_validate(created.model_dump())

    async def get_all_jobs(self, owner_id: str) -> List[JobResponse]:
        jobs = await self._job_repository.get_all()
        owned_jobs = [j for j in jobs if getattr(j, "owner_id", None) == owner_id]
        return [JobResponse.model_validate(j.model_dump()) for j in owned_jobs]

    async def get_job(self, id: str, owner_id: str) -> JobResponse:
        job = await self._job_repository.get_by_id(id)
        if not job or getattr(job, "owner_id", None) != owner_id:
            raise ResourceNotFoundError("Job", id)
        return JobResponse.model_validate(job.model_dump())

    async def run_job(self, job_id: str, owner_id: str) -> None:
        job = await self._job_repository.get_by_id(job_id)
        if not job or getattr(job, "owner_id", None) != owner_id:
            raise ResourceNotFoundError("Job", job_id)

        job.status = JobStatus.RUNNING
        job.started_at = datetime.utcnow()
        job.completed_at = None
        job.error_message = None
        job.preview_sample = []
        job.records_previewed = 0
        job.records_processed = 0
        job.generated_artifacts = []
        await self._job_repository.update(job_id, job)

        try:
            connection = await self._connection_repository.get_by_id(job.connection_id)
            if not connection or getattr(connection, "owner_id", None) != owner_id:
                raise ResourceNotFoundError("Connection", job.connection_id)

            rules = await self._load_owned_rules(job.rule_ids, owner_id)
            client = create_database_client(connection)

            if is_sql_database(connection):
                result = await self._process_sql(client, connection.type, rules, job_id, job.run_mode)
            elif is_document_database(connection):
                result = await self._process_mongodb(client, rules, job_id, job.run_mode)
            elif is_graph_database(connection):
                result = await self._process_graph(client, rules, job_id, job.run_mode)
            else:
                raise ValueError(f"Motor no soportado: {connection.type}")

            job.status = JobStatus.COMPLETED
            job.completed_at = datetime.utcnow()
            job.records_processed = result["records_processed"]
            job.records_previewed = result["records_previewed"]
            job.affected_tables = result["affected_tables"]
            job.preview_sample = result["preview_sample"]
            job.generated_artifacts = result["generated_artifacts"]
            await self._job_repository.update(job_id, job)
        except Exception as exc:
            job.status = JobStatus.FAILED
            job.error_message = str(exc)
            job.completed_at = datetime.utcnow()
            await self._job_repository.update(job_id, job)

    async def preview_job(self, job_id: str, owner_id: str, limit: int = 20) -> MaskingPreviewResponse:
        job = await self._job_repository.get_by_id(job_id)
        if not job or getattr(job, "owner_id", None) != owner_id:
            raise ResourceNotFoundError("Job", job_id)

        connection = await self._connection_repository.get_by_id(job.connection_id)
        if not connection or getattr(connection, "owner_id", None) != owner_id:
            raise ResourceNotFoundError("Connection", job.connection_id)

        rules = await self._load_owned_rules(job.rule_ids, owner_id)
        client = create_database_client(connection)
        if is_sql_database(connection):
            result = await self._process_sql(client, connection.type, rules, job_id, MaskingRunMode.DRY_RUN, limit=limit)
        elif is_document_database(connection):
            result = await self._process_mongodb(client, rules, job_id, MaskingRunMode.DRY_RUN, limit=limit)
        elif is_graph_database(connection):
            result = await self._process_graph(client, rules, job_id, MaskingRunMode.DRY_RUN, limit=limit)
        else:
            raise ValueError(f"Motor no soportado: {connection.type}")

        return MaskingPreviewResponse(
            job_id=job_id,
            run_mode=MaskingRunMode.DRY_RUN,
            records_previewed=result["records_previewed"],
            preview_sample=result["preview_sample"],
        )

    async def _load_owned_rules(self, rule_ids: List[str], owner_id: str) -> List[MaskingRule]:
        rules: List[MaskingRule] = []
        for rule_id in rule_ids:
            rule = await self._rule_repository.get_by_id(rule_id)
            if rule and getattr(rule, "owner_id", None) == owner_id:
                rules.append(rule)
        return rules

    async def _process_sql(
        self,
        client,
        database_type: DatabaseType,
        rules: List[MaskingRule],
        job_id: str,
        run_mode: MaskingRunMode,
        limit: Optional[int] = None,
    ) -> Dict[str, Any]:
        tables = sorted({rule.target_table for rule in rules})
        processed = 0
        previewed = 0
        preview_sample: List[Dict[str, Any]] = []
        affected_tables: List[str] = []
        generated_artifacts: List[Dict[str, Any]] = []
        schema = await client.get_schema()

        for table in tables:
            table_rules = [rule for rule in rules if rule.target_table == table]
            self._validate_rule_targets(table, table_rules, schema)
            affected_tables.append(table)

            preview_records = await client.select_all(table, limit=limit or 20)
            pk_columns = await self._primary_key_columns(client, table, preview_records[0] if preview_records else None)
            pk_label = ",".join(pk_columns) if pk_columns else "id"
            for record in preview_records:
                updates = self._build_result_values(record, table_rules)
                if updates:
                    previewed += 1
                    if len(preview_sample) < 20:
                        preview_sample.append(self._build_preview_item(table, pk_label, record, updates))

            if run_mode == MaskingRunMode.DRY_RUN:
                continue

            view_rules = [r for r in table_rules if r.protection_mode == ProtectionMode.MASKED_VIEW]
            if view_rules:
                view_name = self._view_name(table, job_id, view_rules[0])
                select_sql = self._build_sql_masked_view_select(client, database_type, table, view_rules, schema)
                await client.create_view(view_name, select_sql)
                generated_artifacts.append({"type": "view", "name": view_name, "table": table, "mode": ProtectionMode.MASKED_VIEW.value})

            virtual_rules = [r for r in table_rules if r.protection_mode == ProtectionMode.VIRTUAL_VIEW]
            if virtual_rules:
                generated_artifacts.append({"type": "virtual", "table": table, "mode": ProtectionMode.VIRTUAL_VIEW.value})

            column_rules = [r for r in table_rules if r.protection_mode == ProtectionMode.MASKED_COLUMN]
            for rule in column_rules:
                out_col = self._output_column(rule)
                await client.add_text_column(table, out_col)
                generated_artifacts.append({"type": "column", "name": out_col, "table": table, "mode": ProtectionMode.MASKED_COLUMN.value})

            physical_rules = [
                r for r in table_rules
                if r.protection_mode in {ProtectionMode.MASKED_COLUMN, ProtectionMode.STATIC_MASK, ProtectionMode.SYMMETRIC_ENCRYPTION}
            ]
            if not physical_rules:
                continue

            records = await client.select_all(table, limit=limit)
            pk_columns = await self._primary_key_columns(client, table, records[0] if records else None)
            pk_label = ",".join(pk_columns) if pk_columns else "id"
            for record in records:
                pk_value = self._record_pk_value(record, pk_columns)
                if pk_value is None:
                    continue
                updates = self._build_physical_updates(record, physical_rules)
                if not updates:
                    continue
                if self._needs_backup(physical_rules) and self._vault_repository:
                    original_data = {rule.target_column: record.get(rule.target_column) for rule in physical_rules if rule.protection_mode in {ProtectionMode.STATIC_MASK, ProtectionMode.SYMMETRIC_ENCRYPTION}}
                    if original_data:
                        await self._vault_repository.save_backup(job_id, table, str(pk_value), original_data, pk_column=pk_label)
                await client.update_record(table, pk_label, pk_value, updates)
                processed += 1

        return {
            "records_processed": processed,
            "records_previewed": previewed,
            "affected_tables": affected_tables,
            "preview_sample": preview_sample,
            "generated_artifacts": generated_artifacts,
        }

    async def _process_mongodb(
        self,
        client,
        rules: List[MaskingRule],
        job_id: str,
        run_mode: MaskingRunMode,
        limit: Optional[int] = None,
    ) -> Dict[str, Any]:
        collections = sorted({rule.target_table for rule in rules})
        processed = 0
        previewed = 0
        preview_sample: List[Dict[str, Any]] = []
        affected_tables: List[str] = []
        generated_artifacts: List[Dict[str, Any]] = []
        schema = await client.get_schema()

        for collection in collections:
            collection_rules = [rule for rule in rules if rule.target_table == collection]
            self._validate_rule_targets(collection, collection_rules, schema)
            affected_tables.append(collection)

            preview_records = await client.fetch_all(collection)
            if limit is not None:
                preview_records = preview_records[:limit]
            else:
                preview_records = preview_records[:20]
            for record in preview_records:
                updates = self._build_result_values(record, collection_rules)
                if updates:
                    previewed += 1
                    if len(preview_sample) < 20:
                        preview_sample.append(self._build_preview_item(collection, "_id", record, updates))

            if run_mode == MaskingRunMode.DRY_RUN:
                continue

            view_rules = [r for r in collection_rules if r.protection_mode == ProtectionMode.MASKED_VIEW]
            if view_rules:
                view_name = self._view_name(collection, job_id, view_rules[0])
                pipeline = self._build_mongo_masked_view_pipeline(collection, view_rules, schema)
                await client.create_view(view_name, collection, pipeline)
                generated_artifacts.append({"type": "view", "name": view_name, "collection": collection, "mode": ProtectionMode.MASKED_VIEW.value})

            virtual_rules = [r for r in collection_rules if r.protection_mode == ProtectionMode.VIRTUAL_VIEW]
            if virtual_rules:
                generated_artifacts.append({"type": "virtual", "collection": collection, "mode": ProtectionMode.VIRTUAL_VIEW.value})

            physical_rules = [
                r for r in collection_rules
                if r.protection_mode in {ProtectionMode.MASKED_COLUMN, ProtectionMode.STATIC_MASK, ProtectionMode.SYMMETRIC_ENCRYPTION}
            ]
            for rule in physical_rules:
                if rule.protection_mode == ProtectionMode.MASKED_COLUMN:
                    generated_artifacts.append({"type": "field", "name": self._output_column(rule), "collection": collection, "mode": ProtectionMode.MASKED_COLUMN.value})
            if not physical_rules:
                continue

            records = await client.fetch_all(collection)
            if limit is not None:
                records = records[:limit]
            for record in records:
                pk_value = record.get("_id")
                updates = self._build_physical_updates(record, physical_rules)
                if not updates:
                    continue
                if self._needs_backup(physical_rules) and self._vault_repository:
                    original_data = {rule.target_column: record.get(rule.target_column) for rule in physical_rules if rule.protection_mode in {ProtectionMode.STATIC_MASK, ProtectionMode.SYMMETRIC_ENCRYPTION}}
                    if original_data:
                        await self._vault_repository.save_backup(job_id, collection, str(pk_value), original_data, pk_column="_id")
                await client.update_record(collection, pk_value, updates)
                processed += 1

        return {
            "records_processed": processed,
            "records_previewed": previewed,
            "affected_tables": affected_tables,
            "preview_sample": preview_sample,
            "generated_artifacts": generated_artifacts,
        }


    async def _process_graph(
        self,
        client,
        rules: List[MaskingRule],
        job_id: str,
        run_mode: MaskingRunMode,
        limit: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Procesa reglas Neo4j con semantica de grafo.

        target_table no es una tabla: es un label de nodo o un tipo de relacion.
        target_column no es una columna: es una propiedad del nodo/relacion.
        """
        groups = sorted({(self._rule_graph_kind(rule), rule.target_table) for rule in rules}, key=lambda item: (item[0].value, item[1]))
        processed = 0
        previewed = 0
        preview_sample: List[Dict[str, Any]] = []
        affected_tables: List[str] = []
        generated_artifacts: List[Dict[str, Any]] = []
        graph_schema = await client.get_graph_schema()

        for graph_kind, target in groups:
            group_rules = [rule for rule in rules if self._rule_graph_kind(rule) == graph_kind and rule.target_table == target]
            self._validate_graph_rule_targets(graph_kind, target, group_rules, graph_schema)
            scope = self._graph_scope(graph_kind, target)
            affected_tables.append(scope)

            preview_records = await client.fetch_graph_elements(graph_kind.value, target, limit=limit or 20)
            for record in preview_records:
                updates = self._build_result_values(record, group_rules)
                if updates:
                    previewed += 1
                    if len(preview_sample) < 20:
                        preview_sample.append(self._build_preview_item(scope, "elementId", record, updates))

            if run_mode == MaskingRunMode.DRY_RUN:
                continue

            virtual_rules = [r for r in group_rules if r.protection_mode in {ProtectionMode.VIRTUAL_VIEW, ProtectionMode.MASKED_VIEW}]
            if virtual_rules:
                generated_artifacts.append({
                    "type": "virtual_graph_view",
                    "name": self._view_name(target, job_id, virtual_rules[0]),
                    "graph_element": graph_kind.value,
                    "target": target,
                    "mode": ProtectionMode.MASKED_VIEW.value,
                    "note": "Neo4j no crea vistas SQL; Enmask genera la vista virtual al consultar el grafo.",
                })

            column_rules = [r for r in group_rules if r.protection_mode == ProtectionMode.MASKED_COLUMN]
            for rule in column_rules:
                generated_artifacts.append({
                    "type": "graph_property",
                    "name": self._output_column(rule),
                    "graph_element": graph_kind.value,
                    "target": target,
                    "mode": ProtectionMode.MASKED_COLUMN.value,
                })

            physical_rules = [
                r for r in group_rules
                if r.protection_mode in {ProtectionMode.MASKED_COLUMN, ProtectionMode.STATIC_MASK, ProtectionMode.SYMMETRIC_ENCRYPTION}
            ]
            if not physical_rules:
                continue

            records = await client.fetch_graph_elements(graph_kind.value, target, limit=limit or 500)
            for record in records:
                element_id = record.get("_id")
                updates = self._build_physical_updates(record, physical_rules)
                if not updates:
                    continue
                if self._needs_backup(physical_rules) and self._vault_repository:
                    original_data = {
                        rule.target_column: record.get(rule.target_column)
                        for rule in physical_rules
                        if rule.protection_mode in {ProtectionMode.STATIC_MASK, ProtectionMode.SYMMETRIC_ENCRYPTION}
                    }
                    if original_data:
                        await self._vault_repository.save_backup(job_id, scope, str(element_id), original_data, pk_column="elementId")
                await client.update_graph_element(graph_kind.value, target, element_id, updates)
                processed += 1

        return {
            "records_processed": processed,
            "records_previewed": previewed,
            "affected_tables": affected_tables,
            "preview_sample": preview_sample,
            "generated_artifacts": generated_artifacts,
        }

    async def unmask_job(self, job_id: str, owner_id: str) -> None:
        job = await self._job_repository.get_by_id(job_id)
        if not job or getattr(job, "owner_id", None) != owner_id:
            raise ResourceNotFoundError("Job", job_id)

        job.status = JobStatus.RUNNING
        job.error_message = None
        await self._job_repository.update(job_id, job)

        connection = await self._connection_repository.get_by_id(job.connection_id)
        if not connection or getattr(connection, "owner_id", None) != owner_id:
            raise ResourceNotFoundError("Connection", job.connection_id)

        try:
            rules = await self._load_owned_rules(job.rule_ids, owner_id)
            client = create_database_client(connection)
            if is_sql_database(connection):
                await self._unmask_sql(client, rules, job_id)
            elif is_document_database(connection):
                await self._unmask_mongodb(client, rules, job_id)
            elif is_graph_database(connection):
                await self._unmask_graph(client, rules, job_id)
            else:
                raise ValueError(f"Motor no soportado: {connection.type}")

            if self._vault_repository:
                await self._vault_repository.delete_backups_for_job(job_id)

            job.status = JobStatus.UNMASKED
            job.completed_at = datetime.utcnow()
            job.generated_artifacts = []
            await self._job_repository.update(job_id, job)
        except Exception as exc:
            job.status = JobStatus.FAILED
            job.error_message = f"Unmask failed: {str(exc)}"
            job.completed_at = datetime.utcnow()
            await self._job_repository.update(job_id, job)
            raise exc

    async def _unmask_sql(self, client, rules: List[MaskingRule], job_id: str) -> None:
        tables = sorted({rule.target_table for rule in rules})
        for table in tables:
            table_rules = [rule for rule in rules if rule.target_table == table]
            for rule in table_rules:
                if rule.protection_mode == ProtectionMode.MASKED_VIEW:
                    await client.drop_view(self._view_name(table, job_id, rule))
                elif rule.protection_mode == ProtectionMode.MASKED_COLUMN:
                    await client.drop_column(table, self._output_column(rule))

            physical_rules = [
                r for r in table_rules
                if r.protection_mode in {ProtectionMode.STATIC_MASK, ProtectionMode.SYMMETRIC_ENCRYPTION}
            ]
            if not physical_rules:
                continue

            backups = await self._vault_repository.get_backups_for_job(job_id) if self._vault_repository else []
            if backups:
                await self._restore_from_vault(client, job_id)
                continue

            encryption_rules = [r for r in physical_rules if r.protection_mode == ProtectionMode.SYMMETRIC_ENCRYPTION]
            static_rules = [r for r in physical_rules if r.protection_mode == ProtectionMode.STATIC_MASK]
            if static_rules:
                raise Exception(
                    "No hay respaldo en el vault para restaurar la mascara fisica. "
                    "La mascara fisica no es reversible por si sola; debe existir backup previo."
                )
            if encryption_rules:
                records = await client.select_all(table)
                pk = await client.get_primary_key(table) or (self._infer_pk(records[0]) if records else "id")
                for record in records:
                    if pk not in record:
                        continue
                    updates = {}
                    for rule in encryption_rules:
                        if rule.target_column in record and record.get(rule.target_column) is not None:
                            updates[rule.target_column] = decrypt_value(record.get(rule.target_column))
                    if updates:
                        await client.update_record(table, pk, record[pk], updates)

    async def _unmask_mongodb(self, client, rules: List[MaskingRule], job_id: str) -> None:
        collections = sorted({rule.target_table for rule in rules})
        for collection in collections:
            collection_rules = [rule for rule in rules if rule.target_table == collection]
            for rule in collection_rules:
                if rule.protection_mode == ProtectionMode.MASKED_VIEW:
                    await client.drop_view(self._view_name(collection, job_id, rule))
                elif rule.protection_mode == ProtectionMode.MASKED_COLUMN:
                    await client.unset_field(collection, self._output_column(rule))

            physical_rules = [
                r for r in collection_rules
                if r.protection_mode in {ProtectionMode.STATIC_MASK, ProtectionMode.SYMMETRIC_ENCRYPTION}
            ]
            if not physical_rules:
                continue

            backups = await self._vault_repository.get_backups_for_job(job_id) if self._vault_repository else []
            if backups:
                await self._restore_from_vault_mongodb(client, job_id)
                continue

            encryption_rules = [r for r in physical_rules if r.protection_mode == ProtectionMode.SYMMETRIC_ENCRYPTION]
            static_rules = [r for r in physical_rules if r.protection_mode == ProtectionMode.STATIC_MASK]
            if static_rules:
                raise Exception(
                    "No hay respaldo en el vault para restaurar la mascara fisica. "
                    "La mascara fisica no es reversible por si sola; debe existir backup previo."
                )
            if encryption_rules:
                records = await client.fetch_all(collection)
                for record in records:
                    pk_value = record.get("_id")
                    updates = {}
                    for rule in encryption_rules:
                        if rule.target_column in record and record.get(rule.target_column) is not None:
                            updates[rule.target_column] = decrypt_value(record.get(rule.target_column))
                    if updates:
                        await client.update_record(collection, pk_value, updates)

    async def _unmask_graph(self, client, rules: List[MaskingRule], job_id: str) -> None:
        groups = sorted({(self._rule_graph_kind(rule), rule.target_table) for rule in rules}, key=lambda item: (item[0].value, item[1]))
        for graph_kind, target in groups:
            group_rules = [rule for rule in rules if self._rule_graph_kind(rule) == graph_kind and rule.target_table == target]
            for rule in group_rules:
                if rule.protection_mode == ProtectionMode.MASKED_COLUMN:
                    await client.unset_graph_property(graph_kind.value, target, self._output_column(rule))
                # MASKED_VIEW y VIRTUAL_VIEW no alteran Neo4j; solo desaparece el artefacto registrado por Enmask.

            physical_rules = [
                r for r in group_rules
                if r.protection_mode in {ProtectionMode.STATIC_MASK, ProtectionMode.SYMMETRIC_ENCRYPTION}
            ]
            if not physical_rules:
                continue

            backups = await self._vault_repository.get_backups_for_job(job_id) if self._vault_repository else []
            if backups:
                await self._restore_from_vault_graph(client, job_id)
                continue

            encryption_rules = [r for r in physical_rules if r.protection_mode == ProtectionMode.SYMMETRIC_ENCRYPTION]
            static_rules = [r for r in physical_rules if r.protection_mode == ProtectionMode.STATIC_MASK]
            if static_rules:
                raise Exception(
                    "No hay respaldo en el vault para restaurar la mascara fisica en Neo4j. "
                    "La mascara fisica no es reversible por si sola; debe existir backup previo."
                )
            if encryption_rules:
                records = await client.fetch_graph_elements(graph_kind.value, target, limit=5000)
                for record in records:
                    element_id = record.get("_id")
                    updates = {}
                    for rule in encryption_rules:
                        if rule.target_column in record and record.get(rule.target_column) is not None:
                            updates[rule.target_column] = decrypt_value(record.get(rule.target_column))
                    if updates:
                        await client.update_graph_element(graph_kind.value, target, element_id, updates)

    async def _restore_from_vault(self, client, job_id: str) -> None:
        if not self._vault_repository:
            raise Exception("Vault repository not configured, cannot unmask")
        backups = await self._vault_repository.get_backups_for_job(job_id)
        if not backups:
            raise Exception("No backups found for this job, cannot unmask")
        for backup in backups:
            table = backup["table_name"]
            pk_value = backup["record_pk"]
            pk_column = backup.get("pk_column") or "id"
            updates = backup["original_data"]
            await client.update_record(table, pk_column, pk_value, updates)

    async def _restore_from_vault_mongodb(self, client, job_id: str) -> None:
        if not self._vault_repository:
            raise Exception("Vault repository not configured, cannot unmask")
        backups = await self._vault_repository.get_backups_for_job(job_id)
        if not backups:
            raise Exception("No backups found for this job, cannot unmask")
        for backup in backups:
            collection = backup["table_name"]
            pk_value = backup["record_pk"]
            updates = backup["original_data"]
            await client.update_record(collection, pk_value, updates)


    async def _restore_from_vault_graph(self, client, job_id: str) -> None:
        if not self._vault_repository:
            raise Exception("Vault repository not configured, cannot unmask Neo4j")
        backups = await self._vault_repository.get_backups_for_job(job_id)
        if not backups:
            raise Exception("No backups found for this Neo4j job, cannot unmask")
        for backup in backups:
            scope = backup["table_name"]
            if not (scope.startswith("node:") or scope.startswith("relationship:")):
                continue
            graph_kind, target = self._parse_graph_scope(scope)
            pk_value = backup["record_pk"]
            updates = backup["original_data"]
            await client.update_graph_element(graph_kind.value, target, pk_value, updates)


    async def delete_job(self, job_id: str, owner_id: str, force: bool = False) -> None:
        job = await self._job_repository.get_by_id(job_id)
        if not job or getattr(job, "owner_id", None) != owner_id:
            raise ResourceNotFoundError("Job", job_id)
        if job.status == JobStatus.RUNNING:
            raise ValueError("No se puede eliminar un job en ejecucion.")

        rules = await self._load_owned_rules(job.rule_ids, owner_id)
        has_apply_artifacts = job.run_mode == MaskingRunMode.APPLY and job.status == JobStatus.COMPLETED
        has_restorable_changes = any(
            rule.protection_mode in {
                ProtectionMode.MASKED_VIEW,
                ProtectionMode.MASKED_COLUMN,
                ProtectionMode.STATIC_MASK,
                ProtectionMode.SYMMETRIC_ENCRYPTION,
            }
            for rule in rules
        )
        if has_apply_artifacts and has_restorable_changes and not force:
            raise ValueError(
                "Primero restaura/desenmascara este job antes de eliminarlo. "
                "Asi evitas perder la trazabilidad necesaria para revertir vistas, campos derivados o datos fisicos."
            )

        await self._job_repository.delete(job_id)
        if force and self._vault_repository:
            await self._vault_repository.delete_backups_for_job(job_id)

    async def query_data(self, job_id: str, user_id: str, user_email: str, mask_override: Optional[bool] = None) -> Tuple[List[dict], bool]:
        """Consulta datos y aplica enmascaramiento virtual según permisos.

        El owner puede elegir mask=false. Un usuario compartido siempre recibe datos enmascarados,
        aunque intente enviar mask=false desde el cliente.
        """
        job = await self._job_repository.get_by_id(job_id)
        if not job:
            raise ResourceNotFoundError("Job", job_id)

        connection = await self._connection_repository.get_by_id(job.connection_id)
        if not connection:
            raise ResourceNotFoundError("Connection", job.connection_id)

        is_owner = getattr(job, "owner_id", None) == user_id
        is_shared = user_id in job.shared_with

        if not (is_owner or is_shared):
            raise ResourceNotFoundError("Job", job_id)

        should_mask = True
        if is_owner:
            should_mask = bool(mask_override) if mask_override is not None else False

        rules = []
        for rule_id in job.rule_ids:
            rule = await self._rule_repository.get_by_id(rule_id)
            if rule:
                rules.append(rule)

        client = create_database_client(connection)
        if is_sql_database(connection):
            records = await self._query_sql(client, rules, should_mask)
        elif is_document_database(connection):
            records = await self._query_mongodb(client, rules, should_mask)
        elif is_graph_database(connection):
            records = await self._query_graph(client, rules, should_mask)
        else:
            raise ValueError(f"Motor no soportado: {connection.type}")

        if self._audit_repository:
            audit_log = AuditLog(
                job_id=job_id,
                user_id=user_id,
                user_email=user_email,
                user_role="owner" if is_owner else "shared",
                action="query",
                is_masked=should_mask,
                timestamp=datetime.utcnow(),
            )
            await self._audit_repository.create(audit_log)

        return records, should_mask

    async def share_job(self, job_id: str, owner_id: str, target_email: str) -> None:
        job = await self._job_repository.get_by_id(job_id)
        if not job or getattr(job, "owner_id", None) != owner_id:
            raise ResourceNotFoundError("Job", job_id)

        if not self._user_repository:
            raise Exception("UserRepository is not configured")

        target_user = await self._user_repository.get_by_email(target_email)
        if not target_user:
            raise ResourceNotFoundError("User", target_email)

        if target_user.id not in job.shared_with:
            job.shared_with.append(target_user.id)
            await self._job_repository.update(job_id, job)

    async def get_audit_log(self, job_id: str, owner_id: str) -> List[AuditLog]:
        job = await self._job_repository.get_by_id(job_id)
        if not job:
            raise ResourceNotFoundError("Job", job_id)

        if getattr(job, "owner_id", None) != owner_id:
            raise ResourceNotFoundError("Job", job_id)

        if not self._audit_repository:
            return []

        return await self._audit_repository.get_by_job_id(job_id)

    async def _query_sql(self, client, rules: List[MaskingRule], should_mask: bool) -> List[dict]:
        tables = sorted({rule.target_table for rule in rules})
        all_records = []
        schema = await client.get_schema()
        for table in tables:
            table_rules = [rule for rule in rules if rule.target_table == table]
            self._validate_rule_targets(table, table_rules, schema)
            records = await client.select_all(table, limit=100)
            for record in records:
                record_dict = self._json_safe(record)
                if should_mask:
                    updates = self._build_secure_display_values(record_dict, table_rules)
                    record_dict.update(updates)
                all_records.append(record_dict)
        return all_records

    async def _query_mongodb(self, client, rules: List[MaskingRule], should_mask: bool) -> List[dict]:
        collections = sorted({rule.target_table for rule in rules})
        all_records = []
        schema = await client.get_schema()
        for collection in collections:
            collection_rules = [rule for rule in rules if rule.target_table == collection]
            self._validate_rule_targets(collection, collection_rules, schema)
            records = await client.fetch_all(collection)
            for record in records[:100]:
                record_dict = self._json_safe(record)
                if "_id" in record_dict:
                    record_dict["_id"] = str(record_dict["_id"])
                if should_mask:
                    updates = self._build_secure_display_values(record_dict, collection_rules)
                    record_dict.update(updates)
                all_records.append(record_dict)
        return all_records


    async def _query_graph(self, client, rules: List[MaskingRule], should_mask: bool) -> List[dict]:
        groups = sorted({(self._rule_graph_kind(rule), rule.target_table) for rule in rules}, key=lambda item: (item[0].value, item[1]))
        all_records = []
        graph_schema = await client.get_graph_schema()
        for graph_kind, target in groups:
            group_rules = [rule for rule in rules if self._rule_graph_kind(rule) == graph_kind and rule.target_table == target]
            self._validate_graph_rule_targets(graph_kind, target, group_rules, graph_schema)
            records = await client.fetch_graph_elements(graph_kind.value, target, limit=100)
            for record in records:
                record_dict = self._json_safe(record)
                record_dict["_graph_scope"] = self._graph_scope(graph_kind, target)
                if should_mask:
                    updates = self._build_secure_display_values(record_dict, group_rules)
                    record_dict.update(updates)
                all_records.append(record_dict)
        return all_records


    def _rule_graph_kind(self, rule: MaskingRule) -> GraphElementKind:
        return rule.graph_element or GraphElementKind.NODE

    def _graph_scope(self, graph_kind: GraphElementKind, target: str) -> str:
        return f"{graph_kind.value}:{target}"

    def _parse_graph_scope(self, scope: str) -> Tuple[GraphElementKind, str]:
        kind, target = scope.split(":", 1)
        if kind == GraphElementKind.NODE.value:
            return GraphElementKind.NODE, target
        if kind == GraphElementKind.RELATIONSHIP.value:
            return GraphElementKind.RELATIONSHIP, target
        raise ValueError(f"Scope Neo4j no soportado: {scope}")

    def _validate_graph_rule_targets(
        self,
        graph_kind: GraphElementKind,
        target: str,
        rules: List[MaskingRule],
        graph_schema: Dict[str, Dict[str, List[str]]],
    ) -> None:
        bucket = "nodes" if graph_kind == GraphElementKind.NODE else "relationships"
        available_props = graph_schema.get(bucket, {}).get(target)
        if available_props is None:
            label = "label" if graph_kind == GraphElementKind.NODE else "tipo de relacion"
            raise ValueError(f"El {label} Neo4j '{target}' no existe o no se pudo leer en el esquema.")
        available = set(available_props)
        available_lower = {str(c).lower() for c in available_props}
        missing = [rule.target_column for rule in rules if rule.target_column not in available and rule.target_column.lower() not in available_lower]
        if missing:
            scope = self._graph_scope(graph_kind, target)
            raise ValueError(f"Propiedades no encontradas en '{scope}': {', '.join(missing)}")

    def _validate_rule_targets(self, table: str, rules: List[MaskingRule], schema: Dict[str, List[str]]) -> None:
        table_name = table.split(".")[-1]
        columns = schema.get(table) or schema.get(table_name)

        # Para SQL Server/Oracle y otros motores con schemas, si el usuario
        # escribe solo Tabla, se acepta cuando existe una unica coincidencia
        # schema.Tabla. Si hay varias, se exige schema.tabla/owner.tabla.
        if columns is None and "." not in table:
            matches = [cols for name, cols in schema.items() if name.split(".")[-1].lower() == table_name.lower()]
            if len(matches) == 1:
                columns = matches[0]
            elif len(matches) > 1:
                raise ValueError(
                    f"La tabla '{table}' existe en varios schemas. Selecciona el nombre completo schema.tabla."
                )

        # Para Redis se permite usar patrones de clave como cliente:*; se combinan
        # los campos descubiertos en las claves que coincidan con el patrón.
        if columns is None and any(token in table for token in ["*", "?", "["]):
            matched_columns = set()
            for key, key_columns in schema.items():
                if fnmatch(key, table):
                    matched_columns.update(key_columns)
            columns = sorted(matched_columns) if matched_columns else None

        if columns is None:
            raise ValueError(f"La tabla/colección/label/patrón '{table}' no existe o no se pudo leer en el esquema.")

        available = set(columns)
        available_lower = {str(c).lower() for c in columns}
        missing = [rule.target_column for rule in rules if rule.target_column not in available and rule.target_column.lower() not in available_lower]
        if missing:
            raise ValueError(f"Columnas/campos no encontrados en '{table}': {', '.join(missing)}")

    def _build_result_values(self, record: dict, rules: List[MaskingRule]) -> dict:
        values = {}
        for rule in rules:
            if rule.target_column not in record:
                continue
            if rule.protection_mode == ProtectionMode.SYMMETRIC_ENCRYPTION:
                values[rule.target_column] = encrypt_value(record[rule.target_column])
            elif rule.protection_mode == ProtectionMode.STATIC_MASK:
                values[rule.target_column] = self._mask_value(rule, record[rule.target_column])
            else:
                values[self._output_column(rule)] = self._mask_value(rule, record[rule.target_column])
        return values

    def _build_physical_updates(self, record: dict, rules: List[MaskingRule]) -> dict:
        updates = {}
        for rule in rules:
            if rule.target_column not in record:
                continue
            if rule.protection_mode == ProtectionMode.MASKED_COLUMN:
                updates[self._output_column(rule)] = self._mask_value(rule, record[rule.target_column])
            elif rule.protection_mode == ProtectionMode.STATIC_MASK:
                updates[rule.target_column] = self._mask_value(rule, record[rule.target_column])
            elif rule.protection_mode == ProtectionMode.SYMMETRIC_ENCRYPTION:
                updates[rule.target_column] = encrypt_value(record[rule.target_column])
        return updates

    def _build_secure_display_values(self, record: dict, rules: List[MaskingRule]) -> dict:
        """Valores seguros para consulta compartida: reemplaza la columna sensible.

        Aunque el modo sea vista/columna derivada, la consulta compartida nunca debe filtrar
        la columna original sin proteger.
        """
        updates = {}
        for rule in rules:
            if rule.target_column not in record:
                continue
            if rule.protection_mode == ProtectionMode.SYMMETRIC_ENCRYPTION:
                updates[rule.target_column] = "<encrypted>"
            else:
                updates[rule.target_column] = self._mask_value(rule, record[rule.target_column])
        return updates

    def _mask_value(self, rule: MaskingRule, value: Any) -> Any:
        strategy = self._strategies[rule.strategy]
        return strategy.mask(value, **(rule.strategy_options or {}))

    def _needs_backup(self, rules: List[MaskingRule]) -> bool:
        return any(rule.protection_mode in {ProtectionMode.STATIC_MASK, ProtectionMode.SYMMETRIC_ENCRYPTION} for rule in rules)

    def _output_column(self, rule: MaskingRule) -> str:
        return rule.output_column or f"{rule.target_column}_masked"

    def _view_name(self, table: str, job_id: str, rule: MaskingRule) -> str:
        if rule.view_name:
            return rule.view_name
        base = table.split(".")[-1]
        safe_base = "".join(ch if ch.isalnum() or ch == "_" else "_" for ch in base)
        return f"vw_enmask_{safe_base}_{job_id[:8]}"

    def _build_sql_masked_view_select(self, client, database_type: DatabaseType, table: str, rules: List[MaskingRule], schema: Dict[str, List[str]]) -> str:
        table_name = table.split(".")[-1]
        columns = schema.get(table) or schema.get(table_name) or []
        if not columns and "." not in table:
            matches = [cols for name, cols in schema.items() if name.split(".")[-1].lower() == table_name.lower()]
            if len(matches) == 1:
                columns = matches[0]
        sensitive_cols = {rule.target_column for rule in rules}
        select_parts = [client.q(col) for col in columns if col not in sensitive_cols]
        for rule in rules:
            expr = self._sql_mask_expression(client, database_type, rule)
            select_parts.append(f"{expr} AS {client.q(self._output_column(rule))}")
        return f"SELECT {', '.join(select_parts)} FROM {client.q(table)}"

    def _sql_mask_expression(self, client, database_type: DatabaseType, rule: MaskingRule) -> str:
        options = rule.strategy_options or {}
        keep_left = int(options.get("keep_left", 2))
        keep_right = int(options.get("keep_right", 2))
        mask = str(options.get("mask_char", "*"))[:1] or "*"
        fixed_mask = mask * int(options.get("mask_length", 4))
        col = client.q(rule.target_column)

        if database_type in {DatabaseType.POSTGRES}:
            value = f"CAST({col} AS TEXT)"
            return f"CASE WHEN {col} IS NULL THEN NULL ELSE LEFT({value}, {keep_left}) || '{fixed_mask}' || RIGHT({value}, {keep_right}) END"
        if database_type == DatabaseType.SQLSERVER:
            value = f"CAST({col} AS NVARCHAR(MAX))"
            return f"CASE WHEN {col} IS NULL THEN NULL ELSE LEFT({value}, {keep_left}) + '{fixed_mask}' + RIGHT({value}, {keep_right}) END"
        if database_type in {DatabaseType.MYSQL, DatabaseType.MARIADB}:
            value = f"CAST({col} AS CHAR)"
            return f"CASE WHEN {col} IS NULL THEN NULL ELSE CONCAT(LEFT({value}, {keep_left}), '{fixed_mask}', RIGHT({value}, {keep_right})) END"
        if database_type == DatabaseType.ORACLE:
            value = f"TO_CHAR({col})"
            return f"CASE WHEN {col} IS NULL THEN NULL ELSE SUBSTR({value}, 1, {keep_left}) || '{fixed_mask}' || SUBSTR({value}, -{keep_right}) END"
        # SQLite y motores SQL ligeros: mascara no destructiva con substr y concatenacion.
        value = f"CAST({col} AS TEXT)"
        return f"CASE WHEN {col} IS NULL THEN NULL ELSE substr({value}, 1, {keep_left}) || '{fixed_mask}' || substr({value}, -{keep_right}) END"

    def _build_mongo_masked_view_pipeline(self, collection: str, rules: List[MaskingRule], schema: Dict[str, List[str]]) -> List[Dict[str, Any]]:
        columns = schema.get(collection) or []
        sensitive_cols = {rule.target_column for rule in rules}
        project: Dict[str, Any] = {"_id": 1}
        for column in columns:
            if column not in sensitive_cols:
                project[column] = 1
        for rule in rules:
            project[self._output_column(rule)] = self._mongo_mask_expression(rule)
        return [{"$project": project}]

    def _mongo_mask_expression(self, rule: MaskingRule) -> Dict[str, Any]:
        options = rule.strategy_options or {}
        keep_left = int(options.get("keep_left", 2))
        keep_right = int(options.get("keep_right", 2))
        fixed_mask = (str(options.get("mask_char", "*"))[:1] or "*") * int(options.get("mask_length", 4))
        value = {"$toString": f"${rule.target_column}"}
        return {
            "$cond": [
                {"$eq": [f"${rule.target_column}", None]},
                None,
                {
                    "$concat": [
                        {"$substrCP": [value, 0, keep_left]},
                        fixed_mask,
                        {"$substrCP": [value, {"$max": [{"$subtract": [{"$strLenCP": value}, keep_right]}, 0]}, keep_right]},
                    ]
                },
            ]
        }

    async def _primary_key_columns(self, client, table: str, sample_record: Optional[Dict[str, Any]] = None) -> List[str]:
        if hasattr(client, "get_primary_key_columns"):
            columns = await client.get_primary_key_columns(table)
            if columns:
                return list(columns)
        pk = await client.get_primary_key(table)
        if pk:
            return [pk]
        if sample_record:
            return [self._infer_pk(sample_record)]
        return []

    def _record_pk_value(self, record: Dict[str, Any], pk_columns: List[str]) -> Any:
        if not pk_columns:
            return None
        if len(pk_columns) == 1:
            pk = pk_columns[0]
            return record.get(pk) if pk in record else None
        if not all(pk in record for pk in pk_columns):
            return None
        return {pk: record.get(pk) for pk in pk_columns}

    def _infer_pk(self, record: Dict[str, Any]) -> str:
        if "id" in record:
            return "id"
        for key in record.keys():
            if key.lower().endswith("id") or key.lower().endswith("_id"):
                return key
        return next(iter(record.keys()))

    def _build_preview_item(self, table: str, pk: str, record: Dict[str, Any], updates: Dict[str, Any]) -> Dict[str, Any]:
        pk_columns = [part.strip() for part in str(pk).split(",") if part.strip()]
        if len(pk_columns) > 1:
            pk_value = {col: record.get(col) for col in pk_columns}
        else:
            pk_value = record.get(pk)
        return self._json_safe({
            "table": table,
            "pk_column": pk,
            "pk_value": pk_value,
            "before": {col: record.get(col) for col in updates.keys()},
            "after": updates,
        })

    def _json_safe(self, record: Dict[str, Any]) -> Dict[str, Any]:
        safe = dict(record)
        for key, value in list(safe.items()):
            if hasattr(value, "isoformat"):
                safe[key] = value.isoformat()
            elif not isinstance(value, (str, int, float, bool, list, dict, type(None))):
                safe[key] = str(value)
        return safe


job_orchestrator = JobOrchestrator(
    connection_repository=connection_repository,
    rule_repository=rule_repository,
    job_repository=job_repository,
    vault_repository=file_vault_repository,
)
