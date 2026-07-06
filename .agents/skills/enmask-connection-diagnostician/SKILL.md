---
name: enmask-connection-diagnostician
description: diagnose and fix enmask database connection problems, especially cloud or remote connection strings, driver issues, tls/ssl settings, ports, schemas, authentication, and engine-specific errors for sql server, oracle, redis, cassandra, neo4j, mongodb, postgresql, mysql, mariadb, and sqlite. Use when the user shares errors such as login failed, invalid object name, no suitable driver, timeout, tls, auth, uri, host, port, schema, keyspace, label, or connection refused.
---

# Enmask Connection Diagnostician

Use this skill to troubleshoot Enmask connections before masking rules are created. Focus on exact error interpretation, safe credential handling, engine-specific URI formats, and the difference between local, Docker, and cloud deployments.

## First response protocol

1. Identify the engine and environment: local, Docker, remote server, or cloud.
2. Ask for or inspect the exact error message, but never request secrets in plain text.
3. Redact credentials before repeating any URI. Use `scripts/redact_uri.py` when a URI must be sanitized.
4. Map the error to a likely layer: driver, network, TLS, authentication, authorization, database/schema/object naming, or query generation.
5. Give the shortest next diagnostic command or UI check.

## Important host rules

- Backend running directly on Windows/Linux/macOS and engine on the same machine: use `localhost` or `127.0.0.1`.
- Backend running in Docker and engine on host machine: use `host.docker.internal` when supported.
- Backend and engine in same compose/network: use the service name, for example `redis`, `neo4j`, or `sqlserver`.
- Cloud engine: use the provider host or full URI, not `localhost`.

## Engine-specific handling

Use `references/connection-matrix.md` for default ports, URI schemes, and common fixes.
Use `references/cloud-uri-examples.md` when the user needs cloud-style connection examples.
Use `references/error-playbook.md` to interpret common errors.

## Output format

For diagnosis, respond with:

1. **Problema probable**: one clear sentence.
2. **Por qué pasa**: brief explanation.
3. **Prueba rápida**: one command or check.
4. **Corrección**: exact settings or code/config change.
5. **Después de corregir**: what error or success message to expect.

## Security rules

- Never echo full credentials, tokens, passwords, wallet paths with secrets, or API keys.
- Replace credentials with `***`.
- Recommend `.env` and `.env.example` separation for GitHub.
- Tell the user to rotate any credential posted publicly.
