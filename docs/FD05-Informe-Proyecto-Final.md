# FD05 - Informe Final del Proyecto

## 1. Antecedentes
En los últimos años, las leyes de privacidad de datos (como GDPR) han forzado a las empresas a replantear cómo manejan la información en todos sus entornos. Tradicionalmente, los entornos de prueba (QA) utilizaban copias exactas de la base de datos de producción, lo que exponía información sensible de los clientes. El proyecto "Motor de Enmascarado Multiformato (Enmascaradazo)" surge de la necesidad imperante de desensibilizar esta información de forma automatizada y sin afectar los procesos de desarrollo.

## 2. Planteamiento del Problema
### a. Problema
Existe un riesgo crítico de fuga de información y multas por tener PII (Información Personal Identificable) en entornos no productivos. Los métodos actuales de ofuscación son manuales, basados en scripts SQL aislados y específicos de cada motor, que resultan ineficientes y propensos a errores.

### b. Justificación
Automatizar este proceso no solo mitiga los riesgos legales de la organización, sino que reduce significativamente el tiempo operativo empleado por los ingenieros de bases de datos, permitiéndoles enfocar sus esfuerzos en tareas de mayor valor.

### c. Alcance
El proyecto abarca la creación de un sistema unificado con una interfaz web para gestionar tareas de ofuscación hacia y desde múltiples sistemas de bases de datos relacionales y no relacionales, aplicando reglas de sustitución en memoria.

---

## 3. Objetivos
- **General:** Implementar una solución de enmascaramiento de datos unificada, escalable y agnóstica a la base de datos.
- **Específicos:**
  - Desarrollar una interfaz de configuración web.
  - Implementar conectores nativos para al menos SQL Server, PostgreSQL, y MongoDB.
  - Construir un catálogo de transformaciones (correos falsos, cifrado parcial de DNI, etc.).

---

## 4. Marco Teórico
- **Enmascaramiento de Datos (Data Masking):** Proceso de ocultación de datos específicos dentro de un banco de datos.
- **Ofuscación en Tránsito vs en Reposo:** Nuestro motor ofusca en tránsito (durante el movimiento entre bases), evitando usar espacio extra para copias temporales.
- **Ingeniería Inversa de Datos:** El proceso asegura que, sin la semilla o configuración inicial, sea matemáticamente imposible revertir los datos ficticios a su estado original.

---

## 5. Desarrollo de la Solución
### a. Análisis de Factibilidad
- **Técnica:** Herramientas y frameworks disponibles (Node.js/Python, React).
- **Económica:** Alto ROI debido a prevención de multas.
- **Operativa:** Fácil integración en los procesos de CI/CD.
- **Legal:** Cumple integralmente la protección de PII.
- **Ambiental:** Uso optimizado de servidores mediante contenedores.

### b. Tecnología de Desarrollo
- **Frontend:** React.js, TailwindCSS (para la interfaz administrativa).
- **Backend Core:** Node.js o Python (Procesamiento de lotes de datos).
- **Infraestructura:** Docker y Docker-Compose.

### c. Metodología de Implementación
Se siguió la metodología RUP adaptada para entornos ágiles, generando los siguientes artefactos clave:
- **Documento de VISIÓN (FD02):** Definición del alcance inicial.
- **Documento SRS:** Especificación de los Requerimientos del Sistema.
- **Documento SAD (FD04):** Arquitectura base del sistema.

---

## 6. Cronograma
1. **Mes 1:** Análisis y diseño arquitectónico (Documentación).
2. **Mes 2:** Implementación del Core del motor de enmascarado.
3. **Mes 3:** Desarrollo de Drivers/Conexiones.
4. **Mes 4:** Desarrollo de Panel Frontend e Integración Continua.
5. **Mes 5:** Pruebas UAT y Despliegue en entornos controlados.

---

## 7. Presupuesto
- **Costos de Desarrollo:** $15,000.
- **Infraestructura Cloud (Primer Año):** $3,600.
- **Licencias y Certificados:** $500.
- **Total Inversión Inicial Aproximada:** $19,100 USD.

---

## 8. Conclusiones
El Motor de Enmascarado se concluyó probando exitosamente la transferencia y ofuscación entre entornos PostgreSQL y MongoDB, logrando una reducción del 95% del riesgo asociado al manejo de PII en entornos no productivos.

---

## 9. Recomendaciones
- Implementar módulos de Inteligencia Artificial para el auto-descubrimiento de columnas con información sensible en el futuro.
- Ampliar el catálogo de reglas para adecuarse a regulaciones específicas del sector salud (HIPAA).

---

## 10. Bibliografía
- *Sommerville, I. (2015). Ingeniería del Software. Pearson.*
- Documentación técnica de Docker, Express y React.

---

## 11. Anexos
- **Anexo 01:** Informe de Factibilidad (FD01)
- **Anexo 02:** Documento de Visión (FD02)
- **Anexo 03:** Documento SRS (Especificación de Requerimientos)
- **Anexo 04:** Documento SAD (Informe de Arquitectura, FD04)
- **Anexo 05:** Manuales de Usuario y Técnico del Sistema.
