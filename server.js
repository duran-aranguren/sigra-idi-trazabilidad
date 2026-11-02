'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { db, all, get, run, tx, insert, update, getConfig, setConfig } = require('./lib/db');
const { construir, configPublica } = require('./lib/analisis');
const { hoyISO, addDays, clamp, ISO, dayNum, fromDayNum } = require('./lib/util');
const { ETAPAS, PERSONAS, programar } = require('./lib/plantillas');
const { sembrar, limpiar } = require('./lib/seed');
const { extraer } = require('./lib/extract');
const ai = require('./lib/ai');

const PORT = Number(process.env.PORT || 3000);
const os = require('os');
const MODO_RED = /^(1|si|true)$/i.test(process.env.IDI_RED || '') || process.argv.includes('--red');
// Modo público (hosting): acceso con usuario y contraseña, sin PIN. Se activa con IDI_PUBLICO=1.
const PUBLICO = /^(1|si|true)$/i.test(process.env.IDI_PUBLICO || '');
const HOST = (MODO_RED || PUBLICO) ? '0.0.0.0' : '127.0.0.1';
const U = PUBLICO ? require('./lib/usuarios') : null;
const HOSTS_OK = (process.env.IDI_HOSTS || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
const PUBLIC = path.join(__dirname, 'public');
const UPLOADS = process.env.IDI_UPLOADS || path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOADS, { recursive: true });
const MAX_UPLOAD = 30 * 1024 * 1024;

// ---------- esquema de campos permitidos por tabla ----------
const int = (min, max) => ({ t: 'int', min, max });
const txt = (n = 500) => ({ t: 'txt', n });
const SCHEMA = {
  proyectos: { codigo: txt(30), nombre: txt(200), descripcion: txt(2000), linea: txt(80), tipo_innovacion: txt(30), horizonte: txt(5), etapa: int(0, 6), estado: txt(20), lider: txt(80), sponsor: txt(80),
    fecha_inicio: { t: 'date' }, fecha_objetivo: { t: 'date' }, presupuesto: { t: 'real' }, ejecutado: { t: 'real' }, vpn_esperado: { t: 'real' }, p_tecnica: { t: 'real', min: 0, max: 1 }, p_comercial: { t: 'real', min: 0, max: 1 },
    trl: int(1, 9), s_estrategia: int(1, 5), s_mercado: int(1, 5), s_tecnica: int(1, 5), s_capacidad: int(1, 5), s_riesgo: int(1, 5), decision_final: txt(300), lecciones: txt(3000) },
  actividades: { proyecto_id: int(1, 1e9), etapa: int(0, 6), nombre: txt(250), responsable: txt(80), fecha_inicio: { t: 'date' }, fecha_fin: { t: 'date' }, avance: int(0, 100), estado: txt(20), es_hito: int(0, 1), predecesoras: { t: 'ids' }, notas: txt(3000), orden: int(0, 1e6) },
  stakeholders: { proyecto_id: int(1, 1e9), nombre: txt(120), organizacion: txt(120), rol: txt(120), poder: int(1, 5), interes: int(1, 5), postura: txt(20), expectativa: txt(500), estrategia_comunicacion: txt(500), contacto: txt(200) },
  restricciones: { proyecto_id: int(1, 1e9), tipo: txt(60), titulo: txt(250), descripcion: txt(1500), origen: txt(20), probabilidad: int(1, 5), impacto: int(1, 5), mitigacion: txt(1000), responsable: txt(80), estado: txt(20), fecha_revision: { t: 'date' } },
  expost: { proyecto_id: int(1, 1e9), kpi: txt(120), meta: { t: 'real' }, real: { t: 'real' }, unidad: txt(30), mayor_mejor: int(0, 1) },
  personas: { nombre: txt(80), rol: txt(120), area: txt(80) }
};
const ESTADOS_PROY = ['En curso', 'En pausa', 'Cancelado', 'Cerrado'];

function limpiarCampos(tabla, body, { parcial = false } = {}) {
  const out = {}; const sch = SCHEMA[tabla];
  for (const [k, d] of Object.entries(sch)) {
    if (!(k in body)) continue; let v = body[k];
    if (v === '' || v === undefined) v = null;
    if (v === null) { out[k] = null; continue; }
    if (d.t === 'int') { v = Math.round(Number(v)); if (!Number.isFinite(v)) throw err(400, `Campo inválido: ${k}`); out[k] = clamp(v, d.min, d.max); }
    else if (d.t === 'real') { v = Number(v); if (!Number.isFinite(v)) throw err(400, `Campo inválido: ${k}`); out[k] = d.min != null ? clamp(v, d.min, d.max) : v; }
    else if (d.t === 'date') { if (!ISO.test(String(v)) || fromDayNum(dayNum(String(v))) !== String(v)) throw err(400, `Fecha inválida en ${k} (use AAAA-MM-DD)`); out[k] = String(v); }
    else if (d.t === 'ids') { const arr = Array.isArray(v) ? v : []; out[k] = JSON.stringify([...new Set(arr.map(Number).filter(Number.isInteger))]); }
    else out[k] = String(v).slice(0, d.n);
  }
  return out;
}
function err(status, message) { const e = new Error(message); e.status = status; return e; }
const bit = (pid, accion, detalle, origen = 'manual') => run('INSERT INTO bitacora(proyecto_id,fecha,accion,detalle,origen) VALUES(?,?,?,?,?)', pid, hoyISO(), accion, String(detalle || '').slice(0, 600), origen);
const tocar = pid => pid && run('UPDATE proyectos SET actualizado=? WHERE id=?', hoyISO(), pid);

// ---------- helpers HTTP ----------
function leerCuerpo(req, limite) {
  return new Promise((resolve, reject) => {
    const partes = []; let n = 0;
    req.on('data', c => { n += c.length; if (n > limite) { reject(err(413, 'Archivo demasiado grande')); req.destroy(); } else partes.push(c); });
    req.on('end', () => resolve(Buffer.concat(partes)));
    req.on('error', reject);
  });
}
async function leerJSON(req) { const b = await leerCuerpo(req, 5 * 1024 * 1024); if (!b.length) return {}; try { return JSON.parse(b.toString('utf8')); } catch { throw err(400, 'JSON inválido'); } }
const json = (res, data, status = 200) => { const b = JSON.stringify(data); res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Length': Buffer.byteLength(b) }); res.end(b); };
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json', '.woff': 'font/woff', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json' };
function estatico(req, res, pathname) {
  let rel = decodeURIComponent(pathname); if (rel === '/') rel = '/index.html';
  const file = path.normalize(path.join(PUBLIC, rel));
  if (!file.startsWith(PUBLIC + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end('No encontrado'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': /\.(woff2?|png)$/.test(file) ? 'max-age=86400' : 'no-cache', 'X-Content-Type-Options': 'nosniff' });
  fs.createReadStream(file).pipe(res);
}

// ---------- lógica de negocio ----------
function siguienteCodigo() {
  const r = all("SELECT codigo FROM proyectos WHERE codigo LIKE 'IDI-%'").map(x => parseInt(x.codigo.slice(4), 10)).filter(Number.isFinite);
  return 'IDI-' + String((r.length ? Math.max(...r) : 0) + 1).padStart(3, '0');
}
function crearActividadesPlantilla(pid, p, etapa, inicio, escala) {
  const { acts } = programar({ etapas: [etapa], inicio, escala, proyecto: p });
  const ids = new Map(); let orden = (get('SELECT COALESCE(MAX(orden),0) m FROM actividades WHERE proyecto_id=?', pid).m || 0) + 1;
  for (const a of acts) ids.set(a.key, insert('actividades', { proyecto_id: pid, etapa: a.etapa, nombre: a.nombre, responsable: a.responsable, fecha_inicio: a.fecha_inicio, fecha_fin: a.fecha_fin, avance: 0, estado: '', es_hito: a.hito, predecesoras: '[]', orden: orden++ }));
  for (const a of acts) update('actividades', ids.get(a.key), { predecesoras: JSON.stringify(a.preds.map(k => ids.get(k)).filter(Boolean)) });
  return acts.length;
}
function crearProyecto(body, origen = 'manual') {
  const campos = limpiarCampos('proyectos', body);
  if (!campos.nombre) throw err(400, 'El nombre del proyecto es obligatorio');
  campos.codigo = campos.codigo || siguienteCodigo();
  if (get('SELECT id FROM proyectos WHERE codigo=?', campos.codigo)) throw err(400, 'Ya existe un proyecto con ese código');
  campos.etapa = campos.etapa ?? 0; campos.estado = ESTADOS_PROY.includes(campos.estado) ? campos.estado : 'En curso';
  campos.fecha_inicio = campos.fecha_inicio || hoyISO(); campos.creado = hoyISO(); campos.actualizado = hoyISO();
  if (!campos.fecha_objetivo) campos.fecha_objetivo = addDays(campos.fecha_inicio, 540);
  const pid = insert('proyectos', campos);
  bit(pid, 'Proyecto creado', `${campos.codigo} · etapa ${ETAPAS[campos.etapa]}`, origen);
  let n = 0;
  if (body.plantilla) n = crearActividadesPlantilla(pid, { lider: campos.lider || 'Camila Rojas', sponsor: campos.sponsor }, campos.etapa, campos.fecha_inicio, Number(body.escala) || 2);
  if (n) bit(pid, 'Plan inicial generado', `${n} actividades de la etapa ${ETAPAS[campos.etapa]} (editable)`, origen);
  return pid;
}
function registrarGate(pid, body) {
  const p = get('SELECT * FROM proyectos WHERE id=?', pid); if (!p) throw err(404, 'Proyecto no encontrado');
  const decision = String(body.decision || '');
  if (!['Go', 'Go con condiciones', 'Reciclar', 'Pausar', 'Detener'].includes(decision)) throw err(400, 'Decisión inválida');
  const hoy = hoyISO(); const decididoPor = String(body.decidido_por || p.sponsor || '').slice(0, 80);
  let destino = p.etapa;
  tx(() => {
    if (decision === 'Go' || decision === 'Go con condiciones') {
      const g = get('SELECT * FROM actividades WHERE proyecto_id=? AND etapa=? AND es_hito=1 ORDER BY id LIMIT 1', pid, p.etapa);
      if (g) update('actividades', g.id, { avance: 100 });
      if (p.etapa >= 6) { update('proyectos', pid, { estado: 'Cerrado', decision_final: String(body.comentario || p.decision_final || '').slice(0, 300) || null }); }
      else {
        destino = p.etapa + 1; update('proyectos', pid, { etapa: destino });
        const hay = get('SELECT COUNT(*) c FROM actividades WHERE proyecto_id=? AND etapa=?', pid, destino).c;
        if (!hay) crearActividadesPlantilla(pid, p, destino, hoy, 2);
      }
    } else if (decision === 'Pausar') update('proyectos', pid, { estado: 'En pausa' });
    else if (decision === 'Detener') update('proyectos', pid, { estado: 'Cancelado' });
    insert('gates', { proyecto_id: pid, etapa_origen: p.etapa, etapa_destino: destino, fecha: hoy, decision, comentario: String(body.comentario || '').slice(0, 800), decidido_por: decididoPor });
    bit(pid, 'Decisión de gate', `${decision}: ${ETAPAS[p.etapa]}${destino !== p.etapa ? ' → ' + ETAPAS[destino] : ''}${body.comentario ? ' — ' + String(body.comentario).slice(0, 200) : ''}`);
    tocar(pid);
  });
}

async function procesarDocumento(docId, proyectoForzado) {
  const d = get('SELECT * FROM documentos WHERE id=?', docId);
  const archivo = path.join(UPLOADS, path.basename(d.archivo));
  const buf = fs.readFileSync(archivo);
  const ex = extraer(d.nombre_original, buf);
  update('documentos', docId, { texto: (ex.texto || '').slice(0, 300000), estado: 'Analizando', error: null });
  const config = configPublica(); const T = construir();
  try {
    let b64 = null;
    if (config.modo_ia === 'n8n' && ex.ia) { const lim = ex.ia.tipo === 'image' ? 5 * 1024 * 1024 : 20 * 1024 * 1024; if (buf.length <= lim) b64 = buf.toString('base64'); else ex.aviso = 'El archivo es muy grande para enviarlo a la IA; se analizó solo el texto extraído.'; }
    const { propuesta, modo } = await ai.analizar({ nombre: d.nombre_original, texto: ex.texto, ia: ex.ia, binarioB64: b64, T, config, proyectoId: proyectoForzado || d.proyecto_id || null });
    if (ex.aviso) propuesta.aviso = [propuesta.aviso, ex.aviso].filter(Boolean).join(' ');
    update('documentos', docId, { estado: 'Por revisar', propuesta: JSON.stringify(propuesta), resumen: propuesta.resumen, tipo_doc: propuesta.tipo_documento, modo, proyecto_id: propuesta.proyecto.id || d.proyecto_id || null, error: null });
  } catch (e) { update('documentos', docId, { estado: 'Error', error: String(e.message).slice(0, 500) }); }
  return get('SELECT * FROM documentos WHERE id=?', docId);
}

function aplicarPropuesta(docId, body) {
  const d = get('SELECT * FROM documentos WHERE id=?', docId); if (!d) throw err(404, 'Documento no encontrado');
  const T = construir();
  let pid = Number(body.proyecto_id) || null;
  return tx(() => {
    const prop0 = body.propuesta || {};
    if (!pid && body.crear_proyecto && prop0.proyecto && prop0.proyecto.nuevo) {
      const n = prop0.proyecto.nuevo; pid = crearProyecto({ nombre: n.nombre, descripcion: n.descripcion, etapa: n.etapa || 0, lider: 'Camila Rojas', plantilla: true }, 'ia');
    }
    if (!pid || !get('SELECT id FROM proyectos WHERE id=?', pid)) throw err(400, 'Selecciona el proyecto al que pertenece el documento');
    const T2 = construir(); const prop = ai.normalizar(prop0, T2, pid); const p = T2.proyectos.find(x => x.id === pid);
    let cambios = 0; const hoy = hoyISO(); const nombreDoc = d.nombre_original;
    for (const a of prop.actividades_actualizar) {
      const act = get('SELECT * FROM actividades WHERE id=? AND proyecto_id=?', a.id, pid); if (!act) continue;
      const upd = { avance: a.avance }; if (a.fecha_fin) upd.fecha_fin = a.fecha_fin;
      if (a.comentario) upd.notas = ((act.notas ? act.notas + '\n' : '') + `[${hoy} · IA · ${nombreDoc}] ${a.comentario}`).slice(0, 3000);
      update('actividades', a.id, upd); cambios++;
      bit(pid, 'Actividad actualizada', `${act.nombre}: avance ${act.avance}% → ${a.avance}%${a.fecha_fin ? ', nueva fecha fin ' + a.fecha_fin : ''} (fuente: ${nombreDoc})`, 'ia');
    }
    const maxOrden = get('SELECT COALESCE(MAX(orden),0) m FROM actividades WHERE proyecto_id=?', pid).m;
    prop.actividades_nuevas.forEach((a, i) => {
      const ini = a.fecha_inicio || hoy, fin = a.fecha_fin || addDays(ini, 7);
      insert('actividades', { proyecto_id: pid, etapa: p.etapa, nombre: a.nombre, responsable: a.responsable || p.lider, fecha_inicio: ini, fecha_fin: fin < ini ? ini : fin, avance: 0, estado: '', es_hito: 0, predecesoras: '[]', notas: a.comentario ? `[${hoy} · IA] ${a.comentario}` : null, orden: maxOrden + 1 + i });
      cambios++; bit(pid, 'Actividad agregada', `${a.nombre} (fuente: ${nombreDoc})`, 'ia');
    });
    for (const s of prop.stakeholders_nuevos) { insert('stakeholders', { proyecto_id: pid, nombre: s.nombre, organizacion: s.organizacion, rol: s.rol, poder: s.poder, interes: s.interes, postura: s.postura, expectativa: s.expectativa, estrategia_comunicacion: null, contacto: null }); cambios++; bit(pid, 'Stakeholder agregado', `${s.nombre} (${s.postura})`, 'ia'); }
    for (const r of prop.restricciones_nuevas) { insert('restricciones', { proyecto_id: pid, tipo: r.tipo, titulo: r.titulo, descripcion: r.descripcion, origen: 'Externo', probabilidad: r.probabilidad, impacto: r.impacto, mitigacion: r.mitigacion || null, responsable: p.lider, estado: 'Abierta', fecha_revision: addDays(hoy, 14) }); cambios++; bit(pid, 'Restricción/riesgo agregado', r.titulo, 'ia'); }
    bit(pid, 'Documento procesado', `${nombreDoc} (${prop.tipo_documento}) — ${cambios} cambio(s) aplicado(s)`, 'ia');
    update('documentos', docId, { estado: 'Aplicado', proyecto_id: pid, propuesta: JSON.stringify(prop), tipo_doc: prop.tipo_documento });
    tocar(pid);
    return { cambios, proyecto_id: pid };
  });
}

// ---------- rutas ----------
const TABLAS_CRUD = ['actividades', 'stakeholders', 'restricciones', 'expost', 'personas'];
async function manejar(req, res, url) {
  const m = req.method; const p = url.pathname;
  if (p === '/api/todo' && m === 'GET') return json(res, construir());
  if (p === '/api/alertas' && m === 'GET') { const T = construir(); return json(res, { hoy: T.hoy, kpis: T.kpis, alertas: T.alertas }); }
  if (p === '/api/config' && m === 'GET') return json(res, configPublica());
  if (p === '/api/config' && m === 'PUT') {
    const b = await leerJSON(req);
    for (const k of ['n8n_url', 'n8n_asistente_url']) if (k in b) { if (!/^https?:\/\/[^\s]+$/i.test(b[k])) throw err(400, `URL inválida en ${k}`); setConfig(k, b[k]); }
    if ('modo_ia' in b) { if (!['n8n', 'local'].includes(b.modo_ia)) throw err(400, 'Modo inválido'); setConfig('modo_ia', b.modo_ia); }
    if ('fallback_local' in b) setConfig('fallback_local', b.fallback_local ? '1' : '0');
    if ('empresa' in b) setConfig('empresa', String(b.empresa || '').slice(0, 120));
    return json(res, configPublica());
  }
  if (p === '/api/config/probar' && m === 'POST') {
    const c = configPublica(); const r = { n8n_vivo: false, webhook_ok: false, mensaje: '' };
    try { const o = new URL(c.n8n_url).origin; const h = await fetch(o + '/healthz', { signal: AbortSignal.timeout(4000) }); r.n8n_vivo = h.ok; } catch { r.mensaje = 'No se pudo conectar con n8n. ¿Está iniciado (npx n8n)?'; }
    if (r.n8n_vivo) { try { const w = await ai.llamarWebhook(c.n8n_url, { ping: true }, 8000); r.webhook_ok = !!w.ok; r.mensaje = w.ok ? 'Conexión correcta: n8n y el workflow responden.' : 'El workflow respondió, pero no confirmó el ping.'; } catch (e) { r.mensaje = 'n8n está activo, pero el workflow no responde: ' + e.message + ' Verifica que esté importado y PUBLICADO (botón Publish arriba a la derecha en n8n).'; } }
    return json(res, r);
  }
  if (p === '/api/asistente' && m === 'POST') { const b = await leerJSON(req); if (!b.pregunta) throw err(400, 'Escribe una pregunta'); const r = await ai.asistente({ pregunta: String(b.pregunta).slice(0, 1500), historial: b.historial, T: construir(), config: configPublica() }); return json(res, { respuesta: String(r.respuesta || r.text || '').slice(0, 6000) }); }

  // proyectos
  if (p === '/api/proyectos' && m === 'POST') { const b = await leerJSON(req); const id = tx(() => crearProyecto(b)); return json(res, { id }, 201); }
  let mt;
  if ((mt = p.match(/^\/api\/proyectos\/(\d+)$/))) {
    const id = +mt[1];
    if (m === 'PUT') { const b = await leerJSON(req); const c = limpiarCampos('proyectos', b); if (c.estado && !ESTADOS_PROY.includes(c.estado)) throw err(400, 'Estado inválido'); c.actualizado = hoyISO(); tx(() => { update('proyectos', id, c); bit(id, 'Proyecto editado', Object.keys(c).filter(k => k !== 'actualizado').join(', ')); }); return json(res, { ok: true }); }
    if (m === 'DELETE') { tx(() => { run('DELETE FROM proyectos WHERE id=?', id); }); return json(res, { ok: true }); }
  }
  if ((mt = p.match(/^\/api\/proyectos\/(\d+)\/gate$/)) && m === 'POST') { registrarGate(+mt[1], await leerJSON(req)); return json(res, { ok: true }); }
  if ((mt = p.match(/^\/api\/proyectos\/(\d+)\/plantilla$/)) && m === 'POST') { const b = await leerJSON(req); const pr = get('SELECT * FROM proyectos WHERE id=?', +mt[1]); if (!pr) throw err(404, 'No existe'); const n = tx(() => crearActividadesPlantilla(pr.id, pr, Number(b.etapa ?? pr.etapa), b.inicio && ISO.test(b.inicio) ? b.inicio : hoyISO(), Number(b.escala) || 2)); bit(pr.id, 'Plan de etapa generado', `${n} actividades de ${ETAPAS[Number(b.etapa ?? pr.etapa)]}`); tocar(pr.id); return json(res, { creadas: n }); }

  // CRUD genérico
  if ((mt = p.match(/^\/api\/(actividades|stakeholders|restricciones|expost|personas)(?:\/(\d+))?$/))) {
    const tabla = mt[1], id = mt[2] ? +mt[2] : null;
    if (m === 'POST' && !id) {
      const b = await leerJSON(req); const c = limpiarCampos(tabla, b);
      if (tabla !== 'personas' && !c.proyecto_id) throw err(400, 'Falta el proyecto');
      if (tabla === 'actividades') { const pr = get('SELECT etapa FROM proyectos WHERE id=?', c.proyecto_id); if (!pr) throw err(404, 'Proyecto no existe'); c.etapa = c.etapa ?? pr.etapa; c.fecha_inicio = c.fecha_inicio || hoyISO(); c.fecha_fin = c.fecha_fin || addDays(c.fecha_inicio, 7); if (c.fecha_fin < c.fecha_inicio) c.fecha_fin = c.fecha_inicio; c.avance = c.avance ?? 0; c.orden = (get('SELECT COALESCE(MAX(orden),0) m FROM actividades WHERE proyecto_id=?', c.proyecto_id).m) + 1; }
      if (!c.nombre && !c.titulo && !c.kpi) throw err(400, 'Falta el nombre');
      let nid; try { nid = tx(() => { const i = insert(tabla, c); if (c.proyecto_id) { bit(c.proyecto_id, `${tabla.slice(0, -1)} agregado`, c.nombre || c.titulo || c.kpi); tocar(c.proyecto_id); } return i; }); } catch (e) { if (/UNIQUE/.test(e.message)) throw err(400, 'Ya existe un registro con ese nombre'); throw e; }
      return json(res, { id: nid }, 201);
    }
    if (id && m === 'PUT') {
      const b = await leerJSON(req); const c = limpiarCampos(tabla, b); delete c.proyecto_id;
      const prev = get(`SELECT * FROM ${tabla} WHERE id=?`, id); if (!prev) throw err(404, 'No existe');
      if (tabla === 'actividades') { const ini = c.fecha_inicio || prev.fecha_inicio, fin = c.fecha_fin || prev.fecha_fin; if (fin < ini) throw err(400, 'La fecha fin no puede ser anterior al inicio'); if (c.predecesoras && JSON.parse(c.predecesoras).includes(id)) throw err(400, 'Una actividad no puede depender de sí misma'); }
      tx(() => { update(tabla, id, c); if (prev.proyecto_id) { if (tabla === 'actividades' && 'avance' in c && c.avance !== prev.avance) bit(prev.proyecto_id, 'Avance actualizado', `${prev.nombre}: ${prev.avance}% → ${c.avance}%`); else bit(prev.proyecto_id, `${tabla.slice(0, -1)} editado`, prev.nombre || prev.titulo || prev.kpi); tocar(prev.proyecto_id); } });
      return json(res, { ok: true });
    }
    if (id && m === 'DELETE') {
      const prev = get(`SELECT * FROM ${tabla} WHERE id=?`, id); if (!prev) throw err(404, 'No existe');
      tx(() => {
        if (tabla === 'actividades') for (const o of all('SELECT id,predecesoras FROM actividades WHERE proyecto_id=?', prev.proyecto_id)) { let ids = []; try { ids = JSON.parse(o.predecesoras || '[]'); } catch {} if (ids.includes(id)) update('actividades', o.id, { predecesoras: JSON.stringify(ids.filter(x => x !== id)) }); }
        run(`DELETE FROM ${tabla} WHERE id=?`, id);
        if (prev.proyecto_id) { bit(prev.proyecto_id, `${tabla.slice(0, -1)} eliminado`, prev.nombre || prev.titulo || prev.kpi); tocar(prev.proyecto_id); }
      });
      return json(res, { ok: true });
    }
  }

  // documentos
  if (p === '/api/documentos' && m === 'POST') {
    const nombre = String(url.searchParams.get('nombre') || 'archivo').replace(/[\\/\0]/g, '_').slice(0, 200);
    const pid = Number(url.searchParams.get('proyecto_id')) || null;
    const buf = await leerCuerpo(req, MAX_UPLOAD); if (!buf.length) throw err(400, 'Archivo vacío');
    const ext = (nombre.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'bin';
    const guardado = `${Date.now()}-${crypto.randomBytes(5).toString('hex')}.${ext}`;
    fs.writeFileSync(path.join(UPLOADS, guardado), buf);
    const id = insert('documentos', { proyecto_id: pid, nombre_original: nombre, archivo: guardado, mime: req.headers['content-type'] || '', tamano: buf.length, subido: new Date().toISOString(), estado: 'Pendiente' });
    const d = await procesarDocumento(id, pid);
    return json(res, { id: d.id, estado: d.estado, error: d.error }, 201);
  }
  if ((mt = p.match(/^\/api\/documentos\/(\d+)$/))) {
    const id = +mt[1];
    if (m === 'GET') { const d = get('SELECT * FROM documentos WHERE id=?', id); if (!d) throw err(404, 'No existe'); d.propuesta = d.propuesta ? JSON.parse(d.propuesta) : null; d.texto = (d.texto || '').slice(0, 20000); return json(res, d); }
    if (m === 'DELETE') { const d = get('SELECT archivo FROM documentos WHERE id=?', id); if (d) { try { fs.unlinkSync(path.join(UPLOADS, path.basename(d.archivo))); } catch {} run('DELETE FROM documentos WHERE id=?', id); } return json(res, { ok: true }); }
  }
  if ((mt = p.match(/^\/api\/documentos\/(\d+)\/(analizar|aplicar|descartar|archivo)$/))) {
    const id = +mt[1], acc = mt[2];
    if (acc === 'analizar' && m === 'POST') { const b = await leerJSON(req); const d = await procesarDocumento(id, Number(b.proyecto_id) || null); return json(res, { id: d.id, estado: d.estado, error: d.error }); }
    if (acc === 'aplicar' && m === 'POST') return json(res, aplicarPropuesta(id, await leerJSON(req)));
    if (acc === 'descartar' && m === 'POST') { update('documentos', id, { estado: 'Descartado' }); return json(res, { ok: true }); }
    if (acc === 'archivo' && m === 'GET') {
      const d = get('SELECT * FROM documentos WHERE id=?', id); if (!d) throw err(404, 'No existe');
      const f = path.join(UPLOADS, path.basename(d.archivo)); if (!fs.existsSync(f)) throw err(404, 'Archivo no disponible');
      res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(d.nombre_original)}`, 'X-Content-Type-Options': 'nosniff' });
      return fs.createReadStream(f).pipe(res);
    }
  }

  // administración
  if (p === '/api/admin/reset-demo' && m === 'POST') { sembrar(); return json(res, { ok: true }); }
  if (p === '/api/admin/vaciar' && m === 'POST') { tx(() => { limpiar(); PERSONAS.forEach(x => insert('personas', x)); setConfig('demo', '0'); }); return json(res, { ok: true }); }
  if (p === '/api/admin/exportar' && m === 'GET') {
    const out = {}; for (const t of ['personas', 'proyectos', 'actividades', 'stakeholders', 'restricciones', 'gates', 'expost', 'bitacora']) out[t] = all(`SELECT * FROM ${t}`);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="idi-respaldo-${hoyISO()}.json"` }); return res.end(JSON.stringify(out, null, 1));
  }
  throw err(404, 'Ruta no encontrada');
}

// ---------- modo red (acceso desde el celular u otros equipos de la red local, protegido con PIN) ----------
const LOOP = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const esLocal = req => LOOP.has(req.socket.remoteAddress);
const HOSTNAME = os.hostname().toLowerCase();
const IP_PRIVADA = /^(10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|169\.254\.\d+\.\d+|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d+\.\d+)$/;
function hostPermitido(h) {
  if (['localhost', '127.0.0.1', '::1'].includes(h)) return true;
  if (PUBLICO) return !HOSTS_OK.length || HOSTS_OK.includes(h);
  if (!MODO_RED) return false;
  return IP_PRIVADA.test(h) || ipsRed().includes(h) || h === HOSTNAME || h === HOSTNAME + '.local' || h === HOSTNAME + '.lan' || h.endsWith('.ts.net');
}
function ipsRed() { const out = []; for (const lista of Object.values(os.networkInterfaces())) for (const i of lista || []) if (i.family === 'IPv4' && !i.internal) out.push(i.address); return out; }
function pinRed() {
  if (process.env.IDI_PIN && /^\d{4,8}$/.test(process.env.IDI_PIN)) setConfig('red_pin', process.env.IDI_PIN);
  if (!getConfig('red_pin')) setConfig('red_pin', String(crypto.randomInt(100000, 999999)));
  if (!getConfig('red_secreto')) setConfig('red_secreto', crypto.randomBytes(24).toString('hex'));
  return getConfig('red_pin');
}
const tokenRed = () => crypto.createHash('sha256').update(getConfig('red_secreto') + ':' + getConfig('red_pin')).digest('hex');
const cookies = req => Object.fromEntries((req.headers.cookie || '').split(';').map(c => c.trim().split('=')).filter(x => x[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]));
const usuarioDe = req => (PUBLICO ? U.desdeToken(cookies(req).idi_sesion) : null);
function autorizado(req) { if (PUBLICO) return !!usuarioDe(req); if (esLocal(req)) return true; const t = cookies(req).idi_acceso || ''; const ok = tokenRed(); return t.length === ok.length && crypto.timingSafeEqual(Buffer.from(t), Buffer.from(ok)); }
const intentos = new Map();
const LIBRE = /^\/(acceso|css\/|fonts\/|img\/|manifest\.webmanifest)/;
const PAGINA_ACCESO = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#2C3610"><title>SIGRA · Acceso</title><link rel="icon" href="img/favicon.png"><link rel="stylesheet" href="css/app.css"></head>
<body style="display:grid;place-items:center;min-height:100vh;padding:20px"><form id="f" class="card" style="max-width:360px;width:100%;text-align:center;padding:28px 24px">
<img src="img/sigra-logo.png" alt="SIGRA" width="110" style="margin:0 auto 10px;display:block"><div class="kicker">Trazabilidad I+D+i</div><h1 style="font-size:22px;margin:6px 0 4px">Acceso desde la red</h1>
<p class="muted small" style="margin:0 0 16px">Escribe el PIN que aparece en la ventana de la app en el PC (o en Configuración).</p>
<input id="pin" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="PIN" style="text-align:center;font-size:24px;letter-spacing:.3em;font-family:var(--mono)" autofocus>
<button class="btn primary" style="width:100%;justify-content:center;margin-top:12px;padding:11px">Entrar</button><p id="m" class="small" style="color:var(--crit-t);min-height:18px;margin:10px 0 0"></p></form>
<script>document.getElementById('f').onsubmit=async e=>{e.preventDefault();const r=await fetch('/api/acceso',{method:'POST',headers:{'Content-Type':'application/json','x-idi':'1'},body:JSON.stringify({pin:document.getElementById('pin').value.trim()})});const j=await r.json().catch(()=>({}));if(r.ok)location.href='/';else document.getElementById('m').textContent=j.error||'PIN incorrecto';};</script></body></html>`;

const PAGINA_LOGIN = PAGINA_ACCESO.replace('Acceso desde la red', 'Iniciar sesión').replace(/<p class="muted small"[^>]*>.*?<\/p>\n/s, '<p class="muted small" style="margin:0 0 16px">Ingresa con tu usuario y contraseña.</p>\n')
  .replace(/<input id="pin"[^>]*>/, '<input id="u" autocomplete="username" placeholder="Usuario" required style="margin-bottom:8px" autofocus><input id="pw" type="password" autocomplete="current-password" placeholder="Contraseña" required>')
  .replace("pin:document.getElementById('pin').value.trim()", "usuario:document.getElementById('u').value.trim(),password:document.getElementById('pw').value").replace("'/api/acceso'", "'/api/login'").replace("'PIN incorrecto'", "'Credenciales incorrectas'");
const ipCliente = req => (PUBLICO && String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || req.socket.remoteAddress;
const https = req => process.env.IDI_HTTPS === '1' || req.headers['x-forwarded-proto'] === 'https';

const server = http.createServer(async (req, res) => {
  try {
    if (PUBLICO) {
      res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('X-Frame-Options', 'DENY'); res.setHeader('Referrer-Policy', 'same-origin');
      res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; frame-ancestors 'none'");
      if (https(req)) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
      if (req.url === '/healthz') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('ok'); }
    }
    const host = (req.headers.host || '').toLowerCase().replace(/^\[?([^\]]*?)\]?(:\d+)?$/, '$1');
    if (!hostPermitido(host)) { res.writeHead(403); return res.end('Host no permitido'); }
    const url = new URL(req.url, 'http://localhost');
    if (PUBLICO && url.pathname === '/api/login' && req.method === 'POST') {
      const ip = ipCliente(req); const st = intentos.get(ip) || { n: 0, hasta: 0 };
      if (st.hasta > Date.now()) throw err(429, 'Demasiados intentos. Espera 5 minutos.');
      if (req.headers['x-idi'] !== '1') throw err(403, 'Petición no autorizada');
      const b = await leerJSON(req); const u = U.verificar(b.usuario, b.password);
      if (!u) { st.n++; if (st.n >= 5) { st.hasta = Date.now() + 300000; st.n = 0; } intentos.set(ip, st); throw err(401, 'Usuario o contraseña incorrectos'); }
      intentos.delete(ip);
      res.setHeader('Set-Cookie', `idi_sesion=${U.emitir(u)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${https(req) ? '; Secure' : ''}`);
      return json(res, { ok: true });
    }
    if (PUBLICO && url.pathname === '/api/logout' && req.method === 'POST') { res.setHeader('Set-Cookie', 'idi_sesion=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'); return json(res, { ok: true }); }
    if (url.pathname === '/api/acceso' && !PUBLICO && req.method === 'POST') {
      const ip = req.socket.remoteAddress; const st = intentos.get(ip) || { n: 0, hasta: 0 };
      if (st.hasta > Date.now()) throw err(429, 'Demasiados intentos. Espera 5 minutos.');
      const b = await leerJSON(req);
      if (String(b.pin || '') !== getConfig('red_pin')) { st.n++; if (st.n >= 5) { st.hasta = Date.now() + 300000; st.n = 0; } intentos.set(ip, st); throw err(401, 'PIN incorrecto'); }
      intentos.delete(ip);
      res.setHeader('Set-Cookie', `idi_acceso=${tokenRed()}; Path=/; HttpOnly; SameSite=Strict; Max-Age=2592000`);
      return json(res, { ok: true });
    }
    if (!autorizado(req)) {
      if (url.pathname.startsWith('/api/')) throw err(401, PUBLICO ? 'Inicia sesión' : 'Ingresa el PIN de acceso');
      if (url.pathname === '/acceso') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); return res.end(PUBLICO ? PAGINA_LOGIN : PAGINA_ACCESO); }
      if (!LIBRE.test(url.pathname)) { res.writeHead(302, { Location: '/acceso' }); return res.end(); }
    }
    if (url.pathname === '/acceso') { res.writeHead(302, { Location: '/' }); return res.end(); }
    if (PUBLICO && url.pathname === '/api/yo') { const u = usuarioDe(req); return json(res, { publico: true, usuario: u.usuario, nombre: u.nombre, rol: u.rol }); }
    if (!PUBLICO && url.pathname === '/api/yo') return json(res, { publico: false });
    if (PUBLICO) {
      const u = usuarioDe(req); const api = url.pathname.startsWith('/api/');
      if (api && req.method !== 'GET' && !U.puede(u, 'editor')) throw err(403, 'Tu rol es de solo lectura');
      if (api && (url.pathname.startsWith('/api/admin/') || url.pathname.startsWith('/api/usuarios') || (url.pathname.startsWith('/api/config') && req.method !== 'GET')) && !U.puede(u, 'admin')) throw err(403, 'Solo el administrador puede hacer esto');
      if (url.pathname === '/api/usuarios' || url.pathname.startsWith('/api/usuarios/')) {
        if (req.method !== 'GET' && req.headers['x-idi'] !== '1') throw err(403, 'Petición no autorizada');
        const id = Number(url.pathname.split('/')[3]);
        if (req.method === 'GET') return json(res, U.listar());
        const b = await leerJSON(req);
        if (req.method === 'POST') return json(res, { id: U.crear(b) });
        if (req.method === 'PUT') { U.cambiar(id, b); return json(res, { ok: true }); }
        if (req.method === 'DELETE') { if (id === u.id) throw err(400, 'No puedes eliminar tu propio usuario'); U.borrar(id); return json(res, { ok: true }); }
      }
    }
    if (url.pathname === '/api/red/pin' && req.method === 'POST') { if (!esLocal(req) || !MODO_RED) throw err(403, 'Solo se puede cambiar el PIN desde el PC en modo red'); if (req.headers['x-idi'] !== '1') throw err(403, 'Petición no autorizada'); setConfig('red_pin', String(crypto.randomInt(100000, 999999))); console.log(`  Nuevo PIN de acceso: ${getConfig('red_pin')}`); return json(res, { pin: getConfig('red_pin') }); }
    if (url.pathname === '/api/red' && req.method === 'GET') return json(res, { publico: PUBLICO, activo: MODO_RED, puerto: PORT, urls: MODO_RED ? ipsRed().map(i => `http://${i}:${PORT}`) : [], pin: MODO_RED && esLocal(req) ? getConfig('red_pin') : null, local: esLocal(req) });
    if (!url.pathname.startsWith('/api/')) return estatico(req, res, url.pathname);
    if (req.method !== 'GET' && req.headers['x-idi'] !== '1') throw err(403, 'Petición no autorizada');
    await manejar(req, res, url);
  } catch (e) {
    if (!e.status) console.error(e);
    if (!res.headersSent) json(res, { error: e.status ? e.message : 'Error interno: ' + e.message }, e.status || 500); else res.end();
  }
});

if (!get('SELECT COUNT(*) c FROM proyectos').c && getConfig('demo', null) === null) { console.log('Base de datos vacía: cargando 15 proyectos de demostración…'); sembrar(); }
if (MODO_RED && !PUBLICO) pinRed();
let adminInicial = null, usuariosEnv = []; if (PUBLICO) { adminInicial = U.iniciarAdmin(); usuariosEnv = U.iniciarUsuariosEnv(); }
server.on('error', e => { if (e.code === 'EADDRINUSE') { console.error(`\n  El puerto ${PORT} ya está en uso: ¿la app ya está abierta en otra ventana?\n`); process.exit(1); } throw e; });
server.listen(PORT, HOST, () => {
  console.log(`\n  SIGRA · Trazabilidad I+D+i\n  En este PC:      http://localhost:${PORT}`);
  if (PUBLICO) { console.log(`  Modo PÚBLICO: acceso con usuario y contraseña (puerto ${PORT}).`); if (adminInicial) console.log(`  Administrador inicial creado: usuario «${adminInicial.usuario}»${adminInicial.password ? ' · contraseña generada (cámbiala al entrar): ' + adminInicial.password : ' · contraseña tomada de IDI_ADMIN_PASS'}`); if (usuariosEnv.length) console.log(`  Usuarios creados desde IDI_USUARIOS: ${usuariosEnv.join(', ')}`); }
  else if (MODO_RED) { const ips = ipsRed(); console.log(`  Desde el celular (misma red Wi-Fi):\n${ips.map(i => `                   http://${i}:${PORT}`).join('\n') || '                   (no se detectó una red: conéctate al Wi-Fi)'}\n  PIN de acceso:   ${getConfig('red_pin')}`); }
  else console.log('  Modo solo este PC (para usarla desde el celular abre iniciar-red.bat)');
  console.log(`  Datos: ${require('./lib/db').DB_FILE}\n  Deja esta ventana abierta mientras usas la app. Ctrl+C para detener.\n`);
});
module.exports = server;
