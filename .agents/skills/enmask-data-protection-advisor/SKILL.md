---
name: enmask-data-protection-advisor
description: guide enmask data protection work, including sensitive-field analysis, masking-rule recommendations, algorithm and protection-mode selection, dry-run/apply safety review, job documentation, and presentation-ready explanations. Use when the user works with enmask, database masking, encryption, anonymization, schema inspection, pii detection, rules by field, audit evidence, restore planning, or reports for sql server, mysql, postgresql, mongodb, redis, cassandra, neo4j, oracle, or sqlite.
---

# Enmask Data Protection Advisor

Use this skill to help operate and document Enmask as a data protection platform. Treat Enmask as a multi-engine system that inspects database structures, detects sensitive data, generates masking rules, previews transformations, executes dry-runs, applies protection, and produces evidence for delivery.

## Core workflow

1. Identify the target engine and data model.
2. Classify sensitive fields using `references/masking-playbook.md`.
3. Recommend a protection mode using the safety order below.
4. Generate clear Enmask rules with engine-aware object names.
5. Always propose `dry_run` before `apply`.
6. Produce documentation using `references/report-template.md` when the user needs evidence for GitHub, a report, or a presentation.

## Safety order for protection modes

Prefer the least destructive mode that satisfies the user goal:

1. `virtual_view` for demonstration or safe preview.
2. `masked_view` for query-time protection where supported.
3. `masked_column` for preserving the original value and adding a protected property/column.
4. `static_mask` only when the original value may be overwritten.
5. `symmetric_encryption` when reversible protection is required and key management is addressed.

For classroom demos, recommend `dry_run` first and then `masked_column` before destructive modes.

## Engine-aware naming

- SQL Server: use `[schema].[table]` or `schema.table`, for example `Person.BusinessEntity`.
- PostgreSQL: use `schema.table`, usually `public.table`.
- Oracle: use `owner.table` when needed.
- MySQL/MariaDB/SQLite: use the table name unless the user explicitly references a database/catalog.
- MongoDB: use collection names and document paths.
- Redis: use key patterns as objects and fields such as `value` or hash field names.
- Cassandra: use `keyspace.table` when available.
- Neo4j: do not say table/column; use label or relationship type as the object and property as the field.

## Output conventions

When recommending rules, use this compact format:

| Motor | Objeto | Campo/Propiedad | Sensibilidad | Algoritmo | Modo | Motivo |
|---|---|---|---|---|---|---|

For execution plans, include:

- target connection
- selected objects
- rules to create
- dry-run checklist
- apply checklist
- rollback/restoration note
- evidence to capture

## References

- Use `references/masking-playbook.md` for data categories and recommended algorithms.
- Use `references/engine-models.md` for engine-specific object mapping.
- Use `references/report-template.md` to create delivery documentation.
