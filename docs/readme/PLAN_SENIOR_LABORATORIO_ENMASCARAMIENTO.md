# Plan senior aplicado: Laboratorio de enmascaramiento

## Objetivo

Agregar un apartado visual que permita seleccionar una conexión activa, leer su esquema, elegir una tabla/colección/label, ver una muestra real y comparar el resultado original contra una vista enmascarada antes de crear reglas o ejecutar jobs.

## Criterio de diseño

El laboratorio no debe modificar datos. Es una capa de análisis y previsualización segura. La modificación real queda reservada para el flujo formal:

1. Conexión.
2. Laboratorio de vista previa.
3. Creación de reglas.
4. Job en modo `dry_run` o `apply`.
5. Unmask/restore cuando corresponda.

## Backend aplicado

Se agregó un router nuevo:

```text
GET  /api/v1/workbench/connections/{connection_id}/schema
GET  /api/v1/workbench/connections/{connection_id}/records?target=...&limit=20
POST /api/v1/workbench/preview
```

También se agregó el servicio:

```text
backend/app/application/services/workbench_service.py
```

Responsabilidades:

- Validar que la conexión pertenezca al usuario autenticado.
- Leer esquema del motor seleccionado.
- Normalizar objetos según motor:
  - SQL: tablas y columnas.
  - MongoDB: colecciones y campos.
  - Redis: claves/patrones y campos hash/value.
  - Neo4j: nodo/relación, label/tipo y propiedad.
- Leer una muestra limitada de registros.
- Aplicar una máscara virtual sobre columnas seleccionadas.
- Devolver original y enmascarado para comparación visual.

## Frontend aplicado

Se agregó una página nueva:

```text
frontend/src/pages/Workbench.tsx
```

Y se integró al menú lateral como:

```text
Laboratorio
```

Funciones de la pantalla:

- Seleccionar conexión activa.
- Seleccionar tabla, colección, patrón Redis, label Neo4j o tipo de relación Neo4j.
- Ver columnas/propiedades detectadas.
- Elegir columnas sensibles.
- Configurar algoritmo de enmascaramiento.
- Previsualizar original contra resultado protegido.
- Guardar reglas desde la configuración probada.

## Buenas prácticas consideradas

- La vista previa no modifica la base de datos.
- El backend valida ownership de conexión.
- El límite de lectura está acotado para evitar cargas pesadas.
- La pantalla usa los mismos algoritmos reales del backend.
- Neo4j se trata con semántica de grafos y no como tabla SQL.
- La creación de reglas queda conectada al flujo existente de Jobs.

## Decisión arquitectónica

No se colocó esta función dentro de `Jobs`, porque los Jobs representan ejecución. Tampoco se colocó dentro de `Connections`, porque una conexión solo administra credenciales. El lugar correcto es un módulo intermedio llamado **Laboratorio**, que funciona como banco de pruebas antes de convertir una configuración en regla formal.
