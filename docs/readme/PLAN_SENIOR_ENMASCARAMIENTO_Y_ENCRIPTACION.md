# Plan senior aplicado: enmascaramiento no destructivo y encriptación reversible

## 1. Diagnóstico de la observación del docente

La observación del docente separa correctamente dos conceptos que antes estaban mezclados:

1. **Nivel 1: Enmascaramiento no destructivo.** La data original permanece intacta. La protección se hace mediante una vista, una columna/campo derivado o una consulta controlada que muestra un patrón enmascarado.
2. **Nivel 2: Encriptación simétrica.** La data original se cambia físicamente por un valor cifrado. Para recuperar la información se necesita la misma llave simétrica.

Por ello el proyecto fue reordenado para que el job no signifique siempre “actualizar la columna original”. Ahora cada regla indica cómo se protege el dato.

## 2. Nuevo modelo funcional

### Modos de protección por regla

| Modo | Nivel | Efecto en la base | Cómo se desenmascara |
|---|---:|---|---|
| `virtual_view` | 1 | No cambia la base. Solo aplica máscara al consultar desde la app. | No requiere acción física. |
| `masked_view` | 1 | Crea una vista enmascarada cuando el motor lo permite; en Cassandra, Redis y Neo4j se maneja como vista virtual de Enmask. | Elimina la vista o artefacto virtual generado. |
| `masked_column` | 1 | Agrega una columna/campo derivado como `dni_masked`. | Elimina la columna/campo derivado. |
| `static_mask` | 1 físico | Reemplaza el valor original con la máscara y guarda backup en vault. | Restaura desde vault. |
| `symmetric_encryption` | 2 | Cifra la columna original con llave simétrica. | Restaura desde vault o descifra con la misma llave. |

### Modos de ejecución del job

| Modo de job | Propósito |
|---|---|
| `dry_run` | Previsualiza el resultado sin tocar la base. |
| `apply` | Ejecuta el modo definido en cada regla. |

## 3. Flujo implementado

1. El usuario crea una conexión.
2. El usuario crea una regla indicando tabla, columna, estrategia y modo de protección.
3. El usuario crea un job con una o más reglas.
4. Primero ejecuta `dry_run` para revisar la muestra.
5. Luego ejecuta `apply`.
6. Si necesita volver atrás, usa `Unmask`.

## 4. Motores conectados

| Motor | Tipo | Puerto por defecto | Estado |
|---|---|---:|---|
| PostgreSQL | Relacional | 5432 | Funcional |
| MySQL | Relacional | 3306 | Funcional |
| MariaDB | Relacional | 3306 | Funcional usando cliente MySQL |
| SQLite | Relacional local | 0 | Funcional para pruebas |
| SQL Server | Relacional | 1433 | Integrado mediante SQLAlchemy + aioodbc; requiere driver ODBC instalado |
| Oracle Database | Relacional | 1521 | Integrado mediante python-oracledb |
| Apache Cassandra | NoSQL wide-column | 9042 | Integrado mediante cassandra-driver |
| MongoDB | NoSQL documental | 27017 | Funcional |
| Redis | NoSQL clave-valor | 6379 | Integrado mediante redis-py async |
| Neo4j | NoSQL grafo | 7687 | Integrado mediante driver Neo4j/Bolt |

## 5. Cambios técnicos aplicados

### Backend

- Se agregó `ProtectionMode` para separar vista, columna derivada, máscara física y encriptación.
- `MaskingRule` ahora guarda `protection_mode`, `output_column`, `view_name` y `key_alias`.
- `MaskingJob` ahora registra `generated_artifacts` para saber qué creó el job.
- Se agregó encriptación simétrica con `cryptography.Fernet`.
- Se agregó `ENMASK_MASTER_KEY` en `.env.example`.
- Se agregó cliente SQL Server con `mssql+aioodbc`.
- Se agregaron clientes para Oracle, Cassandra, Redis y Neo4j.
- Se agregó endpoint para probar conexiones antes y después de guardarlas.
- Se implementó creación/eliminación de vistas y columnas derivadas para SQL.
- Se implementó creación/eliminación de vistas y campos derivados para MongoDB.
- `Unmask` ahora actúa según el modo de protección:
  - borra vistas,
  - borra columnas/campos derivados,
  - restaura desde vault,
  - o desencripta con llave simétrica.

### Frontend

- La pantalla de reglas ahora permite elegir el modo de protección.
- Se agregó soporte visual para SQL Server, Oracle, Cassandra, Redis y Neo4j.
- Neo4j ahora tiene flujo especializado de grafos para nodos y relaciones mediante `graph_element`.
- La pantalla de conexiones ahora carga los motores soportados desde el backend y completa puertos por defecto.
- Jobs muestra artefactos generados.
- El texto del flujo fue ajustado para explicar que `apply` no siempre reemplaza datos originales.

## 6. Observación senior adicional

La mejor decisión para una exposición académica es usar como flujo principal `masked_view` o `masked_column`, porque demuestra enmascaramiento real sin destruir la información. `static_mask` y `symmetric_encryption` deben presentarse como niveles más sensibles que requieren respaldo, permisos y llave segura.

Para una demo ante el docente, el orden recomendado es:

1. Crear tabla con datos reales.
2. Crear regla `masked_view` para DNI o correo.
3. Ejecutar `dry_run`.
4. Ejecutar `apply`.
5. Mostrar que la tabla original sigue igual.
6. Mostrar la vista generada con datos protegidos.
7. Ejecutar `Unmask` y mostrar que la vista desaparece.
8. Como plus, crear una regla `symmetric_encryption` para explicar el nivel 2.

## 7. Limitaciones controladas

- SQL Server requiere instalar el driver ODBC de Microsoft y las dependencias `aioodbc/pyodbc`.
- Oracle, Cassandra, Redis y Neo4j requieren que sus respectivos servicios y drivers estén disponibles en el entorno.
- La vista enmascarada usa una expresión portable de redacción parcial; estrategias complejas como Faker o perturbación se aplican mejor como columna derivada o consulta virtual.
- Para producción, `ENMASK_MASTER_KEY` debe guardarse fuera del repositorio y rotarse con control de administrador.
