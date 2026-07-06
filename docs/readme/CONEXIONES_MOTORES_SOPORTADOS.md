# Conexiones soportadas por Enmask

Este documento define los motores disponibles, sus puertos por defecto y cómo se interpreta cada campo de conexión dentro del sistema.

## Puertos por defecto

| Motor | Tipo | Puerto | Campo `database` | Observación |
|---|---|---:|---|---|
| PostgreSQL | Relacional | 5432 | Base de datos | Requiere usuario con permisos de lectura y, si se aplica máscara física, permisos de escritura/DDL. |
| MySQL | Relacional | 3306 | Base de datos | Usa el protocolo MySQL. |
| MariaDB | Relacional | 3306 | Base de datos | Se conecta con el mismo cliente de MySQL. |
| SQLite | Relacional local | 0 | Ruta del archivo `.db` | No usa host ni puerto. |
| SQL Server | Relacional | 1433 | Base de datos | Requiere Microsoft ODBC Driver 18 instalado. |
| Oracle Database | Relacional | 1521 | Service name o SID | Ejemplo local común: `XEPDB1`. |
| Apache Cassandra | NoSQL wide-column | 9042 | Keyspace | CQL no maneja vistas de enmascaramiento como SQL; se usa vista virtual desde Enmask. |
| MongoDB | NoSQL documental | 27017 | Base de datos | También puede usarse `mongodb+srv://` en el host. |
| Redis | NoSQL clave-valor | 6379 | Índice lógico DB | Ejemplo: `0`. En reglas, `target_table` puede ser `cliente:*`. |
| Neo4j | NoSQL grafo | 7687 | Database | Usa Bolt. En reglas, `graph_element` define nodo/relacion, `target_table` representa label/tipo y `target_column` representa propiedad. |

## Aclaración importante

Los puertos anteriores son los valores estándar, pero la conexión solo funcionará si:

1. El motor está instalado y ejecutándose.
2. El puerto está abierto en firewall, contenedor o red.
3. Las credenciales son correctas.
4. El usuario tiene permisos sobre la base, keyspace, colección, label o patrón de claves.
5. El driver del motor está instalado cuando corresponde.

## Diferencias por motor

### Motores relacionales

PostgreSQL, MySQL, MariaDB, SQLite, SQL Server y Oracle permiten trabajar con tablas y columnas. En estos motores, Enmask puede:

- crear vistas enmascaradas cuando el motor lo soporta;
- agregar columnas derivadas como `dni_masked`;
- aplicar máscara física con respaldo;
- aplicar encriptación simétrica física.

### Cassandra

Cassandra usa CQL, pero no es una base relacional tradicional. Enmask puede leer tablas, detectar columnas y actualizar columnas, pero las vistas enmascaradas se manejan como proyección virtual desde la aplicación.

### MongoDB

MongoDB trabaja con colecciones y documentos. Enmask puede crear una view collection con pipeline de agregación para el modo `masked_view`.

### Redis

Redis trabaja con claves. Enmask interpreta:

- `target_table`: patrón de claves, por ejemplo `cliente:*`;
- `target_column`: `value` para claves string o el nombre del campo si la clave es hash.

Redis no tiene vistas nativas. El modo `masked_view` se registra como vista virtual desde Enmask.

### Neo4j

Neo4j trabaja con grafos: nodos, relaciones, labels, tipos y propiedades. Enmask lo trata como una rama especializada:

- `graph_element=node`: `target_table` es el label del nodo, por ejemplo `Cliente`; `target_column` es la propiedad sensible, por ejemplo `dni`.
- `graph_element=relationship`: `target_table` es el tipo de relacion, por ejemplo `COMPRA`; `target_column` es la propiedad sensible, por ejemplo `codigoOperacion`.

Neo4j no tiene vistas SQL tradicionales. El modo `masked_view` se maneja como vista virtual desde Enmask. Para persistir el enmascaramiento sin destruir el original, se usa `masked_column`, que crea una propiedad derivada como `dni_masked`.
