# Bitácora de uso de IA · SIGRA Trazabilidad I+D+i

| Campo | Detalle |
|------------------------------|----------------------------------------------------------------------|
| Autor | Daniel Durán · Líder de Innovación |
| Herramienta de construcción | Claude (Anthropic), en el entorno de trabajo de Claude con ejecución de código; modelos Claude Sonnet 5.5 y Claude Opus 5.5 |
| IA dentro del producto | Claude (modelo `claude-sonnet-5-5`) llamado desde n8n mediante la API de Anthropic |
| Periodo | 2 de noviembre de 2026 |

## Cómo se trabajó con la IA

1. **Contexto primero:** en cada sesión se entregaron a la IA las instrucciones del docente, el manual de marca de SIGRA y las capturas de lo que se veía en pantalla.
2. **Una petición concreta por vez:** construir, corregir un error o documentar.
3. **Revisión humana:** cada versión se probó en el navegador del PC y en el celular antes de aceptarla; los errores se devolvieron a la IA con evidencia (capturas o texto del error).
4. **Decisiones del autor:** el alcance, el caso de demostración, el formato de los entregables, los roles y la validación con usuarios los decidió el autor.
5. **Control de versiones:** los cambios publicados quedaron en commits de Git con mensajes descriptivos.

## Registro de sesiones

| # | Hora (aprox.) | Objetivo | Prompt principal (resumen) | Resultado | Qué revisó o corrigió el autor |
|----|-------|-----------|----------------------------|-----------------------|---------------------------|
| 1 | 10:45 | Entender el encargo | «En la siguiente captura encuentras un mensaje del docente y un link con ejemplos de proyectos. La idea es empezar el propio según instrucciones» | Revisión de las plantillas del curso; se eligió SQLite local para los datos | Eligió ver primero las plantillas y guardar los datos en SQLite |
| 2 | 11:00 | Construir el MVP | «Vamos a crear un caso genérico… 15 proyectos… actividades, fechas, responsables… actividades críticas, stakeholders y limitaciones externas… etapas idea a evaluación ex-post… cargar archivos y que la IA clasifique y actualice» | App v1: Stage-Gate, ruta crítica, stakeholders, riesgos, carga de documentos e IA vía n8n | La IA no pudo instalar paquetes (registro bloqueado) y rehízo la app solo con módulos integrados de Node.js; el autor validó el alcance funcional |
| 3 | 11:30 | Identidad y detalle | «Crea pantallas individuales para ampliar la información de cada ítem… aplica el manual de identidad de SIGRA… estilo científico» | v2: logo, Poppins, paleta oliva/dorado, figuras numeradas, 14 pantallas de detalle, página por proyecto | Se corrigieron indicadores que se partían, etiquetas recortadas en barras y radar, superposición de «Hoy» en el Gantt y formato de fechas |
| 4 | 12:45 | Instalación | «Dame las instrucciones paso a paso para instalar y usar la app en mi PC y luego en mi celular Android» | Guía de instalación en Word; modo red con PIN | El autor instaló la app en su PC siguiendo la guía |
| 5 | 13:30 | Evaluar hosting | «¿Podría desplegarla en Netlify?» | La IA recomendó mantenerla local | **Decisión corregida después:** la rúbrica exige URL pública (sesión 10) |
| 6 | 13:40 | Corregir pantalla dividida | El autor reportó que, con la pantalla dividida, el menú lateral ocultaba todo el contenido | v3.1: diseño adaptable en tres tamaños (barra lateral, riel compacto, menú superior) | Error encontrado por el autor al probar; verificó la corrección en su PC |
| 7 | 14:00 | Conectar la IA | «No encuentro credential for header auth» · «¿En qué parte puedo modificar el modelo?» | Guía para crear la credencial Header Auth, publicar el workflow y cambiar el modelo | El autor configuró n8n y confirmó el funcionamiento en el PC y en el celular |
| 8 | 16:00 | Presentación final | Instrucciones del docente (PDF) y elección «Presentación final» con plantilla Aurora | Presentación de 10 diapositivas con capturas reales y notas | El autor eligió la plantilla y pidió datos honestos (sin cifras inventadas) |
| 9 | 16:30 | Validación previa | Preparar el servidor con usuarios y contraseña y simular 3 pruebas de usuario | Modo público con roles; prueba simulada de 2 rondas; 4 correcciones | El autor pidió cambiar el fondo rosado de la presentación por la paleta de la marca y corregir la diferencia entre HTML y PDF |
| 10 | 16:55 | Publicar | «Puedes realizar la publicación. Deberías tener habilitados los conectores a GitHub y Render» | Repositorio en GitHub y servicio en Render: https://sigra-idi.onrender.com | El autor creó el repositorio y dio permiso a la app de GitHub cuando la IA no pudo hacerlo |
| 11 | 17:20 | IA en la versión pública | «No puedo usar n8n al probar en la URL publicada. Arréglalo» | Token `x-idi-token`, mensajes claros y túnel de Cloudflare | El autor resolvió en su PC los errores de `winget` y de PATH con la guía de la IA y confirmó «✓ Conectado» |
| 12 | 18:25 | Evidencias | Capturas de las pruebas con 3 usuarios del equipo de SIGRA | Diapositivas de resultados y evidencias; informe con registros por cuenta | El autor validó que el comportamiento por rol era el esperado y pidió no modificar más la app |
| 13 | 19:05 | Documentación | «Arma los documentos obligatorios faltantes y dame un checklist» | Ficha, PRD, DESIGN.md, plan, bitácora, flujo principal, arquitectura y AGENTS.md | El autor revisa la coherencia antes de entregar |

## Errores de la IA detectados y corregidos

| Error | Cómo se detectó | Corrección |
|------------------------------|------------------------------|----------------------------------------|
| Recomendó no publicar la app («mantenerla local») | Al revisar la rúbrica, que exige una URL pública | Se publicó en Render con usuarios y roles |
| El modo red rechazaba la IP local del propio PC («Host no permitido») | Prueba en el celular | Se permitió la IP de red del equipo |
| La pantalla dividida ocultaba el contenido | Prueba del autor | Diseño adaptable en tres tamaños |
| Al importar el workflow, n8n perdía el tipo de autenticación | Configuración del autor en n8n | Instrucción para seleccionar Header Auth manualmente |
| El lector veía botones que no podía usar | Prueba simulada (ronda 1) | Se ocultaron los botones para ese rol |
| La versión pública buscaba n8n en localhost | Prueba del autor en la URL publicada | Túnel, token y mensajes claros |

## Uso responsable

- No se compartieron claves de API ni contraseñas en el código. Las claves viven en n8n y en las variables de entorno de Render.
- Los datos de demostración son ficticios. En las pruebas no se registraron datos personales de los participantes.
- Dentro del producto, la IA solo **propone**: toda modificación requiere aprobación humana y queda en la bitácora con origen «IA».
- El contenido de los documentos se trata como dato y nunca como instrucción para el modelo.
