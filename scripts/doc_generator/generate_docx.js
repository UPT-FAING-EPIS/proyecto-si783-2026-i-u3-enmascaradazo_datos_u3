const { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  Table, 
  TableRow, 
  TableCell, 
  HeadingLevel, 
  WidthType, 
  AlignmentType, 
  BorderStyle 
} = require("docx");
const fs = require("fs");
const path = require("path");

// Definición de colores del tema
const COLOR_PRIMARY = "1F385C"; // Azul Oscuro Institucional
const COLOR_SECONDARY = "5B9BD5"; // Azul Claro Acento
const COLOR_TEXT = "333333"; // Gris oscuro para texto común
const COLOR_MUTED = "7F7F7F"; // Gris para subtítulos menores
const COLOR_BG_HEADER = "1F385C"; // Fondo cabecera tabla
const COLOR_BG_ROW_ALT = "F2F5F8"; // Fila alterna de tabla
const COLOR_BORDER = "D3D3D3"; // Bordes de tabla gris claro

// Estilo de bordes de las tablas
const tableBorders = {
  top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
  bottom: { style: BorderStyle.SINGLE, size: 8, color: COLOR_PRIMARY },
  left: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
  right: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
  insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" }
};

// Helper para crear celdas
function createCell(text, options = {}) {
  const { 
    bold = false, 
    isHeader = false, 
    align = AlignmentType.LEFT, 
    shading = null,
    italic = false
  } = options;

  let fill = shading;
  if (isHeader) {
    fill = COLOR_BG_HEADER;
  }

  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: text,
            bold: bold,
            italic: italic,
            size: isHeader ? 20 : 18, // 10pt o 9pt
            font: "Arial",
            color: isHeader ? "FFFFFF" : COLOR_TEXT
          })
        ],
        alignment: align,
        spacing: { before: 80, after: 80 }
      })
    ],
    shading: fill ? { fill } : undefined,
    margins: {
      top: 100,
      bottom: 100,
      left: 120,
      right: 120
    }
  });
}

// Helper para crear fila de cabecera de tabla
function createHeaderRow(headers) {
  return new TableRow({
    children: headers.map(h => createCell(h, { bold: true, isHeader: true, align: AlignmentType.CENTER }))
  });
}

// Datos de la base de datos de Enmask

// 1. User
const userFields = [
  ["id", "VARCHAR(36)", "String", "No", "PK", "UUID v4", "Identificador único de usuario.", "f81d4fae-7dec-11d0-a765-00a0c91e6bf6"],
  ["email", "VARCHAR(255)", "String", "No", "-", "-", "Correo electrónico único de login.", "admin@enmask.com"],
  ["name", "VARCHAR(255)", "String", "No", "-", "-", "Nombre completo del usuario.", "Juan Pérez Gómez"],
  ["picture", "TEXT", "String", "Sí", "-", "NULL", "URL de la foto de perfil (Google OAuth).", "https://lh3.googleusercontent.com/..."],
  ["role", "VARCHAR(50)", "String", "No", "-", "'user'", "Rol de acceso (admin o user).", "admin"],
  ["password_hash", "VARCHAR(255)", "String", "Sí", "-", "NULL", "Contraseña cifrada con Bcrypt.", "$2b$12$KjW6z9lF..."]
];

// 2. Connection
const connectionFields = [
  ["id", "VARCHAR(36)", "String", "No", "PK", "UUID v4", "Identificador único de conexión.", "520bd7bf-8f55-46aa-bd1a-074900c3b0df"],
  ["name", "VARCHAR(255)", "String", "No", "-", "-", "Nombre descriptivo de la conexión.", "Servidor Supabase Prod"],
  ["type", "VARCHAR(50)", "String", "No", "-", "-", "Tipo de motor (postgresql, mysql, etc.).", "postgresql"],
  ["host", "VARCHAR(255)", "String", "No", "-", "-", "Host o dirección IP del servidor.", "db.supabase.co"],
  ["port", "INTEGER", "Int32", "No", "-", "-", "Puerto TCP de escucha del servidor.", "5432"],
  ["database", "VARCHAR(255)", "String", "No", "-", "-", "Nombre de la BD, Keyspace o SID.", "postgres"],
  ["username", "VARCHAR(255)", "String", "No", "-", "-", "Nombre de usuario de acceso externo.", "postgres"],
  ["password", "TEXT", "String", "No", "-", "-", "Contraseña de conexión (cifrada AES-256).", "gAAAAABmB..."],
  ["additional_options", "TEXT", "Object", "Sí", "-", "NULL", "Opciones adicionales de conexión (JSON).", '{"ssl": "require"}'],
  ["owner_id", "VARCHAR(36)", "String", "Sí", "FK", "NULL", "Propietario de la conexión (user.id).", "f81d4fae-7dec-11d0-a765-00a0c91e6bf6"]
];

// 3. MaskingRule
const ruleFields = [
  ["id", "VARCHAR(36)", "String", "No", "PK", "UUID v4", "Identificador único de la regla.", "ab983bc1-cd62-42bb-92bc-f7b594b2ab72"],
  ["name", "VARCHAR(255)", "String", "No", "-", "-", "Nombre identificativo de la regla.", "Ofuscar Nombres Clientes"],
  ["connection_id", "VARCHAR(36)", "String", "No", "FK", "-", "ID de la conexión asociada.", "520bd7bf-8f55-46aa-bd1a-074900c3b0df"],
  ["target_table", "VARCHAR(255)", "String", "No", "-", "-", "Tabla o colección objetivo.", "public.enmask_test_customers"],
  ["target_column", "VARCHAR(255)", "String", "No", "-", "-", "Columna o campo a enmascarar.", "full_name"],
  ["strategy", "VARCHAR(50)", "String", "No", "-", "-", "Algoritmo (substitution, hashing, etc.).", "substitution"],
  ["strategy_options", "TEXT", "Object", "Sí", "-", "NULL", "Parámetros JSON de la estrategia.", '{"provider": "name"}'],
  ["protection_mode", "VARCHAR(50)", "String", "No", "-", "'masked_view'", "Modo (masked_view, static_mask, etc.).", "static_mask"],
  ["output_column", "VARCHAR(255)", "String", "Sí", "-", "NULL", "Nueva columna (modo masked_column).", "full_name_masked"],
  ["view_name", "VARCHAR(255)", "String", "Sí", "-", "NULL", "Nombre de vista (modo masked_view).", "v_enmask_customers"],
  ["key_alias", "VARCHAR(255)", "String", "Sí", "-", "NULL", "Alias de clave de encriptación.", "key_test_db"],
  ["graph_element", "VARCHAR(50)", "String", "Sí", "-", "NULL", "Elemento de grafo (Neo4j: node, relationship).", "NULL"],
  ["owner_id", "VARCHAR(36)", "String", "Sí", "FK", "NULL", "Usuario creador de la regla (user.id).", "f81d4fae-7dec-11d0-a765-00a0c91e6bf6"]
];

// 4. MaskingJob
const jobFields = [
  ["id", "VARCHAR(36)", "String", "No", "PK", "UUID v4", "Identificador único de la tarea.", "3c85a2fa-13f5-4d0d-9ae4-b8a7be7c7a52"],
  ["connection_id", "VARCHAR(36)", "String", "No", "FK", "-", "ID de la conexión sobre la que se ejecutó.", "520bd7bf-8f55-46aa-bd1a-074900c3b0df"],
  ["rule_ids", "TEXT", "Array[Str]", "No", "-", "-", "Lista de reglas aplicadas (JSON array).", '["ab983bc1-cd62-42bb-92bc-f7b594b2ab72"]'],
  ["run_mode", "VARCHAR(50)", "String", "No", "-", "'dry_run'", "Modo de ejecución (dry_run, apply).", "apply"],
  ["status", "VARCHAR(50)", "String", "No", "-", "'pending'", "Estado (pending, running, completed, failed).", "completed"],
  ["started_at", "TIMESTAMP", "Date", "Sí", "-", "NULL", "Fecha y hora de inicio.", "2026-07-07 10:15:30.000"],
  ["completed_at", "TIMESTAMP", "Date", "Sí", "-", "NULL", "Fecha y hora de fin.", "2026-07-07 10:15:34.210"],
  ["error_message", "TEXT", "String", "Sí", "-", "NULL", "Excepción si el estado es failed.", "NULL"],
  ["records_processed", "INTEGER", "Int32", "No", "-", "0", "Cantidad de registros reales alterados.", "4"],
  ["records_previewed", "INTEGER", "Int32", "No", "-", "0", "Cantidad de registros previsualizados.", "4"],
  ["affected_tables", "TEXT", "Array[Str]", "No", "-", "[]", "Lista de tablas afectadas (JSON).", '["public.enmask_test_customers"]'],
  ["preview_sample", "TEXT", "Array[Obj]", "No", "-", "[]", "Muestra JSON para visualización UI.", '[{"original": "Ana", "masked": "Fabiola"}]'],
  ["generated_artifacts", "TEXT", "Array[Obj]", "No", "-", "[]", "Vistas/columnas creadas (JSON).", '[{"type": "backup", "count": 4}]'],
  ["owner_id", "VARCHAR(36)", "String", "Sí", "FK", "NULL", "Usuario que ejecutó el job (user.id).", "f81d4fae-7dec-11d0-a765-00a0c91e6bf6"],
  ["shared_with", "TEXT", "Array[Str]", "No", "-", "[]", "Lista de usuarios con acceso compartido.", "[]"]
];

// 5. AuditLog
const auditFields = [
  ["id", "VARCHAR(36)", "String", "No", "PK", "UUID v4", "Identificador único de auditoría.", "e42c2db4-c92c-47bc-ad3b-1b0797abdf45"],
  ["job_id", "VARCHAR(36)", "String", "No", "FK", "-", "ID de la tarea relacionada (job.id).", "3c85a2fa-13f5-4d0d-9ae4-b8a7be7c7a52"],
  ["user_id", "VARCHAR(36)", "String", "No", "FK", "-", "ID de usuario ejecutor (user.id).", "f81d4fae-7dec-11d0-a765-00a0c91e6bf6"],
  ["user_email", "VARCHAR(255)", "String", "No", "-", "-", "Correo de auditoría rápida.", "admin@enmask.com"],
  ["user_role", "VARCHAR(50)", "String", "No", "-", "-", "Rol del usuario al momento del suceso.", "admin"],
  ["action", "VARCHAR(100)", "String", "No", "-", "'query'", "Operación realizada (query, apply_mask, etc.).", "apply_mask"],
  ["is_masked", "BOOLEAN", "Boolean", "No", "-", "-", "Indica si los datos visualizados estaban enmascarados.", "true"],
  ["timestamp", "TIMESTAMP", "Date", "No", "-", "now()", "Sello de tiempo exacto.", "2026-07-07 10:15:30.000"]
];

// 6. VaultBackup
const vaultFields = [
  ["job_id", "VARCHAR(36)", "String", "No", "FK", "-", "ID del job que originó el respaldo.", "3c85a2fa-13f5-4d0d-9ae4-b8a7be7c7a52"],
  ["table_name", "VARCHAR(255)", "String", "No", "-", "-", "Nombre de la tabla original.", "public.enmask_test_customers"],
  ["pk_column", "VARCHAR(255)", "String", "Sí", "-", "NULL", "Nombre de la columna clave primaria.", "id"],
  ["record_pk", "VARCHAR(255)", "String", "No", "-", "-", "Valor clave primaria como texto.", "c53648a1-12c8-40e9-8e42-7bc9a0cd89ef"],
  ["original_data", "TEXT", "Object", "No", "-", "-", "Datos originales antes del enmascaramiento (JSON).", '{"email": "ana.garcia@empresa.com"}']
];

// 7. Test Customer Table (External DB)
const testCustomerFields = [
  ["id", "UUID", "No", "PK", "gen_random_uuid()", "Identificador único autogenerado.", "c53648a1-12c8-40e9-8e42-7bc9a0cd89ef"],
  ["email", "TEXT", "No", "-", "-", "Correo electrónico sensible del cliente.", "ana.garcia@empresa.com"],
  ["full_name", "TEXT", "Sí", "-", "NULL", "Nombre completo sensible del cliente.", "Ana García"],
  ["phone", "TEXT", "Sí", "-", "NULL", "Número telefónico sensible del cliente.", "+52 55 1234 5678"],
  ["created_at", "TIMESTAMPTZ", "Sí", "-", "now()", "Fecha de creación del registro.", "2026-07-07 10:00:00-05"]
];

// Helper para convertir los arrays de campos en filas de tabla DOCX
function buildTableFromFields(fields, isExternal = false) {
  const headers = isExternal
    ? ["Campo", "Tipo SQL", "Nulo", "Clave", "Por Defecto", "Descripción", "Ejemplo"]
    : ["Campo", "Tipo SQL", "Tipo NoSQL", "Nulo", "Clave", "Por Defecto", "Descripción", "Ejemplo"];

  const rows = [createHeaderRow(headers)];

  fields.forEach((rowFields, index) => {
    const shading = index % 2 === 1 ? COLOR_BG_ROW_ALT : null;
    const cells = rowFields.map((f, i) => {
      const isFieldCol = (i === 0);
      return createCell(f, { bold: isFieldCol, shading, italic: !isFieldCol && f === "NULL" });
    });
    rows.push(new TableRow({ children: cells }));
  });

  return new Table({
    rows: rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders
  });
}

// ----------------------------------------------------
// CONSTRUCCIÓN DEL DOCUMENTO
// ----------------------------------------------------
const doc = new Document({
  sections: [
    // SECCIÓN 1: PORTADA
    {
      properties: {},
      children: [
        new Paragraph({ spacing: { before: 800 } }),
        new Paragraph({
          children: [
            new TextRun({
              text: "UNIVERSIDAD PRIVADA DE TACNA",
              bold: true,
              size: 28,
              font: "Arial",
              color: COLOR_PRIMARY
            })
          ],
          alignment: AlignmentType.CENTER
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "FACULTAD DE INGENIERÍA",
              bold: true,
              size: 20,
              font: "Arial",
              color: COLOR_SECONDARY
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "Escuela Profesional de Ingeniería de Sistemas",
              size: 18,
              font: "Arial",
              color: COLOR_TEXT
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 80, after: 1500 }
        }),
        
        // Título del Trabajo
        new Paragraph({
          children: [
            new TextRun({
              text: "DICCIONARIO DE DATOS DETALLADO",
              bold: true,
              size: 40,
              font: "Arial",
              color: COLOR_PRIMARY
            })
          ],
          alignment: AlignmentType.CENTER
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "Proyecto Enmask v2.0 - Plataforma Unificada de Protección de Datos",
              italic: true,
              size: 22,
              font: "Arial",
              color: COLOR_SECONDARY
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 150, after: 2000 }
        }),

        // Metadatos inferiores
        new Paragraph({
          children: [
            new TextRun({
              text: "Curso: ",
              bold: true,
              size: 20,
              font: "Arial",
              color: COLOR_TEXT
            }),
            new TextRun({
              text: "Base de Datos II",
              size: 20,
              font: "Arial",
              color: COLOR_TEXT
            })
          ],
          alignment: AlignmentType.LEFT,
          spacing: { before: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "Desarrollador: ",
              bold: true,
              size: 20,
              font: "Arial",
              color: COLOR_TEXT
            }),
            new TextRun({
              text: "Antigravity AI (Pair Programming con USER)",
              size: 20,
              font: "Arial",
              color: COLOR_TEXT
            })
          ],
          alignment: AlignmentType.LEFT,
          spacing: { before: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "Ciclo: ",
              bold: true,
              size: 20,
              font: "Arial",
              color: COLOR_TEXT
            }),
            new TextRun({
              text: "2026-I / Unidad III",
              size: 20,
              font: "Arial",
              color: COLOR_TEXT
            })
          ],
          alignment: AlignmentType.LEFT,
          spacing: { before: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "Fecha: ",
              bold: true,
              size: 20,
              font: "Arial",
              color: COLOR_TEXT
            }),
            new TextRun({
              text: "Julio de 2026",
              size: 20,
              font: "Arial",
              color: COLOR_TEXT
            })
          ],
          alignment: AlignmentType.LEFT,
          spacing: { before: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "Tacna, Perú",
              bold: true,
              size: 18,
              font: "Arial",
              color: COLOR_MUTED
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 800 }
        })
      ]
    },

    // SECCIÓN 2: CONTENIDO PRINCIPAL
    {
      properties: {},
      children: [
        // 1. Introducción
        new Paragraph({
          text: "1. INTRODUCCIÓN",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "Este documento presenta el Diccionario de Datos exhaustivo para el proyecto ",
              font: "Arial"
            }),
            new TextRun({
              text: "Enmask v2.0",
              bold: true,
              font: "Arial"
            }),
            new TextRun({
              text: ", una herramienta empresarial de automatización de enmascaramiento de datos diseñada para proporcionar entornos de desarrollo, pruebas y QA seguros de forma ágil y automatizada.",
              font: "Arial"
            })
          ],
          spacing: { after: 150 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "La persistencia interna de Enmask (su metadatabase) está diseñada bajo un modelo polimórfico adaptable. El backend en FastAPI puede utilizar de forma nativa e indistinta una base de datos relacional (PostgreSQL) o no relacional (MongoDB), según la variable de entorno ",
              font: "Arial"
            }),
            new TextRun({
              text: "REPOSITORY_BACKEND",
              bold: true,
              font: "Arial"
            }),
            new TextRun({
              text: ". Por esta razón, el diccionario detalla la equivalencia física de los campos para ambos motores (esquemas SQL y BSON/NoSQL) dentro del mismo estándar lógico unificado.",
              font: "Arial"
            })
          ],
          spacing: { after: 300 }
        }),

        // 2. Modelo ER
        new Paragraph({
          text: "2. DIAGRAMA DE ENTIDAD-RELACIÓN LÓGICO",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 300, after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "El modelo lógico de Enmask consta de cinco entidades principales de configuración y bitácora, las cuales se relacionan para habilitar el ciclo de vida del enmascaramiento:",
              font: "Arial"
            })
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "• User (enmask_users / users): ", bold: true, font: "Arial", color: COLOR_PRIMARY }),
            new TextRun({ text: "Almacena las credenciales locales o tokens OAuth de Google correspondientes a los operadores del sistema.", font: "Arial" })
          ],
          spacing: { left: 360, after: 50 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "• Connection (enmask_connections / connections): ", bold: true, font: "Arial", color: COLOR_PRIMARY }),
            new TextRun({ text: "Registra los parámetros de red y credenciales de acceso (cifradas en reposo con AES-256) de las bases de datos clientes.", font: "Arial" })
          ],
          spacing: { left: 360, after: 50 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "• MaskingRule (enmask_rules / masking_rules): ", bold: true, font: "Arial", color: COLOR_PRIMARY }),
            new TextRun({ text: "Define qué columna en qué tabla se protegerá, bajo qué algoritmo (substitution, hashing, redaction, etc.) y bajo qué modo de protección.", font: "Arial" })
          ],
          spacing: { left: 360, after: 50 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "• MaskingJob (enmask_jobs / jobs): ", bold: true, font: "Arial", color: COLOR_PRIMARY }),
            new TextRun({ text: "Historial de ejecuciones de enmascaramiento (Dry-run o Apply) que almacena telemetría de rendimiento y muestras del enmascarado.", font: "Arial" })
          ],
          spacing: { left: 360, after: 50 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "• AuditLog (enmask_audit_logs / audit_logs): ", bold: true, font: "Arial", color: COLOR_PRIMARY }),
            new TextRun({ text: "Registro inmutable de actividades que documenta qué usuario operó qué base de datos y si se expuso información sensible o no.", font: "Arial" })
          ],
          spacing: { left: 360, after: 50 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "• VaultBackup (vault_backups): ", bold: true, font: "Arial", color: COLOR_PRIMARY }),
            new TextRun({ text: "Tabla intermedia / colección temporal que almacena los valores originales en texto plano antes de un enmascaramiento estático destructivo, permitiendo restauraciones posteriores.", font: "Arial" })
          ],
          spacing: { left: 360, after: 200 }
        }),

        // 3. Diccionario
        new Paragraph({
          text: "3. DICCIONARIO DE DATOS DETALLADO (METADATOS INTERNOS)",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 250 }
        }),

        // 3.1 User
        new Paragraph({
          text: "3.1. Entidad / Tabla: User (enmask_users / users)",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 }
        }),
        new Paragraph({
          text: "Propósito: Almacena las credenciales y perfiles de los operadores autorizados del sistema.",
          spacing: { after: 100 }
        }),
        buildTableFromFields(userFields),
        new Paragraph({ text: "", spacing: { after: 300 } }),

        // 3.2 Connection
        new Paragraph({
          text: "3.2. Entidad / Tabla: Connection (enmask_connections / connections)",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 }
        }),
        new Paragraph({
          text: "Propósito: Almacena los parámetros de red y contraseñas cifradas de las bases de datos clientes.",
          spacing: { after: 100 }
        }),
        buildTableFromFields(connectionFields),
        new Paragraph({ text: "", spacing: { after: 300 } }),

        // 3.3 MaskingRule
        new Paragraph({
          text: "3.3. Entidad / Tabla: MaskingRule (enmask_rules / masking_rules)",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 }
        }),
        new Paragraph({
          text: "Propósito: Define las políticas y estrategias de protección asignadas por columna.",
          spacing: { after: 100 }
        }),
        buildTableFromFields(ruleFields),
        new Paragraph({ text: "", spacing: { after: 300 } }),

        // 3.4 MaskingJob
        new Paragraph({
          text: "3.4. Entidad / Tabla: MaskingJob (enmask_jobs / jobs)",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 }
        }),
        new Paragraph({
          text: "Propósito: Registra el log histórico de ejecuciones, estadísticas de filas y telemetría de rendimiento.",
          spacing: { after: 100 }
        }),
        buildTableFromFields(jobFields),
        new Paragraph({ text: "", spacing: { after: 300 } }),

        // 3.5 AuditLog
        new Paragraph({
          text: "3.5. Entidad / Tabla: AuditLog (enmask_audit_logs / audit_logs)",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 }
        }),
        new Paragraph({
          text: "Propósito: Historial inalterable de auditoría para verificar cumplimiento y accesos a datos protegidos.",
          spacing: { after: 100 }
        }),
        buildTableFromFields(auditFields),
        new Paragraph({ text: "", spacing: { after: 300 } }),

        // 3.6 VaultBackup
        new Paragraph({
          text: "3.6. Entidad / Tabla: VaultBackup (vault_backups)",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 }
        }),
        new Paragraph({
          text: "Propósito: Almacena los respaldos en texto plano de forma segura para permitir restaurar un enmascaramiento estático.",
          spacing: { after: 100 }
        }),
        buildTableFromFields(vaultFields),
        new Paragraph({ text: "", spacing: { after: 400 } }),

        // 4. Esquema de Prueba
        new Paragraph({
          text: "4. DICCIONARIO DE DATOS (ESQUEMA DE PRUEBA EXTERNO)",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        }),
        new Paragraph({
          text: "Propósito: Tabla de demostración creada en PostgreSQL / Supabase que contiene datos ficticios sensibles para pruebas de enmascaramiento.",
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "Nombre físico: public.enmask_test_customers",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 100, after: 100 }
        }),
        buildTableFromFields(testCustomerFields, true),
        new Paragraph({ spacing: { before: 300 } })
      ]
    }
  ]
});

// Guardar el documento generado
const outDir = path.resolve(__dirname, "../../docs");
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}
const outPath = path.join(outDir, "FD04-Diccionario-Datos.docx");

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(outPath, buffer);
  console.log(`Documento Word autogenerado con éxito en: ${outPath}`);
}).catch((err) => {
  console.error("Error al generar el documento Word:", err);
  process.exit(1);
});
