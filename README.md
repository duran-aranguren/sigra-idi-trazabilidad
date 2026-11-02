# SIGRA · Trazabilidad de proyectos I+D+i

> **Demo pública:** https://sigra-idi.onrender.com (acceso con usuario y contraseña; pide un usuario de prueba al autor).
> Plan gratis de Render: si nadie la usa en 15 minutos se duerme y la primera carga tarda cerca de un minuto; al reiniciar, los datos vuelven al caso de demostración.
>
> Proyecto final del Diplomado IA48 (Universidad de América) · Autor: Daniel Durán-Aranguren.

App local para gestionar un portafolio de innovación con la lógica **Stage-Gate** (7 etapas), **ruta crítica**, **mapa de stakeholders**, **limitaciones externas y riesgos**, y un agente de **IA vía n8n** que lee tus archivos (correos, reportes de ensayo, presentaciones, capturas), los clasifica y propone actualizar el proyecto correspondiente.

Incluye un caso **ficticio** (Andina Ingredientes y Soluciones) con **15 proyectos** simulados, uno en cada situación típica: ideas, prototipos con cliente aliado, pilotos retrasados, un proyecto pausado, uno cerrado con evaluación ex-post, etc.

### Novedades de la versión 2
- **Identidad SIGRA:** logo, tipografía Poppins (incluida en la app, funciona sin internet), paleta Olive Green #839B31 / Antique Gold #EEB012 / Pure White y tono «agroindustrial cálido». Los colores de las gráficas se derivaron de la marca y se validaron para daltonismo.
- **Estilo científico:** figuras numeradas (Fig. 01…), leyendas que explican qué muestra cada gráfica, unidades explícitas (COP M, %, días), etiquetas de datos en tipografía monoespaciada, notas de fuente, corte y tamaño de muestra (n).
- **Pantallas de detalle:** cada indicador y figura del tablero abre su propia página (menú **Indicadores**), con una explicación breve, el método de cálculo, cómo leerlo, acciones sugeridas según los datos actuales, figuras ampliadas y la tabla completa. Son 14 pantallas: proyectos activos, inversión y ejecución, rVPN, salud, actividades críticas, riesgos y limitaciones externas, gates, mapa riesgo–valor, embudo Stage-Gate, horizontes, alertas, carga por responsable, ranking y resultados ex-post.
- **Página de cada proyecto:** desde cualquier tabla, el nombre abre el proyecto y el icono ↗ lo abre en una **pestaña nueva**. Cada proyecto tiene además una **ficha técnica imprimible** (botón *Ficha técnica ↗*) que se puede guardar como PDF.
- El nombre de la organización que aparece en el tablero se cambia en **Configuración → Datos**. Los 15 proyectos de demostración siguen siendo ficticios.

> La guía completa paso a paso (PC y celular Android) está en `Guia_instalacion_SIGRA_IDi.docx`.

## 1. Requisitos
- **Node.js 24 LTS** (https://nodejs.org → elige la versión 24). La app funciona con Node 22.13 o superior, pero **n8n solo es compatible hasta Node 24**: no instales la 26 aunque la página la muestre como recomendada. No hay `npm install` ni dependencias externas; la base de datos SQLite viene integrada en Node.
- Para la IA: **n8n** (se inicia con `iniciar-n8n.bat` o `npx n8n`) y una clave de API de Anthropic (platform.claude.com → Settings → API keys; requiere saldo). Sin ellos la app funciona igual en *modo local* (clasificación básica por palabras clave).

## 2. Iniciar la app
- **Windows:** doble clic en `iniciar.bat`.
- **Mac/Linux:** `./iniciar.sh`
- O desde una terminal en esta carpeta: `npm start` (equivale a `node server.js`).

Abre **http://localhost:3000**. La primera vez carga los 15 proyectos de demostración. La app solo escucha en tu propio equipo (127.0.0.1).

## 3. Conectar n8n y la IA (5 pasos)
1. Abre `iniciar-n8n.bat` (equivale a `npx n8n`) y entra a http://localhost:5678 (crea tu cuenta local la primera vez).
2. En n8n crea un workflow vacío y, en el menú **⋯ → Import from File…**, elige `n8n/workflow-idi-ia.json`.
3. Crea la credencial **Header Auth** (Name: `x-api-key`, Value: tu API key de Anthropic) y selecciónala en los dos nodos *Llamar a Claude* (los que tienen el aviso rojo).
4. Pulsa **Publish** (arriba a la derecha). En n8n 2.x este botón reemplaza al antiguo interruptor «Active».
5. En la app: **Configuración → n8n + IA → Guardar → Probar conexión**. Debe decir «Conectado».

El modelo está en los nodos *Construir…* (`model: 'claude-sonnet-5-5'`); cámbialo si usas otro. La clave de API queda solo en n8n.

Opcional: `n8n/workflow-idi-resumen-semanal.json` arma cada lunes un resumen de alertas consultando `http://localhost:3000/api/alertas`; activa y configura el nodo *Enviar correo* (viene desactivado).

## 3b. Usarla desde el celular (misma red Wi-Fi)
1. Cierra la ventana de la app y ábrela con **`iniciar-red.bat`**. La ventana muestra la dirección para el celular (p. ej. `http://192.168.1.25:3000`) y un **PIN**.
2. La primera vez, Windows pregunta si permite el acceso de Node.js: marca **Redes privadas** y pulsa *Permitir acceso*. Tu Wi-Fi debe estar configurada como red **privada**.
3. En el celular (Chrome), escribe la dirección, ingresa el PIN y, si quieres, usa **⋮ → Agregar a la pantalla principal**.
4. El PC debe seguir encendido con la ventana abierta. El PIN se ve también en **Configuración → Acceso desde el celular**, donde puedes generar uno nuevo.

## 4. Cómo se usa
| Quiero… | Dónde |
|---|---|
| Ver el estado del portafolio (KPIs, mapa de burbujas, embudo, riesgos, alertas) | **Tablero** |
| Mover proyectos entre etapas y registrar la decisión del gate | **Pipeline** (arrastra la tarjeta) o botón *Registrar decisión de gate* |
| Balancear riesgo/retorno, horizontes 70-20-10, priorizar | **Portafolio** |
| Ver todo el calendario por etapas y los gates | **Cronograma** |
| Crear/editar proyectos, actividades, responsables, fechas, dependencias | **Proyectos** → abrir uno |
| Detectar actividades críticas (holgura 0) | Proyecto → **Actividades y ruta crítica** |
| Mapear partes interesadas (poder × interés, postura) | Proyecto → **Stakeholders**; vista global en **Stakeholders** |
| Registrar limitaciones externas y riesgos (probabilidad × impacto) | Proyecto → **Riesgos**; vista global en **Riesgos y límites** |
| Subir correos, ensayos, presentaciones, capturas | **Documentos e IA** o pestaña *Documentos* de un proyecto |
| Preguntar «¿qué proyectos están en riesgo?» | **Asistente** (requiere n8n + IA) |

**Flujo con IA:** subes el archivo → la app extrae el texto y lo envía a n8n con el contexto de tus proyectos → la IA devuelve una *propuesta* (proyecto, resumen, avances, riesgos, stakeholders) → tú la revisas, editas y aplicas. Nada cambia sin tu aprobación y todo queda en la **bitácora** del proyecto con origen «IA».

## 5. Metodología incorporada
- **Stage-Gate:** Idea → Maduración → Prototipo → Caso de negocio → Plan piloto → Piloto → Evaluación ex-post, con gates y decisiones (Go, Go con condiciones, Reciclar, Pausar, Detener) y plantilla de actividades por etapa.
- **Ruta crítica:** se calcula con las fechas y dependencias de las actividades; holgura = margen antes de retrasar a las sucesoras o la fecha final. Crítica = holgura 0.
- **Portafolio:** mapa de burbujas (probabilidad de éxito × VPN, tamaño = presupuesto), valor esperado ajustado (rVPN = VPN × P técnica × P comercial), score 0-100 con cinco criterios, balance de horizontes H1/H2/H3.
- **Salud del proyecto** (verde/amarillo/rojo): suma de actividades críticas atrasadas, gate vencido, riesgos altos y sobreejecución presupuestal; el proyecto explica el motivo.
- **Ex-post:** indicadores real vs. meta del caso de negocio, decisión final y lecciones aprendidas.
- Lecciones del trabajo con prototipos y clientes aliados incorporadas al caso: ensayos «contra patrón», panel con el cliente, maquilador, trámite sanitario y etiquetas, pruebas de estabilidad y rondas de reciclaje de prototipos.

## 6. Datos y respaldo
- Base de datos: `data/idi.db` (SQLite). Archivos subidos: `uploads/`. Copia ambas carpetas para respaldar todo.
- **Configuración → Respaldo JSON** descarga los datos en texto.
- **Vaciar y empezar propio** borra el caso demo (hazlo con un respaldo si ya editaste algo). **Restablecer caso demo** lo regenera.

## 7. Seguridad (uso local)
- Con `iniciar.bat` solo escucha en 127.0.0.1. Con `iniciar-red.bat` acepta conexiones de la red local, pero exige un PIN (cookie de 30 días, bloqueo de 5 minutos tras 5 intentos fallidos) y solo responde a direcciones privadas del propio PC. Úsalo en redes de confianza (casa u oficina), no en Wi-Fi públicas.
- Las operaciones que modifican datos exigen una cabecera propia (protege contra páginas web externas).
- El contenido de los documentos se trata como **dato**, nunca como instrucción: el flujo de n8n lo declara así al modelo, la app valida y recorta la respuesta (ids, rangos, listas permitidas) y exige tu aprobación.
- Los documentos se envían a la API de Anthropic al usar el modo IA; no subas información que no puedas compartir con ese proveedor.

## 8. Límites conocidos
- En modo local hay un solo usuario/equipo (sin inicio de sesión). Para varios usuarios usa el modo público (sección «Modo público», al final), con roles admin / editor / lector.
- Lectura local de `.docx`, `.pptx`, `.xlsx`, `.eml`, `.csv`, `.txt`, `.html`. `.doc/.ppt/.xls/.msg` antiguos: guárdalos en formato nuevo. PDFs e imágenes se leen con la IA (en modo local solo se intenta extraer texto simple de PDFs).
- El modo local no «entiende» el contexto: solo busca palabras clave; es un respaldo, no un sustituto de la IA.
- Se probó con un simulador de n8n y n8n real no estuvo disponible en el entorno de desarrollo: valida el paso 5 de la sección 3 en tu equipo.

## 9. Estructura
```
server.js            servidor y API (sin dependencias)
lib/                 base de datos, plantillas Stage-Gate, ruta crítica, análisis, IA, extracción de texto, datos demo
public/              interfaz (HTML + JS modular + CSS, gráficos en SVG propio)
public/fonts/        Poppins (SIL OFL 1.1) y DejaVu Sans Mono, con sus licencias
public/img/          logo SIGRA (tomado del manual de marca)
n8n/                 workflows importables
muestras/            archivos de ejemplo para probar la carga
data/  uploads/      se crean al iniciar (base de datos y archivos)
```

## Modo público (hosting con usuarios y contraseña)

Para publicar la app en Internet (Render, Railway, Fly.io) se incluye `Dockerfile`, `render.yaml` y `.env.example`. Con `IDI_PUBLICO=1` la app pide usuario y contraseña (roles admin / editor / lector), firma las sesiones y añade cabeceras de seguridad. Guía completa: [`DESPLIEGUE.md`](DESPLIEGUE.md).
