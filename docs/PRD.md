# PRD · SIGRA Trazabilidad I+D+i

| Campo | Detalle |
|-------------------------|---------------------------------------------------------------------------|
| Versión | 1.0 (final, coincide con el software publicado v5) |
| Autor | Daniel Durán · Líder de Innovación |
| Fecha | 2 de noviembre de 2026 |
| Estado | Publicado en https://sigra-idi.onrender.com · validado con 3 usuarios reales |

## 1. Resumen

SIGRA Trazabilidad I+D+i es una aplicación web para gestionar el portafolio de proyectos de un área de Investigación, Desarrollo e Innovación. Reúne proyectos, actividades, riesgos, partes interesadas y decisiones de gate en un solo lugar, calcula la ruta crítica y la salud de cada proyecto, y usa IA (mediante n8n) para proponer actualizaciones a partir de los documentos del día a día. Ningún cambio de la IA se aplica sin aprobación humana.

Funciona en dos modos: **local** (en el PC, con n8n local y opción de acceso desde el celular por Wi-Fi) y **público** (en Internet, con usuario, contraseña y roles).

## 2. Problema

El estado real de los proyectos de innovación está repartido en cinco o más fuentes: correos, hojas de cálculo, presentaciones, actas y chats. Esto produce tres fallas recurrentes:

| Falla | Consecuencia |
|------------------------------|----------------------------------------------------------------------|
| Atrasos detectados tarde | Una actividad crítica se retrasa y no se ve que mueve la fecha final |
| Gates sin rastro | La decisión de avanzar de etapa no queda registrada ni justificada |
| Riesgos dispersos | Riesgos, restricciones externas y partes interesadas viven en archivos distintos |

Fuente: observación propia en el área de I+D+i.

## 3. Usuarios

| Perfil | Rol en la app | Necesidad principal | Dispositivo habitual |
|------------------------|------------------|------------------------------------|----------------------|
| Líder de I+D+i o de proyecto | Editor o administrador | Detectar desviaciones y actualizar el plan sin retrabajo | PC |
| Gerente o patrocinador | Lector | Consultar portafolio, alertas y gates pendientes | Celular |
| Analista técnico (calidad, laboratorio, regulatorio) | Editor | Registrar avances desde reportes y correos | PC o portátil |
| Administrador de la herramienta | Administrador | Gestionar usuarios y la conexión con la IA | PC |

**Persona principal:** líder de innovación de una empresa de ingredientes alimentarios, con 10 a 20 proyectos simultáneos en distintas etapas, que trabaja con clientes aliados, maquiladores y trámites regulatorios, y debe rendir cuentas a un comité de innovación.

## 4. Objetivos y métricas

| # | Objetivo | Métrica | Meta | Resultado de la validación |
|-----|------------------------|--------------------------|------------|---------------------------------|
| O1 | Que el flujo principal sea usable por personas distintas al autor | Tareas completadas por usuarios reales | ≥ 90 % | 100 % de las tareas previstas (3 usuarios) |
| O2 | Que cada rol haga solo lo que le corresponde | Acciones no permitidas bloqueadas | 100 % | 100 % |
| O3 | Acceso desde los dispositivos de uso diario | Plataformas donde funciona la versión publicada | PC, Android, iOS | 3 de 3 |
| O4 | Actualización asistida por IA con trazabilidad | Cambios de IA aplicados con aprobación y registro en bitácora | 100 % | Cumplido |
| O5 | Facilidad de uso | Puntaje SUS | ≥ 68 | Por medir en la siguiente ronda |
| O6 | Ahorro de tiempo del líder | Tiempo semanal para consolidar el estado del portafolio | −50 % | Por medir en un piloto en un área real |

Los resultados de O1 a O4 se detallan en el *Informe de publicación y pruebas de usuario*.

## 5. Alcance del MVP

**Dentro del alcance**

- Portafolio con metodología Stage-Gate de 7 etapas: Idea, Maduración, Prototipo, Caso de negocio, Plan piloto, Piloto y Evaluación ex-post.
- Tablero con 7 indicadores y figuras numeradas, y 14 pantallas de detalle con explicación y método de cálculo.
- Proyectos con actividades, dependencias, ruta crítica, stakeholders, riesgos, gates, documentos y bitácora.
- Clasificación de documentos con IA vía n8n y análisis local de respaldo.
- Asistente de preguntas sobre el portafolio.
- Modo público con roles y modo local con acceso por PIN desde la red Wi-Fi.
- Caso de demostración ficticio con 15 proyectos.

**Fuera del alcance**

- Integración automática con correo, ERP o calendarios.
- Notificaciones push o por correo (existe un workflow semanal opcional en n8n, desactivado por defecto).
- Varias empresas en una misma instalación.
- Edición colaborativa en tiempo real.
- IA en la nube sin depender del PC del autor.
- Persistencia de datos en el plan gratuito del hosting.

## 6. Historias de usuario y criterios de aceptación

| ID | Historia | Criterios de aceptación |
|----------|----------------------------------------|--------------------------------------------------|
| HU-01 | Como líder, quiero ver el estado del portafolio en un tablero para detectar desviaciones a tiempo | Muestra proyectos activos, inversión, rVPN, salud, críticas atrasadas, riesgos altos y gates en 30 días; cada indicador abre su página de detalle |
| HU-02 | Como líder, quiero crear un proyecto con un plan inicial para no empezar de cero | Nombre, líder y fecha de inicio obligatorios; código automático; plantilla de actividades por etapa opcional |
| HU-03 | Como líder, quiero registrar actividades con dependencias para conocer la ruta crítica | Se calcula la holgura; holgura 0 = crítica; cronograma con la ruta crítica resaltada |
| HU-04 | Como comité, quiero registrar la decisión de cada gate para dejar trazabilidad | Decisiones Go, Go con condiciones, Reciclar, Pausar y Detener; queda en el historial de gates y en la bitácora |
| HU-05 | Como líder, quiero mapear las partes interesadas para planear la comunicación | Poder e interés de 1 a 5, postura y estrategia; mapa por cuadrantes |
| HU-06 | Como líder, quiero registrar riesgos y restricciones externas para priorizarlos | Probabilidad × impacto (1–25); 15 o más genera alerta; estado y mitigación |
| HU-07 | Como analista, quiero subir un correo o reporte y recibir una propuesta de actualización | Acepta .eml, .docx, .pptx, .xlsx, .pdf, imágenes y texto; propone proyecto, cambios y riesgos; nada cambia sin aprobación; queda en la bitácora con origen «IA»; si n8n no responde, usa el respaldo local y lo indica |
| HU-08 | Como gerente, quiero preguntar en lenguaje natural por el portafolio | Responde con los datos actuales vía n8n; preguntas sugeridas; solo editores y administradores |
| HU-09 | Como administrador, quiero controlar quién puede hacer qué | Roles lector, editor y administrador; el servidor bloquea lo no permitido; gestión de usuarios en Configuración |
| HU-10 | Como gerente, quiero usar la app desde el celular | Interfaz adaptable (PC, pantalla dividida, celular); instalable como app en Android |
| HU-11 | Como comité, quiero evaluar los resultados ex-post | Indicadores real frente a meta, decisión final y lecciones aprendidas |

## 7. Requisitos no funcionales

| Tema | Requisito |
|----------------------|------------------------------------------------------------------------------|
| Instalación | Sin dependencias externas: Node.js 22.13 o superior (recomendado 24) y SQLite integrado |
| Seguridad | Contraseñas con scrypt, sesiones firmadas (HMAC, 7 días), bloqueo tras 5 intentos, cabeceras CSP y anti-iframe, cabecera propia para toda modificación, claves solo en variables de entorno |
| IA responsable | El contenido de los documentos se trata como dato y nunca como instrucción; la respuesta se valida y se recorta; la clave de API vive en n8n |
| Privacidad | Datos de demostración ficticios; no se usan datos personales reales |
| Accesibilidad | Paleta de gráficas validada para daltonismo; contraste AA en textos |
| Compatibilidad | Chrome, Edge y Safari recientes; Android e iOS |

## 8. Flujo principal

Iniciar sesión → revisar el tablero → abrir un proyecto en riesgo → subir el correo de un cliente → revisar y aprobar la propuesta de la IA → verificar el cambio en la bitácora. Las pantallas se documentan en *Flujo principal y prototipo* (`docs/flujo-principal.md`).

## 9. Riesgos del producto

| Riesgo | Mitigación |
|----------------------------------------|------------------------------------------------------------|
| La IA propone cambios incorrectos | Aprobación humana obligatoria, propuesta editable y bitácora con origen |
| n8n no disponible | Análisis local de respaldo con aviso en pantalla |
| Pérdida de datos en el plan gratuito | Respaldo JSON; plan pago con disco para uso real |
| Exposición del webhook de IA | Token compartido `x-idi-token` |

## 10. Historial de versiones

| Versión | Cambios principales |
|--------------|--------------------------------------------------------------------------------------|
| v1 | Portafolio Stage-Gate, ruta crítica, stakeholders, riesgos e IA vía n8n |
| v2 | Identidad SIGRA, estilo científico, 14 pantallas de detalle y página por proyecto |
| v3 / v3.1 | Guía de instalación, acceso desde el celular y diseño adaptable a pantalla dividida |
| v5 | Modo público con roles, publicación en Render, correcciones de la prueba simulada, IA pública con token |
