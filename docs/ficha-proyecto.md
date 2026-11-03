# Ficha del proyecto

**SIGRA · Trazabilidad I+D+i**

*Trazabilidad que decide a tiempo.*

| Campo | Detalle |
|-------------------------|---------------------------------------------------------------------------|
| Autor | Daniel Durán · Líder de Innovación |
| Curso | Diplomado IA48 · Inteligencia Artificial Generativa: de producto a solución · Universidad de América |
| Fecha | 2 de noviembre de 2026 |
| URL pública | https://sigra-idi.onrender.com |
| Repositorio | https://github.com/duran-aranguren/sigra-idi-trazabilidad |

## En una frase

Una aplicación web que reúne en un solo lugar los proyectos, actividades, riesgos y decisiones de gate de un área de I+D+i, y que usa IA para proponer actualizaciones a partir de correos y reportes, siempre con aprobación humana.

## Problema

En un área de innovación, el estado real de cada proyecto está repartido en cinco o más fuentes: correos, hojas de cálculo, presentaciones, actas y chats. Como consecuencia:

- una actividad crítica se retrasa y nadie ve a tiempo que mueve la fecha final;
- las decisiones de pasar de etapa (gates) no quedan registradas ni justificadas;
- los riesgos, las restricciones externas y las partes interesadas viven en archivos distintos.

Fuente: observación propia en el área de I+D+i.

## Usuarios

| Usuario | Qué necesita |
|-----------------------------------|-----------------------------------------------------------------|
| Líder de I+D+i o de proyecto | Ver qué proyecto se desvía y por qué, y actualizar el plan sin retrabajo |
| Gerente o patrocinador | Consultar el portafolio y las decisiones pendientes desde el celular, sin modificar datos |
| Analista técnico (calidad, laboratorio, regulatorio) | Registrar avances a partir de reportes y correos sin copiar información a mano |

## Solución

Un tablero de portafolio con metodología **Stage-Gate** (7 etapas), ruta crítica calculada a partir de fechas y dependencias, mapa de partes interesadas, matriz de riesgos y una IA conectada mediante **n8n** que lee documentos y propone cambios para revisión.

## Funciones del MVP

1. Tablero con indicadores y figuras: mapa riesgo–valor, embudo Stage-Gate, salud del portafolio, horizontes 70-20-10 y alertas.
2. Proyectos con plan de actividades por etapa, dependencias y **ruta crítica**.
3. Registro de **decisiones de gate** (Go, Go con condiciones, Reciclar, Pausar, Detener).
4. **Stakeholders** (poder × interés, postura) y **riesgos y restricciones** (probabilidad × impacto).
5. **Documentos e IA**: carga de correos, reportes, presentaciones y capturas; la IA propone cambios y la persona los aprueba; todo queda en la bitácora.
6. **Asistente** para preguntas sobre el portafolio.
7. Acceso por **roles** (administrador, editor, lector) y uso desde el celular (app instalable).

## Cómo se mide el éxito

| Métrica | Meta | Resultado |
|---------------------------------------------|----------------------|---------------------------------|
| Tareas del flujo principal completadas por usuarios reales | ≥ 90 % | 100 % de las tareas previstas (3 usuarios) |
| Acciones no permitidas bloqueadas según el rol | 100 % | 100 % |
| Dispositivos donde funciona la versión publicada | PC, Android e iOS | 3 de 3 |
| Cambios propuestos por la IA aplicados con trazabilidad | 100 % con registro en bitácora | Cumplido |
| Facilidad de uso (cuestionario SUS) | ≥ 68 | Por medir en la siguiente ronda |
| Tiempo semanal para consolidar el estado del portafolio | −50 % frente a la línea base | Por medir en un piloto en un área real |

## Fuera del alcance del MVP

Integración automática con correo o ERP, notificaciones, varias empresas en una misma instalación, edición colaborativa en tiempo real e IA en la nube sin depender del PC del autor.
