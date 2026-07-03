from __future__ import annotations

from typing import Any, Dict, List, Literal

GraphKind = Literal["node", "relationship"]
_ALLOWED_SCHEMES = {"bolt", "neo4j", "bolt+s", "neo4j+s", "bolt+ssc", "neo4j+ssc"}


def _cypher_name(value: str, label: str) -> str:
    raw = str(value or "").strip()
    if not raw:
        raise ValueError(f"{label} Neo4j vacio.")
    if any(ch in raw for ch in ["\x00", "\r", "\n"]):
        raise ValueError(f"{label} Neo4j contiene caracteres no permitidos: {value}")
    # Cypher permite nombres entre backticks. Duplicamos backticks para evitar
    # cerrar el identificador y mantener soporte para labels/propiedades reales
    # con espacios, guiones o caracteres no ASCII.
    return "`" + raw.replace("`", "``") + "`"


class Neo4jClient:
    """Cliente Neo4j por protocolo Bolt.

    Soporta Neo4j local, servidores remotos y Neo4j Aura:
    - bolt://localhost:7687
    - neo4j://host:7687
    - neo4j+s://xxxx.databases.neo4j.io:7687/neo4j

    En Neo4j, target_table se interpreta como label de nodo o tipo de relacion,
    y target_column como propiedad.
    """

    def __init__(
        self,
        host: str,
        port: int,
        database: str,
        username: str,
        password: str,
        scheme: str | None = None,
        options: Dict[str, Any] | None = None,
    ):
        from neo4j import AsyncGraphDatabase

        options = options or {}
        uri_query = options.get("uri_query") or {}
        raw_host = (host or "").strip()
        if raw_host.startswith(tuple(f"{s}://" for s in _ALLOWED_SCHEMES)):
            uri = raw_host
        else:
            uri_scheme = scheme if scheme in _ALLOWED_SCHEMES else (options.get("source_uri_scheme") if options.get("source_uri_scheme") in _ALLOWED_SCHEMES else "bolt")
            uri = f"{uri_scheme}://{raw_host}:{port or 7687}"

        timeout = float(options.get("timeout") or uri_query.get("timeout") or uri_query.get("connection_timeout") or 15)
        max_lifetime = float(options.get("max_connection_lifetime") or uri_query.get("max_connection_lifetime") or 3600)
        self.driver = AsyncGraphDatabase.driver(
            uri,
            auth=(username or None, password or None),
            connection_timeout=timeout,
            max_connection_lifetime=max_lifetime,
        )
        self.database = database or uri_query.get("database") or "neo4j"

    def _kind(self, value: str) -> GraphKind:
        if value not in {"node", "relationship"}:
            raise ValueError(f"Tipo de elemento Neo4j no soportado: {value}")
        return value  # type: ignore[return-value]

    async def close(self) -> None:
        await self.driver.close()

    async def test_connection(self) -> None:
        async with self.driver.session(database=self.database) as session:
            result = await session.run("RETURN 1 AS ok")
            await result.consume()

    async def get_graph_schema(self) -> Dict[str, Dict[str, List[str]]]:
        """Devuelve labels de nodos y tipos de relaciones con sus propiedades."""
        node_query = """
        MATCH (n)
        UNWIND labels(n) AS label
        UNWIND keys(n) AS prop
        RETURN label, collect(DISTINCT prop) AS props
        ORDER BY label
        """
        rel_query = """
        MATCH ()-[r]->()
        UNWIND keys(r) AS prop
        RETURN type(r) AS rel_type, collect(DISTINCT prop) AS props
        ORDER BY rel_type
        """
        schema: Dict[str, Dict[str, List[str]]] = {"nodes": {}, "relationships": {}}
        async with self.driver.session(database=self.database) as session:
            result = await session.run(node_query)
            async for record in result:
                schema["nodes"][record["label"]] = list(record["props"])

            result = await session.run(rel_query)
            async for record in result:
                schema["relationships"][record["rel_type"]] = list(record["props"])
        return schema

    async def get_schema(self) -> Dict[str, List[str]]:
        """Compatibilidad con discovery general: prefija node:/relationship:."""
        graph_schema = await self.get_graph_schema()
        schema: Dict[str, List[str]] = {}
        for label, props in graph_schema["nodes"].items():
            schema[f"node:{label}"] = props
        for rel_type, props in graph_schema["relationships"].items():
            schema[f"relationship:{rel_type}"] = props
        return schema

    async def fetch_graph_elements(self, element_kind: str, target: str, limit: int = 500) -> List[Dict[str, Any]]:
        kind = self._kind(element_kind)
        safe_target = _cypher_name(target, "Label/tipo")
        safe_limit = max(1, min(int(limit or 500), 5000))
        if kind == "node":
            cypher = f"MATCH (n:{safe_target}) RETURN elementId(n) AS _id, labels(n) AS _labels, properties(n) AS props LIMIT {safe_limit}"
        else:
            cypher = f"MATCH ()-[r:{safe_target}]->() RETURN elementId(r) AS _id, type(r) AS _type, properties(r) AS props LIMIT {safe_limit}"

        records: List[Dict[str, Any]] = []
        async with self.driver.session(database=self.database) as session:
            result = await session.run(cypher)
            async for row in result:
                item = dict(row["props"])
                item["_id"] = row["_id"]
                item["_graph_element"] = kind
                if kind == "node":
                    item["_labels"] = list(row["_labels"])
                else:
                    item["_type"] = row["_type"]
                records.append(item)
        return records

    async def update_graph_element(self, element_kind: str, target: str, element_id: Any, updates: Dict[str, Any]) -> None:
        kind = self._kind(element_kind)
        safe_target = _cypher_name(target, "Label/tipo")
        clean_updates = {str(k): v for k, v in updates.items() if not str(k).startswith("_")}
        if not clean_updates:
            return
        if kind == "node":
            cypher = f"MATCH (n:{safe_target}) WHERE elementId(n) = $id SET n += $updates"
        else:
            cypher = f"MATCH ()-[r:{safe_target}]->() WHERE elementId(r) = $id SET r += $updates"
        async with self.driver.session(database=self.database) as session:
            result = await session.run(cypher, id=str(element_id), updates=clean_updates)
            await result.consume()

    async def unset_graph_property(self, element_kind: str, target: str, property_name: str) -> None:
        kind = self._kind(element_kind)
        safe_target = _cypher_name(target, "Label/tipo")
        safe_property = _cypher_name(property_name, "Propiedad")
        if kind == "node":
            cypher = f"MATCH (n:{safe_target}) REMOVE n.{safe_property}"
        else:
            cypher = f"MATCH ()-[r:{safe_target}]->() REMOVE r.{safe_property}"
        async with self.driver.session(database=self.database) as session:
            result = await session.run(cypher)
            await result.consume()

    # Adaptadores de compatibilidad. Para Neo4j, collection_name se interpreta como label de nodo.
    async def fetch_all(self, label: str, query: Dict[str, Any] | None = None) -> List[Dict[str, Any]]:
        return await self.fetch_graph_elements("node", label, limit=500)

    async def update_record(self, collection_name: str, record_id: Any, updates: Dict[str, Any]):
        await self.update_graph_element("node", collection_name, record_id, updates)

    async def create_view(self, view_name: str, source_collection: str, pipeline: List[Dict[str, Any]]) -> None:
        return None

    async def drop_view(self, view_name: str) -> None:
        return None

    async def unset_field(self, collection_name: str, field_name: str) -> None:
        await self.unset_graph_property("node", collection_name, field_name)
