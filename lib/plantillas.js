'use strict';
// Plantilla Stage-Gate de actividades por etapa + programador (calcula fechas con dependencias).
const { addDays } = require('./util');

const ETAPAS = ['Idea', 'Maduración', 'Prototipo', 'Caso de negocio', 'Plan piloto', 'Piloto', 'Evaluación ex-post'];
// Reparto típico del presupuesto del proyecto por etapa (suma 1)
const PRESUPUESTO_ETAPA = [0.02, 0.06, 0.14, 0.04, 0.10, 0.56, 0.08];

// r = rol responsable: lider, form, cal, pla, mer, fin, com, cli, pi, dir
const T = [
  [ // 0 Idea
    { k: 'a', n: 'Vigilancia tecnológica y de tendencias', d: 10, r: 'mer' },
    { k: 'b', n: 'Entrevistas con clientes y expertos (detección de necesidades)', d: 14, r: 'cli' },
    { k: 'c', n: 'Búsqueda de patentes y libertad de operación (FTO preliminar)', d: 12, r: 'pi' },
    { k: 'd', n: 'Viabilidad técnica preliminar', d: 10, p: ['a', 'c'], r: 'form' },
    { k: 'e', n: 'Hipótesis de valor y prueba de concepto', d: 9, p: ['b', 'd'], r: 'lider' },
    { k: 'g', n: 'Gate 1 · Entrada a Maduración', h: 1, p: ['e'], r: 'dir' }],
  [ // 1 Maduración
    { k: 'a', n: 'Especificaciones del producto y criterios de éxito', d: 10, r: 'lider' },
    { k: 'b', n: 'Ensayos de laboratorio de viabilidad', d: 24, p: ['a'], r: 'form' },
    { k: 'c', n: 'Calificación preliminar de proveedores de materias primas', d: 18, p: ['a'], r: 'com' },
    { k: 'd', n: 'Análisis regulatorio preliminar (registro, etiquetado, declaraciones)', d: 14, p: ['a'], r: 'cal' },
    { k: 'e', n: 'Estimación preliminar de costo y precio objetivo', d: 9, p: ['b'], r: 'fin' },
    { k: 'g', n: 'Gate 2 · Entrada a Prototipo', h: 1, p: ['b', 'c', 'd', 'e'], r: 'dir' }],
  [ // 2 Prototipo
    { k: 'a', n: 'Diseño de formulaciones / variantes del prototipo', d: 14, r: 'form' },
    { k: 'b', n: 'Elaboración de lotes de prototipo en planta piloto', d: 18, p: ['a'], r: 'pla' },
    { k: 'c', n: 'Ensayos fisicoquímicos y de calidad vs. patrón', d: 14, p: ['b'], r: 'cal' },
    { k: 'd', n: 'Panel sensorial / funcional con cliente o consumidores', d: 12, p: ['b'], r: 'cli' },
    { k: 'e', n: 'Pruebas de estabilidad acelerada', d: 30, p: ['b'], r: 'cal' },
    { k: 'f', n: 'Evaluación de resultados e iteración del prototipo', d: 9, p: ['c', 'd'], r: 'lider' },
    { k: 'g', n: 'Gate 3 · Entrada a Caso de negocio', h: 1, p: ['e', 'f'], r: 'dir' }],
  [ // 3 Caso de negocio
    { k: 'a', n: 'Estudio de mercado y dimensionamiento', d: 20, r: 'mer' },
    { k: 'b', n: 'Modelo financiero (VPN, TIR, payback)', d: 14, p: ['a'], r: 'fin' },
    { k: 'c', n: 'Estimación de CAPEX y capacidad de producción', d: 14, r: 'pla' },
    { k: 'd', n: 'Estrategia de propiedad intelectual y marca', d: 12, r: 'pi' },
    { k: 'e', n: 'Análisis de riesgos y limitaciones externas', d: 9, p: ['a'], r: 'lider' },
    { k: 'f', n: 'Presentación del caso de negocio al comité', d: 5, p: ['b', 'c', 'e'], r: 'lider' },
    { k: 'g', n: 'Gate 4 · Entrada a Plan piloto', h: 1, p: ['f', 'd'], r: 'dir' }],
  [ // 4 Plan piloto
    { k: 'a', n: 'Alcance, objetivos y métricas del piloto', d: 7, r: 'lider' },
    { k: 'b', n: 'Selección de cliente aliado y/o maquilador', d: 14, p: ['a'], r: 'cli' },
    { k: 'c', n: 'Plan de producción y compra de insumos', d: 14, p: ['a'], r: 'com' },
    { k: 'd', n: 'Permisos, notificación sanitaria y etiquetas', d: 25, p: ['a'], r: 'cal' },
    { k: 'e', n: 'Protocolo de calidad y capacitación del equipo', d: 10, p: ['a'], r: 'cal' },
    { k: 'f', n: 'Aprobación del presupuesto del piloto', d: 6, p: ['b', 'c'], r: 'fin' },
    { k: 'g', n: 'Gate 5 · Autorización de Piloto', h: 1, p: ['d', 'e', 'f'], r: 'dir' }],
  [ // 5 Piloto
    { k: 'a', n: 'Producción de lotes piloto', d: 18, r: 'pla' },
    { k: 'b', n: 'Despacho y puesta en mercado / en cliente', d: 10, p: ['a'], r: 'cli' },
    { k: 'c', n: 'Monitoreo de desempeño y recolección de datos', d: 35, p: ['b'], r: 'lider' },
    { k: 'd', n: 'Retroalimentación de clientes y consumidores', d: 20, p: ['b'], r: 'mer' },
    { k: 'e', n: 'Ajustes de proceso y especificaciones', d: 14, p: ['c', 'd'], r: 'pla' },
    { k: 'f', n: 'Informe de resultados del piloto', d: 8, p: ['e'], r: 'lider' },
    { k: 'g', n: 'Gate 6 · Lanzamiento / escalamiento', h: 1, p: ['f'], r: 'dir' }],
  [ // 6 Evaluación ex-post
    { k: 'a', n: 'Medición de KPIs vs. caso de negocio', d: 15, r: 'fin' },
    { k: 'b', n: 'Análisis de desviaciones (costo, tiempo, ventas)', d: 10, p: ['a'], r: 'fin' },
    { k: 'c', n: 'Lecciones aprendidas y buenas prácticas', d: 8, p: ['b'], r: 'lider' },
    { k: 'd', n: 'Transferencia a operaciones y cierre', d: 10, p: ['b'], r: 'pla' },
    { k: 'g', n: 'Gate 7 · Cierre y decisión (escalar / ajustar / discontinuar)', h: 1, p: ['c', 'd'], r: 'dir' }]
];

// Equipo base (rol -> persona)
const PERSONAS = [
  { nombre: 'Laura Gómez', rol: 'Directora de I+D+i', area: 'Dirección' },
  { nombre: 'Camila Rojas', rol: 'Líder de proyectos senior', area: 'I+D+i' },
  { nombre: 'Andrés Pardo', rol: 'Líder de proyectos / Formulación', area: 'I+D+i' },
  { nombre: 'Natalia Suárez', rol: 'Calidad y asuntos regulatorios', area: 'Calidad' },
  { nombre: 'Julián Herrera', rol: 'Planta piloto y procesos', area: 'Operaciones' },
  { nombre: 'Mónica Díaz', rol: 'Inteligencia de mercado', area: 'Mercadeo' },
  { nombre: 'Sebastián Cruz', rol: 'Evaluación financiera', area: 'Finanzas' },
  { nombre: 'Paola Mejía', rol: 'Compras y proveedores', area: 'Abastecimiento' },
  { nombre: 'Diego Ortiz', rol: 'Gerente de cuentas clave', area: 'Comercial' },
  { nombre: 'Ricardo Vega', rol: 'Propiedad intelectual y legal', area: 'Jurídica' },
  { nombre: 'Martín Salazar', rol: 'Gerente General', area: 'Dirección' }
];
const ROL_PERSONA = { form: 'Andrés Pardo', cal: 'Natalia Suárez', pla: 'Julián Herrera', mer: 'Mónica Díaz',
  fin: 'Sebastián Cruz', com: 'Paola Mejía', cli: 'Diego Ortiz', pi: 'Ricardo Vega' };

function responsable(rol, proyecto) {
  if (rol === 'lider') return proyecto.lider;
  if (rol === 'dir') return proyecto.sponsor || 'Laura Gómez';
  const p = ROL_PERSONA[rol];
  return p === proyecto.lider && rol === 'form' ? 'Camila Rojas' : p;
}

/**
 * Programa las actividades de las etapas indicadas hacia adelante desde `inicio`.
 * @returns {{acts: Array, finEtapa: number[]}} acts con offsets (es/ef en días desde inicio) y fechas.
 */
function programar({ etapas, inicio, escala = 2, proyecto, nombres = {} }) {
  const acts = []; const idx = new Map(); let finPrev = 0; const finEtapa = [];
  for (const s of etapas) {
    let finMax = finPrev;
    for (const t of T[s]) {
      const preds = (t.p || []).map(k => `${s}.${k}`);
      if (!t.p && s > 0 && !etapas.includes(s - 1)) { /* etapa inicial: sin predecesora previa */ }
      else if (!t.p && s > etapas[0]) preds.push(`${s - 1}.g`);
      const es = preds.length ? Math.max(...preds.map(k => idx.get(k).ef)) : (s === etapas[0] ? 0 : finPrev);
      const dur = t.h ? 0 : Math.max(1, Math.round(t.d * escala));
      const a = { key: `${s}.${t.k}`, etapa: s, nombre: nombres[`${s}.${t.k}`] || t.n, rol: t.r, es, ef: es + dur,
        dur, hito: t.h ? 1 : 0, preds, responsable: responsable(t.r, proyecto) };
      a.fecha_inicio = addDays(inicio, es); a.fecha_fin = addDays(inicio, a.ef);
      idx.set(a.key, a); acts.push(a); finMax = Math.max(finMax, a.ef);
    }
    finPrev = finMax; finEtapa[s] = finMax;
  }
  return { acts, finEtapa };
}

module.exports = { ETAPAS, PRESUPUESTO_ETAPA, PLANTILLA: T, PERSONAS, programar, responsable };
