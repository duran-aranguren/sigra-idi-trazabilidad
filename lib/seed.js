'use strict';
// Datos de demostración: empresa ficticia "Andina Ingredientes y Soluciones" y 15 proyectos de innovación.
const { db, all, run, tx, insert, update, setConfig } = require('./db');
const { hoyISO, addDays, mulberry32, clamp } = require('./util');
const { ETAPAS, PRESUPUESTO_ETAPA, PERSONAS, programar } = require('./plantillas');

const EMPRESA = 'Andina Ingredientes y Soluciones (caso ficticio)';

const P = [
  { c: 'IDI-001', n: 'Proteína de leguminosas para snacks extruidos', l: 'Ingredientes funcionales', t: 'Adyacente', h: 'H2', e: 0, f: 0.55, k: 1.0, s: 'verde', lid: 'Andrés Pardo', sp: 'Laura Gómez', pp: 380, vpn: 2400, pt: .55, pc: .60, trl: 2, sc: [4, 4, 3, 3, 3], tags: ['alimento', 'consumo', 'regulado', 'proveedor'],
    d: 'Aislado proteico de garbanzo y lenteja con perfil sensorial neutro para snacks extruidos de alto contenido proteico.',
    rx: ['Mercado', 'Fuerte competencia de proteína importada con precio por debajo de nuestro costo objetivo', 4, 3] },
  { c: 'IDI-002', n: 'Edulcorante natural de bajo aporte calórico para lácteos', l: 'Ingredientes funcionales', t: 'Disruptiva', h: 'H3', e: 0, f: 0.25, k: 1.1, s: 'verde', lid: 'Camila Rojas', sp: 'Martín Salazar', pp: 520, vpn: 5200, pt: .40, pc: .55, trl: 2, sc: [5, 4, 2, 2, 2], tags: ['alimento', 'regulado', 'consumo', 'ip'], estado: 'En pausa',
    d: 'Sistema edulcorante con extracto de stevia y fibras para reducir 30 % del azúcar en yogures y bebidas lácteas.',
    rx: ['Propiedad intelectual', 'Patentes de terceros cubren mezclas de glucósidos con fibras similares', 3, 4] },
  { c: 'IDI-003', n: 'Emulsionante vegetal para cremas de untar', l: 'Ingredientes funcionales', t: 'Incremental', h: 'H1', e: 1, f: 0.5, k: 0.95, s: 'verde', lid: 'Andrés Pardo', sp: 'Laura Gómez', pp: 460, vpn: 1900, pt: .70, pc: .70, trl: 3, sc: [4, 4, 4, 4, 4], tags: ['alimento', 'consumo', 'proveedor'],
    d: 'Emulsionante de origen vegetal sin alérgenos declarables para reemplazar lecitina de soya en cremas de untar.',
    rx: ['Cadena de suministro', 'Proveedor único calificado de la materia prima base', 3, 3] },
  { c: 'IDI-004', n: 'Colorante natural estable de cúrcuma', l: 'Ingredientes funcionales', t: 'Adyacente', h: 'H2', e: 1, f: 0.9, k: 1.15, s: 'amarillo', lid: 'Natalia Suárez', sp: 'Laura Gómez', pp: 410, vpn: 2100, pt: .50, pc: .65, trl: 3, sc: [3, 4, 3, 3, 3], tags: ['alimento', 'regulado', 'proveedor'],
    d: 'Colorante amarillo natural microencapsulado con estabilidad a la luz y a pH ácido para confitería y bebidas.',
    rx: ['Tecnológica', 'Pérdida de color superior al 20 % tras 60 días de exposición a luz', 4, 4] },
  { c: 'IDI-005', n: 'Cobertura sucedánea de bajo costo', l: 'Coberturas y grasas', t: 'Adyacente', h: 'H1', e: 2, f: 0.62, k: 1.1, s: 'rojo', lid: 'Camila Rojas', sp: 'Laura Gómez', pp: 780, vpn: 3600, pt: .60, pc: .70, trl: 4, sc: [5, 5, 3, 4, 3], tags: ['alimento', 'cliente', 'maquila', 'consumo', 'proveedor'],
    d: 'Mezcla grasa vegetal para sustituir parcialmente la manteca de cacao en coberturas, validada con un cliente aliado frente a su patrón de referencia.',
    nom: { '2.a': 'Diseño de 3 mezclas (A, B, C) y definición del patrón de referencia', '2.b': 'Elaboración de cobertura con cada mezcla en la planta del cliente aliado', '2.c': 'Ensayos de curva de sólidos, bloom y estabilidad vs. patrón', '2.d': 'Panel sensorial cruzado (empresa y cliente aliado)', '2.e': 'Cámara de estabilidad a 30 °C (barras de 500 g)' },
    rx: ['Tecnológica', 'Ninguna mezcla alcanza la resistencia térmica del patrón; se observa serosidad y residual graso', 4, 4], rec: 2 },
  { c: 'IDI-006', n: 'Antiadherente en aerosol de base vegetal', l: 'Aerosoles técnicos', t: 'Incremental', h: 'H1', e: 2, f: 0.35, k: 1.0, s: 'verde', lid: 'Julián Herrera', sp: 'Laura Gómez', pp: 540, vpn: 2300, pt: .75, pc: .65, trl: 5, sc: [4, 4, 4, 3, 4], tags: ['aerosol', 'regulado', 'maquila', 'proveedor', 'cliente'],
    d: 'Agente antiadherente/desmoldante en aerosol con base vegetal y propelente de menor huella, para panaderías industriales.',
    nom: { '2.a': 'Formulación de 3 bases vegetales y definición de propelente', '2.b': 'Llenado de lotes prototipo en el maquilador', '2.c': 'Ensayos de presión, atomización y residuos vs. patrón', '2.d': 'Pruebas de desmoldeo en línea del cliente' },
    rx: ['Regulatoria', 'Requisitos de rotulado y seguridad de aerosoles (presión, inflamabilidad) pueden exigir cambio de envase', 3, 3] },
  { c: 'IDI-007', n: 'Aceite estructurado bajo en grasas saturadas', l: 'Coberturas y grasas', t: 'Disruptiva', h: 'H3', e: 2, f: 0.82, k: 1.2, s: 'amarillo', lid: 'Andrés Pardo', sp: 'Martín Salazar', pp: 690, vpn: 4800, pt: .45, pc: .60, trl: 4, sc: [4, 4, 2, 3, 2], tags: ['alimento', 'ip', 'regulado', 'consumo'],
    d: 'Oleogel con etilcelulosa y ceras naturales que reemplaza grasas saturadas en rellenos y coberturas.',
    rx: ['Regulatoria', 'Etilcelulosa como estructurante aún sin aprobación clara para esta categoría de alimentos', 3, 5] },
  { c: 'IDI-008', n: 'Empaque monomaterial reciclable para snacks', l: 'Empaques sostenibles', t: 'Adyacente', h: 'H2', e: 3, f: 0.6, k: 1.0, s: 'verde', lid: 'Camila Rojas', sp: 'Laura Gómez', pp: 950, vpn: 5600, pt: .70, pc: .70, trl: 6, sc: [5, 4, 4, 3, 4], tags: ['empaque', 'consumo', 'proveedor', 'cliente'],
    d: 'Estructura de película de polietileno monomaterial con barrera a oxígeno, compatible con reciclaje mecánico.',
    rx: ['Ambiental / ESG', 'Metas de responsabilidad extendida (REP) elevan el costo de empaques no reciclables a partir del próximo año', 4, 3] },
  { c: 'IDI-009', n: 'Bebida láctea con probióticos de larga vida', l: 'Bebidas', t: 'Disruptiva', h: 'H3', e: 3, f: 0.35, k: 1.1, s: 'amarillo', lid: 'Natalia Suárez', sp: 'Martín Salazar', pp: 1200, vpn: 9800, pt: .50, pc: .55, trl: 5, sc: [5, 4, 3, 2, 2], tags: ['alimento', 'regulado', 'consumo', 'ip', 'maquila'],
    d: 'Bebida láctea UHT con cepas probióticas viables durante 120 días sin cadena de frío.',
    rx: ['Regulatoria', 'Declaraciones de salud (claims) requieren evidencia clínica local y aprobación sanitaria', 4, 4] },
  { c: 'IDI-010', n: 'Premezcla fortificada para panadería', l: 'Ingredientes funcionales', t: 'Incremental', h: 'H1', e: 4, f: 0.7, k: 0.9, s: 'verde', lid: 'Andrés Pardo', sp: 'Laura Gómez', pp: 880, vpn: 4100, pt: .85, pc: .75, trl: 7, sc: [4, 5, 5, 4, 4], tags: ['alimento', 'cliente', 'regulado'],
    d: 'Premezcla con hierro, zinc y fibra para pan de molde industrial, lista para dosificar en línea.',
    rx: ['Cliente / aliado', 'El cliente piloto condiciona el calendario a su cambio de línea de producción', 3, 3] },
  { c: 'IDI-011', n: 'Salsa líquida de larga vida sin conservantes', l: 'Alimentos listos', t: 'Adyacente', h: 'H2', e: 4, f: 1.25, k: 1.25, s: 'rojo', lid: 'Julián Herrera', sp: 'Laura Gómez', pp: 1050, vpn: 5200, pt: .65, pc: .60, trl: 6, sc: [4, 4, 3, 3, 3], tags: ['alimento', 'maquila', 'regulado', 'consumo'],
    d: 'Salsa con tratamiento térmico por HPP y acidulantes naturales, 9 meses de vida útil a temperatura ambiente.',
    rx: ['Cadena de suministro', 'Capacidad de HPP disponible solo en un proveedor externo con agenda saturada', 4, 4] },
  { c: 'IDI-012', n: 'Etiqueta QR de trazabilidad por lote', l: 'Empaques sostenibles', t: 'Incremental', h: 'H1', e: 5, f: 0.55, k: 1.0, s: 'verde', lid: 'Camila Rojas', sp: 'Laura Gómez', pp: 620, vpn: 1800, pt: .90, pc: .80, trl: 8, sc: [4, 3, 5, 5, 5], tags: ['empaque', 'cliente'],
    d: 'Código QR dinámico por lote que enlaza certificado de calidad, origen de ingredientes y fecha de vencimiento.',
    rx: ['Tecnológica', 'Legibilidad del código sobre película metalizada en línea de alta velocidad', 2, 3] },
  { c: 'IDI-013', n: 'Untable vegetal reformulado sin aceite de palma', l: 'Coberturas y grasas', t: 'Adyacente', h: 'H2', e: 5, f: 0.86, k: 1.1, s: 'rojo', lid: 'Andrés Pardo', sp: 'Martín Salazar', pp: 1350, vpn: 6700, pt: .75, pc: .65, trl: 8, sc: [5, 5, 4, 4, 3], tags: ['alimento', 'consumo', 'regulado', 'proveedor', 'maquila'],
    d: 'Reformulación de un untable con mezcla de aceites alto oleico y estearinas alternativas, manteniendo textura y vida útil.',
    rx: ['Cadena de suministro', 'Volatilidad del precio de aceites alto oleico y dependencia de importación', 4, 4] },
  { c: 'IDI-014', n: 'Harina de plátano sin gluten', l: 'Ingredientes funcionales', t: 'Adyacente', h: 'H2', e: 6, f: 1.0, k: 1.0, s: 'verde', lid: 'Natalia Suárez', sp: 'Laura Gómez', pp: 820, vpn: 3200, pt: .90, pc: .80, trl: 9, sc: [4, 4, 5, 4, 4], tags: ['alimento', 'consumo', 'regulado', 'proveedor'], estado: 'Cerrado', ejec: 865,
    d: 'Harina de plátano verde precocida, apta para dietas sin gluten, comercializada a panaderías y marcas de snacks.',
    rx: ['Mercado', 'Estacionalidad de la oferta de plátano de calidad industrial', 3, 2],
    dec: 'Escalar a línea regular de producción', lec: 'La validación temprana con dos clientes ancla redujo el riesgo comercial. El tiempo a mercado excedió la meta por la demora del registro sanitario: iniciar el trámite regulatorio desde Maduración en proyectos similares.',
    ex: [['Ventas del primer año', 1200, 1340, 'COP millones', 1], ['Margen bruto', 28, 31, '%', 1], ['Costo total del proyecto', 820, 865, 'COP millones', 0], ['Tiempo a mercado', 18, 21, 'meses', 0], ['Clientes activos', 12, 15, 'clientes', 1]] },
  { c: 'IDI-015', n: 'Snack horneado de quinua', l: 'Alimentos listos', t: 'Adyacente', h: 'H2', e: 6, f: 0.6, k: 1.0, s: 'amarillo', lid: 'Julián Herrera', sp: 'Laura Gómez', pp: 700, vpn: 2800, pt: .85, pc: .70, trl: 9, sc: [3, 3, 5, 4, 3], tags: ['alimento', 'consumo', 'regulado', 'maquila'], ejec: 760,
    d: 'Snack horneado de quinua y maíz con perfil proteico, lanzado en canal tradicional y autoservicios.',
    rx: ['Mercado', 'Rotación en punto de venta inferior a la esperada y guerra de precios en la categoría', 4, 4],
    dec: 'Ajustar propuesta de valor y precio antes de ampliar distribución', lec: 'El piloto confirmó aceptación sensorial pero no la disposición a pagar el precio objetivo. Medir elasticidad de precio antes del lanzamiento.',
    ex: [['Ventas acumuladas (6 meses)', 900, 540, 'COP millones', 1], ['Margen bruto', 30, 24, '%', 1], ['Costo total del proyecto', 700, 760, 'COP millones', 0], ['Rotación en punto de venta', 6, 4, 'unid./sem.', 1]] }
];

const SK = [
  { n: 'Martín Salazar', o: 'Gerencia General', r: 'Patrocinador ejecutivo', po: 5, i: 4, p: 'Promotor', x: 'Retorno del portafolio y cumplimiento de la meta de ingresos por innovación', s: 'Informe ejecutivo mensual y revisión en cada gate', t: ['all'] },
  { n: 'Diego Ortiz', o: 'Dirección Comercial', r: 'Voz del cliente', po: 4, i: 4, p: 'Favorable', x: 'Productos con ventaja diferencial vendibles en menos de 12 meses', s: 'Reunión quincenal de seguimiento comercial', t: ['all'] },
  { n: 'Sebastián Cruz', o: 'Finanzas / Comité de inversión', r: 'Aprobador de presupuesto', po: 5, i: 3, p: 'Reticente', x: 'Casos de negocio con VPN positivo y payback menor a 3 años', s: 'Mantener satisfecho: modelo financiero transparente con supuestos explícitos', t: ['all'] },
  { n: 'Natalia Suárez', o: 'Calidad y regulatorio', r: 'Validador técnico', po: 3, i: 5, p: 'Neutral', x: 'Cumplir especificaciones y dossier regulatorio completo', s: 'Involucrar desde Maduración en la definición de especificaciones', t: ['alimento', 'aerosol'] },
  { n: 'Autoridad sanitaria (INVIMA)', o: 'INVIMA', r: 'Regulador', po: 5, i: 2, p: 'Neutral', x: 'Cumplimiento de requisitos de registro, rotulado y declaraciones', s: 'Consulta previa y radicación oportuna del trámite', t: ['regulado'] },
  { n: 'Cliente aliado (co-desarrollo)', o: 'Confitería Dulcemar S.A.S.', r: 'Cliente co-desarrollador', po: 4, i: 5, p: 'Favorable', x: 'Prototipos comparables con su patrón y calendario respetado', s: 'Gestionar de cerca: reuniones de avance y retroalimentación cruzada', t: ['cliente'] },
  { n: 'Compras de retail', o: 'Almacenes Central', r: 'Canal de venta', po: 4, i: 3, p: 'Neutral', x: 'Rotación y margen en góndola', s: 'Mantener satisfecho: pruebas de góndola y plan promocional', t: ['consumo'] },
  { n: 'Proveedor estratégico', o: 'Aceites y Grasas del Sur', r: 'Proveedor de materia prima', po: 3, i: 3, p: 'Neutral', x: 'Contratos de volumen estables y pronósticos confiables', s: 'Mantener informado: plan de compras trimestral', t: ['proveedor'] },
  { n: 'Maquilador', o: 'Maquilas del Valle S.A.', r: 'Fabricación por contrato', po: 3, i: 4, p: 'Favorable', x: 'Programación anticipada y especificaciones cerradas', s: 'Gestionar de cerca: ventanas de producción acordadas', t: ['maquila'] },
  { n: 'Operaciones / Planta', o: 'Planta de producción', r: 'Escalamiento y capacidad', po: 4, i: 4, p: 'Reticente', x: 'Cero paradas no planeadas por cambios de formulación', s: 'Involucrar desde Prototipo en pruebas de planta', t: ['alimento', 'empaque', 'maquila'] },
  { n: 'Autoridad ambiental (REP)', o: 'Ministerio de Ambiente', r: 'Regulador ambiental', po: 4, i: 2, p: 'Neutral', x: 'Metas de aprovechamiento de empaques', s: 'Monitorear la normativa y reportar cumplimiento', t: ['empaque'] },
  { n: 'Cooperativa de recicladores', o: 'Recuperadores de oficio', r: 'Actor de la cadena de reciclaje', po: 2, i: 4, p: 'Favorable', x: 'Materiales con valor de recuperación', s: 'Informar y probar clasificabilidad del empaque', t: ['empaque'] },
  { n: 'Panel de consumidores', o: 'Consumidores objetivo', r: 'Usuario final', po: 2, i: 4, p: 'Favorable', x: 'Sabor, precio justo y atributos saludables', s: 'Pruebas de concepto y de producto por etapas', t: ['consumo'] },
  { n: 'Competidor líder', o: 'Competidor líder del segmento', r: 'Reacción competitiva esperada', po: 3, i: 5, p: 'Opositor', x: 'Defender su cuota con precio o lanzamientos', s: 'Monitorear: vigilancia competitiva trimestral', t: ['consumo', 'cliente'] },
  { n: 'Universidad aliada', o: 'Grupo de investigación universitario', r: 'Aliado científico', po: 2, i: 5, p: 'Promotor', x: 'Publicación y proyectos conjuntos', s: 'Convenio de investigación con acuerdos de PI', t: ['ip'] },
  { n: 'Ricardo Vega', o: 'Jurídica / Propiedad intelectual', r: 'Gestión de patentes', po: 3, i: 3, p: 'Neutral', x: 'Libertad de operación y protección de la invención', s: 'Revisión de FTO en cada gate', t: ['ip'] },
  { n: 'Gremio sectorial', o: 'Asociación de industriales de alimentos', r: 'Influenciador regulatorio', po: 3, i: 3, p: 'Neutral', x: 'Reglas claras para la categoría', s: 'Monitorear y participar en mesas técnicas', t: ['regulado'] },
  { n: 'Mónica Díaz', o: 'Mercadeo', r: 'Posicionamiento y precio', po: 3, i: 4, p: 'Favorable', x: 'Propuesta de valor clara y precio sostenible', s: 'Involucrar en el estudio de mercado y en el panel', t: ['consumo'] }
];

const RP = [
  { t: 'Regulatoria', ti: 'Cambio en la norma de etiquetado frontal de advertencia', d: 'Posibles nuevos sellos o umbrales de nutrientes críticos podrían afectar la declaración del producto.', p: 3, i: 3, m: 'Seguimiento mensual del proyecto de norma y diseño de rotulado flexible.', g: ['alimento'] },
  { t: 'Regulatoria', ti: 'Demora en el trámite sanitario (registro / notificación)', d: 'El tiempo real de respuesta de la autoridad supera el planeado en el cronograma.', p: 3, i: 4, m: 'Radicación temprana y consulta previa; incluir holgura de 30 días.', g: ['regulado'] },
  { t: 'Mercado', ti: 'Reacción de precio del competidor líder', d: 'El competidor podría bajar precios o lanzar un sustituto cercano al momento del lanzamiento.', p: 3, i: 3, m: 'Vigilancia competitiva y diferenciación en atributos no replicables.', g: ['consumo'] },
  { t: 'Mercado', ti: 'Concentración de ventas en pocos clientes', d: 'La demanda inicial depende de uno o dos clientes ancla.', p: 3, i: 3, m: 'Plan de diversificación de clientes desde el piloto.', g: ['cliente'] },
  { t: 'Cadena de suministro', ti: 'Volatilidad de precio de materias primas', d: 'El costo de insumos clave varía con el mercado internacional y el tipo de cambio.', p: 4, i: 3, m: 'Contratos de cobertura y segundo proveedor calificado.', g: ['proveedor', 'alimento'] },
  { t: 'Cadena de suministro', ti: 'Capacidad limitada del maquilador', d: 'Las ventanas de producción del maquilador se cruzan con su demanda de temporada.', p: 3, i: 3, m: 'Reservar ventanas de producción con 60 días de anticipación.', g: ['maquila'] },
  { t: 'Tecnológica', ti: 'Escalamiento de laboratorio a planta no lineal', d: 'Parámetros de proceso validados en banco pueden no replicarse en equipos industriales.', p: 3, i: 4, m: 'Corridas de verificación en planta piloto antes del Gate de piloto.', g: ['alimento', 'aerosol'] },
  { t: 'Propiedad intelectual', ti: 'Patente de tercero cercana a la solución', d: 'Una familia de patentes vigente podría limitar la libertad de operación.', p: 2, i: 5, m: 'Estudio de FTO con abogado externo y estrategia de diseño alrededor.', g: ['ip'] },
  { t: 'Financiera', ti: 'Recorte o reasignación presupuestal', d: 'La priorización del portafolio podría trasladar recursos a proyectos de corto plazo.', p: 2, i: 4, m: 'Hitos con entregables visibles y revisión trimestral del portafolio.', g: ['all'] },
  { t: 'Ambiental / ESG', ti: 'Metas de huella de carbono del cliente', d: 'Clientes grandes exigirán reducción de huella en sus proveedores.', p: 3, i: 2, m: 'Medir huella del producto y proponer ruta de reducción.', g: ['empaque', 'cliente'] },
  { t: 'Cliente / aliado', ti: 'Dependencia del calendario del cliente co-desarrollador', d: 'Los ensayos dependen de ventanas de producción del cliente aliado.', p: 3, i: 3, m: 'Calendario conjunto y responsables por ambas partes.', g: ['cliente'] }
];

const DEC_COM = ['Aprobado; confirmar proveedor alterno antes del siguiente gate', 'Aprobado con la condición de cerrar el análisis regulatorio', 'Aprobado; priorizar ensayos de estabilidad', 'Aprobado; ajustar presupuesto de la siguiente etapa'];
const PERSONAS_RESP = ['Camila Rojas', 'Andrés Pardo', 'Natalia Suárez', 'Julián Herrera', 'Diego Ortiz', 'Ricardo Vega'];

function limpiar() {
  for (const t of ['bitacora', 'documentos', 'expost', 'gates', 'restricciones', 'stakeholders', 'actividades', 'proyectos', 'personas'])
    run(`DELETE FROM ${t}`);
  run("DELETE FROM sqlite_sequence");
}

function sembrar({ hoy = hoyISO() } = {}) {
  tx(() => {
    limpiar();
    PERSONAS.forEach(p => insert('personas', p));
    const rng = mulberry32(2026);
    for (const cfg of P) {
      const proyecto = { lider: cfg.lid, sponsor: cfg.sp };
      const todas = programar({ etapas: [0, 1, 2, 3, 4, 5, 6], inicio: '2000-01-01', escala: 2 * cfg.k, proyecto, nombres: cfg.nom });
      const fe = todas.finEtapa; const e = cfg.e;
      const base = e > 0 ? fe[e - 1] : 0;
      const offsetHoy = Math.round(base + cfg.f * (fe[e] - base));
      const inicio = addDays(hoy, -offsetHoy);
      const hasta = Math.min(e + 1, 6);
      const etapas = Array.from({ length: hasta + 1 }, (_, i) => i);
      const { acts } = programar({ etapas, inicio, escala: 2 * cfg.k, proyecto, nombres: cfg.nom });

      const cerrado = cfg.estado === 'Cerrado';
      // avance según fechas
      for (const a of acts) {
        if (cerrado) { a.avance = 100; continue; }
        if (a.hito) a.avance = (a.etapa < e) ? 100 : 0;
        else if (a.fecha_fin <= hoy) a.avance = 100;
        else if (a.fecha_inicio >= hoy) a.avance = 0;
        else a.avance = Math.round(100 * (offsetHoy - a.es) / (a.ef - a.es));
      }
      // retrasos intencionales según salud
      const idx = new Map(acts.map(a => [a.key, a]));
      const sucesores = k => acts.filter(x => x.preds.includes(k));
      const bloquear = (key) => { // sucesores que ya "debían" iniciar no pueden avanzar
        const cola = [key]; const vistos = new Set();
        while (cola.length) { const k = cola.shift(); for (const s of sucesores(k)) { if (vistos.has(s.key)) continue; vistos.add(s.key); if (!s.hito && s.fecha_inicio < hoy) s.avance = 0; cola.push(s.key); } }
      };
      if (cfg.s !== 'verde' && !cerrado && cfg.estado !== 'En pausa') {
        const candidatas = acts.filter(a => !a.hito && a.fecha_fin <= hoy && a.fecha_fin >= addDays(hoy, -45) && a.etapa >= Math.max(0, e - 1));
        // rojo => preferir actividades de la ruta crítica de la etapa (las de mayor fin); amarillo => penúltima
        candidatas.sort((x, y) => y.ef - x.ef);
        const elegida = cfg.s === 'rojo' ? candidatas[0] : (candidatas[1] || candidatas[0]);
        if (elegida) { elegida.avance = cfg.s === 'rojo' ? 55 + Math.floor(rng() * 25) : 70 + Math.floor(rng() * 20); if (cfg.s === 'rojo') bloquear(elegida.key); }
      }
      const objetivo = cerrado ? hoy : addDays(inicio, fe[6] + Math.round(rng() * 20));
      const share = PRESUPUESTO_ETAPA.slice(0, e).reduce((s, v) => s + v, 0) + Math.min(1, cfg.f) * PRESUPUESTO_ETAPA[e];
      const factor = cfg.s === 'rojo' ? 1.18 : cfg.s === 'amarillo' ? 1.07 : 0.98 + rng() * 0.04;
      const ejecutado = cfg.ejec != null ? cfg.ejec : Math.round(cfg.pp * share * factor);
      const pid = insert('proyectos', {
        codigo: cfg.c, nombre: cfg.n, descripcion: cfg.d, linea: cfg.l, tipo_innovacion: cfg.t, horizonte: cfg.h, etapa: e,
        estado: cfg.estado || 'En curso', lider: cfg.lid, sponsor: cfg.sp, fecha_inicio: inicio, fecha_objetivo: objetivo,
        presupuesto: cfg.pp, ejecutado, vpn_esperado: cfg.vpn, p_tecnica: cfg.pt, p_comercial: cfg.pc, trl: cfg.trl,
        s_estrategia: cfg.sc[0], s_mercado: cfg.sc[1], s_tecnica: cfg.sc[2], s_capacidad: cfg.sc[3], s_riesgo: cfg.sc[4],
        decision_final: cfg.dec || null, lecciones: cfg.lec || null, creado: inicio, actualizado: addDays(hoy, -Math.floor(rng() * (cfg.s === 'rojo' ? 40 : 12)))
      });
      // actividades
      const ids = new Map(); let orden = 0;
      for (const a of acts) {
        ids.set(a.key, insert('actividades', { proyecto_id: pid, etapa: a.etapa, nombre: a.nombre, responsable: a.responsable,
          fecha_inicio: a.fecha_inicio, fecha_fin: a.fecha_fin, avance: a.avance, estado: '', es_hito: a.hito, predecesoras: '[]', notas: null, orden: orden++ }));
      }
      for (const a of acts) update('actividades', ids.get(a.key), { predecesoras: JSON.stringify(a.preds.map(k => ids.get(k)).filter(Boolean)) });
      // historial de gates
      for (let s = 0; s < e || (cerrado && s <= 6); s++) {
        const g = idx.get(`${s}.g`); if (!g) continue;
        const reciclado = cfg.rec === s;
        insert('gates', { proyecto_id: pid, etapa_origen: s, etapa_destino: Math.min(s + 1, 6), fecha: g.fecha_fin,
          decision: (s === 6) ? 'Go' : (rng() < 0.22 ? 'Go con condiciones' : 'Go'),
          comentario: s === 6 ? (cfg.dec || 'Cierre del proyecto') : DEC_COM[Math.floor(rng() * DEC_COM.length)], decidido_por: cfg.sp });
        if (reciclado) insert('gates', { proyecto_id: pid, etapa_origen: s, etapa_destino: s, fecha: addDays(g.fecha_fin, -28), decision: 'Reciclar', comentario: 'Se repite la ronda de prototipos para ajustar la mezcla antes de decidir.', decidido_por: cfg.sp });
      }
      if (cfg.rec === e) insert('gates', { proyecto_id: pid, etapa_origen: e, etapa_destino: e, fecha: addDays(hoy, -35), decision: 'Reciclar', comentario: 'Segunda ronda de prototipos: ajustar formulación por serosidad y residual graso observados por el cliente.', decidido_por: cfg.sp });
      // stakeholders
      let pool = SK.filter(s => s.t.includes('all') || s.t.some(t => cfg.tags.includes(t)));
      pool = pool.filter((s, i) => s.t.includes('all') || rng() > 0.2);
      for (const s of pool.slice(0, 9)) {
        insert('stakeholders', { proyecto_id: pid, nombre: s.n, organizacion: s.o, rol: s.r,
          poder: clamp(s.po + (rng() > 0.8 ? -1 : 0), 1, 5), interes: clamp(s.i + (rng() > 0.8 ? 1 : 0), 1, 5), postura: s.p,
          expectativa: s.x, estrategia_comunicacion: s.s, contacto: null });
      }
      // restricciones / riesgos externos
      const rps = RP.filter(r => r.g.includes('all') || r.g.some(t => cfg.tags.includes(t)));
      const sel = rps.sort(() => rng() - 0.5).slice(0, 3);
      const ests = ['Abierta', 'Mitigando', 'Mitigando', 'Abierta'];
      for (const r of sel) insert('restricciones', { proyecto_id: pid, tipo: r.t, titulo: r.ti, descripcion: r.d, origen: 'Externo',
        probabilidad: clamp(r.p + (rng() > 0.7 ? 1 : 0), 1, 5), impacto: r.i, mitigacion: r.m, responsable: PERSONAS_RESP[Math.floor(rng() * PERSONAS_RESP.length)],
        estado: ests[Math.floor(rng() * ests.length)], fecha_revision: addDays(hoy, 7 + Math.floor(rng() * 40)) });
      const [rt, rd, rpv, rim] = cfg.rx;
      insert('restricciones', { proyecto_id: pid, tipo: rt, titulo: rd.length > 118 ? rd.slice(0, rd.lastIndexOf(' ', 115)) + '…' : rd, descripcion: rd, origen: 'Externo', probabilidad: rpv, impacto: rim,
        mitigacion: (rpv * rim >= 15 && cfg.s !== 'verde' && rng() > 0.5) ? null : 'Plan de contingencia definido con el equipo y revisado en cada gate.', responsable: cfg.lid,
        estado: 'Abierta', fecha_revision: addDays(hoy, 10 + Math.floor(rng() * 20)) });
      // ex-post
      for (const [kpi, meta, real, unidad, mm] of (cfg.ex || [])) insert('expost', { proyecto_id: pid, kpi, meta, real, unidad, mayor_mejor: mm });
      insert('bitacora', { proyecto_id: pid, fecha: inicio, accion: 'Proyecto creado', detalle: `Ingresa a la etapa ${ETAPAS[0]}`, origen: 'sistema' });
      for (const g of all('SELECT * FROM gates WHERE proyecto_id=? ORDER BY fecha', pid))
        insert('bitacora', { proyecto_id: pid, fecha: g.fecha, accion: 'Decisión de gate', detalle: `${g.decision}: ${ETAPAS[g.etapa_origen]} → ${ETAPAS[g.etapa_destino]}`, origen: 'sistema' });
    }
    setConfig('empresa', EMPRESA);
    setConfig('demo', '1');
  });
}

module.exports = { sembrar, limpiar, EMPRESA };
