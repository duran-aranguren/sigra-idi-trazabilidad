# Plan de proyecto · SIGRA Trazabilidad I+D+i

| Campo | Detalle |
|-------------------------|---------------------------------------------------------------------------|
| Autor | Daniel Durán · Líder de Innovación |
| Curso | Diplomado IA48 · Proyecto final individual |
| Fecha de corte | 2 de noviembre de 2026 |
| Estado general | Publicado y validado con usuarios; pendientes de preparación de la presentación |

## 1. Enfoque

El proyecto siguió las ocho etapas del curso (idea, descubrimiento, definición, diseño, planeación, construcción con IA, pruebas y publicación, presentación) con un ciclo corto de construcción asistida por IA. Cada versión se probó en el navegador del PC y en el celular antes de pasar a la siguiente, y las decisiones quedaron registradas en la bitácora de IA (`docs/bitacora-ia.md`).

## 2. Hitos

| # | Hito | Entregable | Fecha | Estado |
|------|------------------------|----------------------------------------|---------------|---------------|
| H1 | Idea y alcance definidos | Caso genérico de 15 proyectos, SQLite local, IA vía n8n | 2 nov 2026 | Cumplido |
| H2 | MVP funcional (v1) | Portafolio Stage-Gate, ruta crítica, stakeholders, riesgos e IA | 2 nov 2026 | Cumplido |
| H3 | Identidad y detalle (v2) | Manual SIGRA aplicado, estilo científico, 14 pantallas de detalle | 2 nov 2026 | Cumplido |
| H4 | Instalación y celular (v3 / v3.1) | Guía de instalación, acceso por Wi-Fi con PIN, diseño adaptable | 2 nov 2026 | Cumplido |
| H5 | IA conectada en local | n8n con credencial de Anthropic y workflow publicado | 2 nov 2026 | Cumplido |
| H6 | Presentación final | 11 diapositivas con plantilla Aurora | 2 nov 2026 | Cumplido |
| H7 | Prueba piloto simulada | 3 perfiles, 2 rondas, 4 correcciones | 2 nov 2026 | Cumplido |
| H8 | Software publicado (v5) | https://sigra-idi.onrender.com con roles | 2 nov 2026 | Cumplido |
| H9 | IA en la versión pública | Túnel y token con n8n | 2 nov 2026 | Cumplido |
| H10 | Pruebas con usuarios reales | 3 usuarios, 3 roles, 3 dispositivos | 2 nov 2026 | Cumplido |
| H11 | Documentación de entrega | Informe, ficha, PRD, DESIGN.md, plan, bitácora, flujo, arquitectura, AGENTS.md | 2 nov 2026 | Cumplido |
| H12 | Video de respaldo y ensayo | Video de 90 s y ensayo cronometrado de 10 min | Antes de la presentación | Pendiente |

## 3. Cronograma ejecutado (2 de noviembre de 2026)

| Franja (aprox.) | Etapa del curso | Actividad |
|-----------------|-------------|----------------------------------------------------------------------|
| 10:45 – 11:00 | 1 · 2 · 3 | Revisión de las instrucciones y plantillas del docente; definición del caso y del alcance |
| 11:00 – 11:25 | 6 | Construcción de la v1 sin dependencias externas |
| 11:25 – 12:40 | 4 · 6 | Aplicación del manual de marca, pantallas de detalle y estilo científico (v2) |
| 12:40 – 13:20 | 6 · 7 | Guía de instalación para PC y Android (v3) |
| 13:20 – 14:00 | 7 | Prueba del autor en pantalla dividida; corrección del diseño adaptable (v3.1) |
| 14:00 – 16:00 | 6 · 7 | Instalación local, conexión de n8n, credencial de API y selección de modelo |
| 16:00 – 16:30 | 8 | Presentación final con la plantilla Aurora |
| 16:30 – 16:45 | 7 | Modo público con roles y prueba piloto simulada |
| 16:45 – 17:10 | 7 | Ajuste de colores de la presentación; publicación en GitHub y Render |
| 17:15 – 17:50 | 7 | IA en la versión pública: token, túnel e instalación de cloudflared |
| 17:50 – 18:30 | 7 | Pruebas con 3 usuarios reales del equipo de SIGRA |
| 18:30 – 19:30 | 8 | Evidencias en la presentación, informe de entrega y documentación |

## 4. Dedicación

Jornada intensiva de unas 9 horas el 2 de noviembre de 2026, con un único responsable (el autor) en los cuatro roles del curso: producto, diseño, desarrollo con IA y calidad. A esto se suma el tiempo de los 3 participantes durante la sesión de pruebas (de 5:50 p. m. a 6:30 p. m.).

## 5. Riesgos del proyecto

| Riesgo | Probabilidad | Impacto | Respuesta | Estado |
|------------------------------|------------|----------|--------------------------------|----------------|
| Registros de paquetes bloqueados en el entorno de desarrollo | Alta | Alto | Construir sin dependencias, solo con módulos integrados de Node.js | Mitigado |
| Incompatibilidad de n8n con Node.js 26 | Media | Alto | Fijar Node.js 24 LTS | Mitigado |
| La IA no responde en la versión pública | Alta | Medio | Túnel y token; análisis local de respaldo | Mitigado |
| Pérdida de datos en el plan gratuito de Render | Alta | Bajo | Usuarios por variable de entorno; datos de demostración que se regeneran | Aceptado |
| Falla de conexión durante la demo en vivo | Media | Alto | Video de respaldo de 90 s; abrir la URL 2 minutos antes | En curso |
| Interpretar mal la rúbrica | Media | Alto | Revisión de las instrucciones y del mapa de entregables | Mitigado (se corrigió la decisión de no publicar) |

## 6. Pendientes hasta la entrega

- [ ] Grabar el video de respaldo de la demo (90 s).
- [ ] Ensayar la presentación con cronómetro (máximo 10 minutos).
- [ ] Antes de presentar: abrir n8n y el túnel, y actualizar `IDI_N8N_URL` si la dirección cambió.
- [ ] Opcional: corregir los hallazgos R1 a R3 de las pruebas.
