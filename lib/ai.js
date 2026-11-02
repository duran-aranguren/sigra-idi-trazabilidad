'use strict';
// Capa de IA: envía el documento a n8n (que llama al modelo) y devuelve una PROPUESTA de actualización
// que la persona revisa y aprueba. Incluye un analizador local básico de respaldo (sin IA).
const { norm } = require('./util');
const { ETAPAS } = require('./plantillas');

const PARAS = new Set('de la el los las un una unos unas y o u en con por para del al se su sus que es son fue sera como mas muy sin sobre entre este esta estos estas ese esa cada todo todos proyecto'.split(' '));
const tokens = s => norm(s).replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter(w => w.length > 3 && !PARAS.has(w));

async function llamarWebhook(url, payload, timeoutMs = 150000) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: ctl.signal });
    const txt = await r.text();
    let j; try { j = JSON.parse(txt); } catch { throw new Error(`n8n respondió algo que no es JSON (HTTP ${r.status}): ${txt.slice(0, 200)}`); }
    if (!r.ok || j.error) throw new Error(j.error || j.message || `n8n respondió HTTP ${r.status}`);
    return j;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('n8n tardó más de lo esperado (timeout).');
    if (e.cause && (e.cause.code === 'ECONNREFUSED' || e.cause.code === 'ENOTFOUND')) throw new Error(`No se pudo conectar con n8n en ${url}. ¿Está encendido y el workflow activo?`);
    throw e;
  } finally { clearTimeout(t); }
}

function contextoProyectos(T) {
  return T.proyectos.map(p => ({
    id: p.id, codigo: p.codigo, nombre: p.nombre, etapa: ETAPAS[p.etapa], estado: p.estado, lider: p.lider,
    actividades_abiertas: T.actividades.filter(a => a.proyecto_id === p.id && a.avance < 100 && !a.es_hito).slice(0, 14)
      .map(a => ({ id: a.id, nombre: a.nombre, responsable: a.responsable, fecha_fin: a.fecha_fin, avance: a.avance }))
  }));
}

/** Análisis con n8n o local. */
async function analizar({ nombre, texto, ia, binarioB64, T, config, proyectoId }) {
  const ctx = contextoProyectos(T);
  let propuesta, modo;
  if (config.modo_ia === 'n8n') {
    const payload = { archivo: nombre, texto: (texto || '').slice(0, 60000), binario: binarioB64 ? { base64: binarioB64, mime: ia.mime, tipo: ia.tipo } : null,
      proyecto_id_forzado: proyectoId || null, hoy: T.hoy, etapas: ETAPAS, proyectos: ctx };
    const local = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/)/i.test(config.n8n_url || '');
    try { if (config.publico && local) throw Object.assign(new Error('la IA vía n8n no está configurada en este servidor público'), { publicoLocal: true }); propuesta = await llamarWebhook(config.n8n_url, payload); modo = 'n8n'; }
    catch (e) {
      if (config.fallback_local !== '1') throw e;
      propuesta = analisisLocal({ nombre, texto, T, proyectoId }); modo = 'local (respaldo)'; propuesta.aviso = e.publicoLocal ? 'Análisis local por palabras clave: la IA vía n8n no está configurada en este servidor público. Revisa y ajusta la propuesta antes de aplicarla.' : 'n8n no respondió (' + e.message + '). Se usó el análisis local básico.';
    }
  } else { propuesta = analisisLocal({ nombre, texto, T, proyectoId }); modo = 'local'; }
  return { propuesta: normalizar(propuesta, T, proyectoId), modo };
}

// Valida y limpia la propuesta que llega de la IA (nunca confiar en el formato).
function normalizar(p, T, forzado) {
  p = p && typeof p === 'object' ? p : {};
  const s = (v, n = 600) => (v == null ? '' : String(v).slice(0, n));
  const n15 = v => { const x = Math.round(Number(v)); return Number.isFinite(x) ? Math.min(5, Math.max(1, x)) : 3; };
  const fecha = v => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? v : null);
  const pid = forzado || (T.proyectos.some(x => x.id === Number(p.proyecto && p.proyecto.id)) ? Number(p.proyecto.id) : null);
  const proy = pid ? T.proyectos.find(x => x.id === pid) : null;
  const idsAct = new Set(T.actividades.filter(a => a.proyecto_id === pid).map(a => a.id));
  const out = {
    proyecto: { id: pid, codigo: proy ? proy.codigo : null, confianza: Math.min(1, Math.max(0, Number(p.proyecto && p.proyecto.confianza) || 0)), nuevo: pid ? null : (p.proyecto && p.proyecto.nuevo && p.proyecto.nuevo.nombre ? { nombre: s(p.proyecto.nuevo.nombre, 200), descripcion: s(p.proyecto.nuevo.descripcion, 1000), etapa: Math.min(6, Math.max(0, Number(p.proyecto.nuevo.etapa) || 0)) } : null), motivo: s(p.proyecto && p.proyecto.motivo, 400) },
    tipo_documento: s(p.tipo_documento, 60) || 'otro', resumen: s(p.resumen, 1500), fecha_documento: fecha(p.fecha_documento),
    etapa_sugerida: ETAPAS.includes(p.etapa_sugerida) ? p.etapa_sugerida : null,
    hallazgos_clave: (Array.isArray(p.hallazgos_clave) ? p.hallazgos_clave : []).slice(0, 8).map(x => s(x, 400)),
    alertas: (Array.isArray(p.alertas) ? p.alertas : []).slice(0, 6).map(x => s(x, 400)),
    actividades_actualizar: (Array.isArray(p.actividades_actualizar) ? p.actividades_actualizar : []).filter(a => idsAct.has(Number(a.id))).slice(0, 20)
      .map(a => ({ id: Number(a.id), avance: Math.min(100, Math.max(0, Math.round(Number(a.avance)))), fecha_fin: fecha(a.fecha_fin), comentario: s(a.comentario, 400) })).filter(a => Number.isFinite(a.avance)),
    actividades_nuevas: (Array.isArray(p.actividades_nuevas) ? p.actividades_nuevas : []).filter(a => a && a.nombre).slice(0, 12)
      .map(a => ({ nombre: s(a.nombre, 200), responsable: s(a.responsable, 80), fecha_inicio: fecha(a.fecha_inicio), fecha_fin: fecha(a.fecha_fin), comentario: s(a.comentario, 300) })),
    stakeholders_nuevos: (Array.isArray(p.stakeholders_nuevos) ? p.stakeholders_nuevos : []).filter(a => a && a.nombre).slice(0, 8)
      .map(a => ({ nombre: s(a.nombre, 120), organizacion: s(a.organizacion, 120), rol: s(a.rol, 120), poder: n15(a.poder), interes: n15(a.interes), postura: ['Promotor', 'Favorable', 'Neutral', 'Reticente', 'Opositor'].includes(a.postura) ? a.postura : 'Neutral', expectativa: s(a.expectativa, 300) })),
    restricciones_nuevas: (Array.isArray(p.restricciones_nuevas) ? p.restricciones_nuevas : []).filter(a => a && a.titulo).slice(0, 8)
      .map(a => ({ tipo: s(a.tipo, 60) || 'Mercado', titulo: s(a.titulo, 200), descripcion: s(a.descripcion, 500), probabilidad: n15(a.probabilidad), impacto: n15(a.impacto), mitigacion: s(a.mitigacion, 400) })),
    aviso: s(p.aviso, 400)
  };
  return out;
}

// ---------- Análisis local (respaldo sin IA): coincidencia por palabras clave ----------
function analisisLocal({ nombre, texto, T, proyectoId }) {
  const tx = norm(texto + ' ' + nombre); const tk = new Set(tokens(texto + ' ' + nombre));
  let mejor = null, mejorPts = 0;
  for (const p of T.proyectos) {
    let pts = 0; if (tx.includes(norm(p.codigo))) pts += 12;
    for (const w of new Set(tokens(p.nombre))) if (tk.has(w)) pts += 2;
    for (const w of new Set(tokens(p.descripcion || '').slice(0, 20))) if (tk.has(w)) pts += 0.5;
    if (pts > mejorPts) { mejorPts = pts; mejor = p; }
  }
  const proy = proyectoId ? T.proyectos.find(p => p.id === proyectoId) : (mejorPts >= 3 ? mejor : null);
  const ext = (nombre.split('.').pop() || '').toLowerCase();
  const tipo = ext === 'eml' || /^(from|de|asunto|subject):/im.test(texto) ? 'correo' : ext === 'pptx' ? 'presentacion' : /ensayo|resultados? de|certificado|an[aá]lisis de|muestra|estabilidad|panel/i.test(texto) ? 'reporte_ensayo' : /acta|asistentes|compromisos/i.test(texto) ? 'acta' : /^image/.test(ext) ? 'captura' : 'informe_avance';
  const oraciones = texto.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/).filter(x => x.length > 25);
  const resumen = oraciones.slice(0, 3).join(' ').slice(0, 600) || '(Sin texto legible: el análisis completo requiere IA vía n8n.)';
  const fechaDoc = (texto.match(/\b(20\d{2}-\d{2}-\d{2})\b/) || [])[1] || null;
  const out = { proyecto: { id: proy ? proy.id : null, confianza: proy ? Math.min(0.9, mejorPts / 14) : 0, motivo: proy ? (proyectoId ? 'Proyecto seleccionado por el usuario' : 'Coincidencia por palabras clave con el nombre/código del proyecto') : 'No se identificó un proyecto con suficiente confianza' },
    tipo_documento: tipo, resumen, fecha_documento: fechaDoc, hallazgos_clave: [], alertas: [], actividades_actualizar: [], actividades_nuevas: [], stakeholders_nuevos: [], restricciones_nuevas: [],
    aviso: 'Análisis local básico (palabras clave). Para clasificar con comprensión del contexto, activa el flujo de n8n con IA.' };
  if (proy) {
    const acts = T.actividades.filter(a => a.proyecto_id === proy.id && a.avance < 100 && !a.es_hito);
    for (const sent of oraciones) {
      const st = new Set(tokens(sent)); const m = sent.match(/(\d{1,3})\s?%/); const fin = /(complet|finaliz|terminad|conclu|entregad)/i.test(sent);
      if (!m && !fin) continue;
      let mj = null, mp = 0;
      for (const a of acts) { let pts = 0; for (const w of new Set(tokens(a.nombre))) if (st.has(w)) pts++; if (pts > mp) { mp = pts; mj = a; } }
      if (mj && mp >= 2 && !out.actividades_actualizar.some(x => x.id === mj.id)) out.actividades_actualizar.push({ id: mj.id, avance: fin && !m ? 100 : Math.min(100, +m[1]), comentario: sent.slice(0, 200) });
    }
    const riesgos = oraciones.map(x => x.replace(/^[-•*]\s+/, '')).filter(x => /(retraso|demora|no cumple|rechaz|incumpl|sobrecosto|alza|escasez|no conforme|riesgo|bloom|serosidad|rancidez|observaci)/i.test(x)).slice(0, 3);
    for (const r of riesgos) { out.hallazgos_clave.push(r.slice(0, 300)); out.restricciones_nuevas.push({ tipo: 'Tecnológica', titulo: r.slice(0, 90), descripcion: r.slice(0, 400), probabilidad: 3, impacto: 3, mitigacion: '' }); }
  }
  return out;
}

async function asistente({ pregunta, historial, T, config }) {
  if (config.modo_ia !== 'n8n') throw new Error('El asistente necesita el modo n8n + IA (Configuración).');
  const k = T.kpis;
  const contexto = {
    hoy: T.hoy, kpis: k, etapas: ETAPAS,
    proyectos: T.proyectos.map(p => ({ codigo: p.codigo, nombre: p.nombre, etapa: ETAPAS[p.etapa], estado: p.estado, salud: p.salud, razones: p.salud_razones, lider: p.lider, avance: p.avance, presupuesto: p.presupuesto, ejecutado: p.ejecutado, rvpn: p.rvpn, p_exito: p.p_exito, score: p.score, proximo_gate: p.proximo_gate, trl: p.trl })),
    alertas: T.alertas.slice(0, 30).map(a => ({ nivel: a.nivel, codigo: a.codigo, titulo: a.titulo, detalle: a.detalle })),
    riesgos_altos: T.restricciones.filter(r => r.score >= 15 && r.estado !== 'Cerrada').map(r => ({ codigo: (T.proyectos.find(p => p.id === r.proyecto_id) || {}).codigo, tipo: r.tipo, titulo: r.titulo, score: r.score }))
  };
  return llamarWebhook(config.n8n_asistente_url, { pregunta, historial: (historial || []).slice(-6), contexto });
}

module.exports = { analizar, asistente, normalizar, analisisLocal, llamarWebhook };
