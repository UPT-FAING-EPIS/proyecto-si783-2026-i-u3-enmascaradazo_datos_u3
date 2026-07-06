# Plan senior aplicado: Neo4j como motor de grafos

## 1. Decisión técnica

Neo4j no se debe tratar como una tabla SQL ni como una colección documental. Enmask lo separa como motor de grafos y usa la siguiente equivalencia:

| Concepto general en Enmask | Neo4j |
|---|---|
| `graph_element = node` | Nodo |
| `target_table` | Label del nodo, por ejemplo `Cliente` |
| `target_column` | Propiedad del nodo, por ejemplo `dni` |
| `graph_element = relationship` | Relación |
| `target_table` | Tipo de relación, por ejemplo `COMPRA` |
| `target_column` | Propiedad de la relación, por ejemplo `codigoOperacion` |

Esta separación evita llamar “tabla” a un label y permite enmascarar tanto propiedades de nodos como propiedades de relaciones.

## 2. Respuesta a la observación del docente

En Neo4j no existe una vista SQL tradicional con `CREATE VIEW`. Por eso el modo `masked_view` se implementa como una vista virtual de grafo generada por Enmask. La base no se modifica y el sistema devuelve las propiedades sensibles enmascaradas al consultar.

Para crear algo persistente dentro de Neo4j sin destruir la data original, el modo correcto es `masked_column`, que crea una propiedad adicional:

```cypher
MATCH (n:Cliente)
SET n.dni_masked = "74****16"
```

El dato original `n.dni` permanece intacto.

## 3. Modos soportados en Neo4j

| Modo | Efecto en Neo4j | Unmask |
|---|---|---|
| `virtual_view` | No modifica Neo4j. Enmask enmascara la respuesta. | No requiere acción física. |
| `masked_view` | Crea un artefacto virtual registrado por Enmask; no hay `CREATE VIEW` nativo. | Elimina el artefacto virtual del job. |
| `masked_column` | Crea una propiedad derivada como `dni_masked` en nodos o relaciones. | Ejecuta `REMOVE n.dni_masked` o `REMOVE r.dni_masked`. |
| `static_mask` | Reemplaza físicamente la propiedad original y guarda respaldo en vault. | Restaura desde vault usando `elementId`. |
| `symmetric_encryption` | Encripta físicamente la propiedad original. | Restaura desde vault o desencripta con `ENMASK_MASTER_KEY`. |

## 4. Backend aplicado

Se agregaron/ajustaron estos componentes:

- `GraphElementKind`: enum `node` / `relationship`.
- `MaskingRule.graph_element`: identifica si la regla aplica a nodo o relación.
- `Neo4jClient.get_graph_schema()`: separa labels de nodos y tipos de relaciones.
- `Neo4jClient.fetch_graph_elements()`: consulta nodos o relaciones con sus propiedades.
- `Neo4jClient.update_graph_element()`: actualiza propiedades sin mezclarlo con SQL/documentos.
- `Neo4jClient.unset_graph_property()`: elimina propiedades derivadas.
- `JobOrchestrator._process_graph()`: flujo exclusivo para grafos.
- `JobOrchestrator._query_graph()`: consulta con máscara virtual según permisos.
- `JobOrchestrator._unmask_graph()`: revierte propiedades derivadas, máscaras físicas o cifrado.

## 5. Frontend aplicado

Cuando la conexión seleccionada es Neo4j, la pantalla de reglas cambia el lenguaje:

- Tabla/Colección pasa a ser Label del nodo o Tipo de relación.
- Columna/Campo pasa a ser Propiedad sensible.
- Se muestra un selector `Nodo · Label` / `Relación · Tipo`.
- El modo `masked_view` se muestra como vista virtual de grafo, no como vista SQL.

## 6. Ejemplo de uso académico

Dataset de prueba:

```cypher
CREATE (:Cliente {nombre: 'Milton Flores', dni: '74382916', correo: 'milton@gmail.com'});
CREATE (:Cliente {nombre: 'Ana Torres', dni: '73221144', correo: 'ana@gmail.com'});
```

Regla recomendada:

```text
Motor: Neo4j
Tipo de elemento: node
Label: Cliente
Propiedad sensible: dni
Modo: masked_column
Propiedad generada: dni_masked
Estrategia: redaction
Patrón: conservar 2 al inicio, 2 al final
```

Resultado esperado:

```cypher
MATCH (n:Cliente)
RETURN n.dni, n.dni_masked;
```

```text
74382916 | 74****16
73221144 | 73****44
```

## 7. Conclusión

Sí se puede aplicar enmascaramiento sobre Neo4j, pero no como vista SQL nativa. La forma óptima es tratarlo como grafo: propiedades de nodos y relaciones. Para nivel 1 no destructivo se usa vista virtual o propiedad derivada; para nivel 2 se usa encriptación simétrica de la propiedad original.
