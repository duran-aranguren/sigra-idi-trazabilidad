'use strict';
// Cálculos derivados: ruta crítica, estado de actividades, salud del proyecto, KPIs de portafolio y alertas.
const { all, getConfig } = require('./db');
const { calcular } = require('./cpm');
const { hoyISO, diffDays, addDays } = require('./util');
const { ETAPAS } = require('./plantillas');

const PESOS = { s_estrategia: 25, s_mercado: 20, s_tecnica: 20, s_capacidad: 15, s_riesgo: 20 };

function estadoActividad(a, hoy) {
  if (a.avance >= 100) return 'Completada';
  if (a.estado === 'Bloqueada') return 'Bloqueada';
  if (a.fecha_fin < hoy) return 'Atrasada';
  if (!a.es_hito && a.fecha_inicio < addDays(hoy, -7) && a.avance === 0) return 'Atrasada';
  if (a.es_hito) return 'Planificada';
  if (a.avance > 0 || a.fecha_inicio <= hoy) return 'En curso';
  return 'Planificada';
}
const diasAtraso = (a, hoy) => (a.avance >= 100 ? 0 : Math.max(0, a.fecha_fin < hoy ? diffDays(hoy, a.fecha_fin) : diffDays(hoy, a.fecha_inicio) - 7));

function cargar() {
  const proyectos = all('SELECT * FROM proyectos ORDER BY codigo');
  const actividades = all('SELECT * FROM actividades ORDER BY proyecto_id, orden, id').map(a => ({ ...a, predecesoras: safeJSON(a.predecesoras) }));
  const stakeholders = all('SELECT * FROM stakeholders ORDER BY proyecto_id, poder DESC, interes DESC');
  const restricciones = all('SELECT * FROM restricciones ORDER BY proyecto_id, id');
  const gates = all('SELECT * FROM gates ORDER BY proyecto_id, fecha, id');
  const expost = all('SELECT * FROM expost ORDER BY proyecto_id, id');
  const personas = all('SELECT * FROM personas ORDER BY nombre');
  const documentos = all('SELECT id,proyecto_id,nombre_original,mime,tamano,tipo_doc,subido,estado,resumen,modo,error FROM documentos ORDER BY id DESC');
  const bitacora = all('SELECT * FROM bitacora ORDER BY fecha DESC, id DESC LIMIT 600');
  return { proyectos, actividades, stakeholders, restricciones, gates, expost, personas, documentos, bitacora };
}
function safeJSON(s) { try { const v = JSON.parse(s || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } }

function construir() {
  const hoy = hoyISO();
  const D = cargar();
  const porProy = (arr) => { const m = new Map(); for (const x of arr) { if (!m.has(x.proyecto_id)) m.set(x.proyecto_id, []); m.get(x.proyecto_id).push(x); } return m; };
  const A = porProy(D.actividades), S = porProy(D.stakeholders), R = porProy(D.restricciones), G = porProy(D.gates);
  const alertas = [];
  const add = (nivel, tipo, p, titulo, detalle, extra = {}) => alertas.push({ nivel, tipo, proyecto_id: p.id, codigo: p.codigo, proyecto: p.nombre, titulo, detalle, ...extra });

  for (const r of D.restricciones) { r.score = r.probabilidad * r.impacto; r.nivel = r.score >= 15 ? 'Alto' : r.score >= 8 ? 'Medio' : 'Bajo'; }
  for (const s of D.stakeholders) s.cuadrante = (s.poder >= 4 && s.interes >= 4) ? 'Gestionar de cerca' : (s.poder >= 4) ? 'Mantener satisfecho' : (s.interes >= 4) ? 'Mantener informado' : 'Monitorear';

  for (const p of D.proyectos) {
    const acts = A.get(p.id) || [];
    const cp = acts.length ? calcular(acts) : { porId: new Map(), finProyecto: 0 };
    for (const a of acts) {
      const c = cp.porId.get(a.id) || {};
      a.holgura = c.holgura; a.critica = !!c.critica; a.conflicto = c.conflicto || [];
      a.estado_calc = estadoActividad(a, hoy); a.dias_atraso = diasAtraso(a, hoy);
      a.duracion = Math.max(0, diffDays(a.fecha_fin, a.fecha_inicio));
    }
    const abiertas = acts.filter(a => !a.es_hito);
    const peso = a => Math.max(1, a.duracion);
    const totP = abiertas.reduce((s, a) => s + peso(a), 0) || 1;
    p.avance = Math.round(abiertas.reduce((s, a) => s + peso(a) * a.avance, 0) / totP);
    const enEtapa = abiertas.filter(a => a.etapa === p.etapa);
    const totE = enEtapa.reduce((s, a) => s + peso(a), 0) || 1;
    p.avance_etapa = Math.round(enEtapa.reduce((s, a) => s + peso(a) * a.avance, 0) / totE);
    const gate = acts.find(a => a.es_hito && a.etapa === p.etapa);
    const activo = p.estado === 'En curso';
    p.proximo_gate = gate && gate.avance < 100 && p.estado !== 'Cerrado' ? gate.fecha_fin : null;
    p.dias_gate = p.proximo_gate ? diffDays(p.proximo_gate, hoy) : null;
    p.p_exito = +(p.p_tecnica * p.p_comercial).toFixed(3);
    p.rvpn = Math.round(p.vpn_esperado * p.p_exito);
    p.ejecucion_pct = p.presupuesto ? Math.round(100 * p.ejecutado / p.presupuesto) : 0;
    p.score = Math.round(Object.entries(PESOS).reduce((s, [k, w]) => s + w * (p[k] || 0) / 5, 0));
    const hist = G.get(p.id) || [];
    const ultimoGate = hist.filter(g => g.etapa_destino !== g.etapa_origen || g.decision !== 'Reciclar').slice(-1)[0];
    p.dias_en_etapa = diffDays(hoy, ultimoGate ? ultimoGate.fecha : p.fecha_inicio);
    p.fin_planificado = acts.length ? acts.reduce((m, a) => (a.fecha_fin > m ? a.fecha_fin : m), '') : null;
    p.actividades_total = abiertas.length; p.actividades_completas = abiertas.filter(a => a.avance >= 100).length;

    // salud
    const razones = []; let pts = 0; const det = { criticas: 0, atrasadas: 0, gate: 0, riesgos: 0, presupuesto: 0 };
    if (activo) {
      const atr = abiertas.filter(a => a.estado_calc === 'Atrasada');
      const critAtr = atr.filter(a => a.critica);
      if (critAtr.length) { pts += 3 * critAtr.length; det.criticas = 3 * critAtr.length; razones.push(`${critAtr.length} actividad(es) crítica(s) atrasada(s)`); }
      const noCrit = atr.length - critAtr.length;
      if (noCrit > 0) { pts += Math.min(noCrit, 3); det.atrasadas = Math.min(noCrit, 3); razones.push(`${noCrit} actividad(es) atrasada(s) con holgura`); }
      if (gate && gate.avance < 100 && gate.fecha_fin < hoy) { pts += 3; det.gate = 3; razones.push(`Gate vencido hace ${diffDays(hoy, gate.fecha_fin)} días`); }
      const altos = (R.get(p.id) || []).filter(r => r.estado !== 'Cerrada' && r.score >= 15);
      if (altos.length) { pts += 1; det.riesgos = 1; razones.push(`${altos.length} riesgo(s) alto(s) abierto(s)`); }
      if (p.ejecutado > p.presupuesto) { pts += 2; det.presupuesto = 2; razones.push('Presupuesto excedido'); }
      p.salud = pts >= 7 ? 'rojo' : pts >= 2 ? 'amarillo' : 'verde';
    } else p.salud = p.estado === 'En pausa' ? 'pausa' : p.estado === 'Cancelado' ? 'cancelado' : 'cerrado';
    p.salud_razones = razones; p.salud_puntos = pts; p.salud_detalle = det;
    p.actualizado_dias = diffDays(hoy, p.actualizado || p.creado);

    if (!activo) { /* sin alertas operativas para proyectos pausados o cerrados */ continue; }
    for (const a of acts) {
      if (a.es_hito || a.avance >= 100) continue;
      if (a.estado_calc === 'Atrasada' && a.critica) add('critica', 'actividad_critica', p, 'Actividad crítica atrasada', `${a.nombre} — ${a.dias_atraso} días de atraso (${a.avance} % de avance)`, { fecha: a.fecha_fin, ref_id: a.id });
    }
    if (gate && gate.avance < 100) {
      if (gate.fecha_fin < hoy) add(diffDays(hoy, gate.fecha_fin) > 14 ? 'critica' : 'alta', 'gate_vencido', p, 'Gate vencido', `${gate.nombre} debía decidirse el ${gate.fecha_fin}`, { fecha: gate.fecha_fin, ref_id: gate.id });
      else if (diffDays(gate.fecha_fin, hoy) <= 21) add('media', 'gate_proximo', p, 'Gate próximo', `${gate.nombre} en ${diffDays(gate.fecha_fin, hoy)} días (${gate.fecha_fin})`, { fecha: gate.fecha_fin, ref_id: gate.id });
    }
    for (const r of R.get(p.id) || []) {
      if (r.estado === 'Cerrada') continue;
      if (r.score >= 20) add('critica', 'riesgo', p, 'Riesgo crítico', `${r.titulo} (prob. ${r.probabilidad} × impacto ${r.impacto})${r.mitigacion ? '' : ' — sin plan de mitigación'}`, { ref_id: r.id });
      else if (r.score >= 15 && !r.mitigacion) add('alta', 'riesgo', p, 'Riesgo alto sin mitigación', `${r.titulo} (prob. ${r.probabilidad} × impacto ${r.impacto})`, { ref_id: r.id });
    }
    for (const s of S.get(p.id) || []) if ((s.poder >= 4 && s.postura === 'Opositor') || (s.poder >= 4 && s.interes >= 4 && s.postura === 'Reticente' && p.etapa >= 3))
      add('alta', 'stakeholder', p, 'Stakeholder de alto poder con postura ' + s.postura.toLowerCase(), `${s.nombre} (${s.organizacion || s.rol}) — ${s.estrategia_comunicacion || 'definir estrategia'}`, { ref_id: s.id });
    if (p.ejecutado > p.presupuesto) add('alta', 'presupuesto', p, 'Presupuesto excedido', `Ejecutado ${p.ejecutado} de ${p.presupuesto} COP millones (${p.ejecucion_pct} %)`);
    for (const a of acts) if (a.conflicto && a.conflicto.length) add('media', 'dependencia', p, 'Conflicto de dependencias', `"${a.nombre}" inicia antes de que termine: ${a.conflicto.join(', ')}`, { ref_id: a.id });
    if (p.actualizado_dias > 30) add('media', 'sin_actualizar', p, 'Proyecto sin actualizar', `Sin cambios registrados hace ${p.actualizado_dias} días`);
  }
  const orden = { critica: 0, alta: 1, media: 2 };
  alertas.sort((a, b) => orden[a.nivel] - orden[b.nivel] || String(a.fecha || '9').localeCompare(String(b.fecha || '9')));

  // KPIs de portafolio
  const act = D.proyectos.filter(p => p.estado === 'En curso');
  const sum = (arr, f) => arr.reduce((s, x) => s + f(x), 0);
  const kpis = {
    total: D.proyectos.length, activos: act.length, pausados: D.proyectos.filter(p => p.estado === 'En pausa').length, cerrados: D.proyectos.filter(p => p.estado === 'Cerrado').length,
    inversion: sum(act, p => p.presupuesto), ejecutado: sum(act, p => p.ejecutado), vpn: sum(act, p => p.vpn_esperado), rvpn: sum(act, p => p.rvpn),
    p_exito_prom: act.length ? +(sum(act, p => p.p_exito) / act.length).toFixed(2) : 0,
    verde: act.filter(p => p.salud === 'verde').length, amarillo: act.filter(p => p.salud === 'amarillo').length, rojo: act.filter(p => p.salud === 'rojo').length,
    criticas_atrasadas: alertas.filter(a => a.tipo === 'actividad_critica').length,
    riesgos_altos: D.restricciones.filter(r => r.estado !== 'Cerrada' && r.score >= 15 && act.some(p => p.id === r.proyecto_id)).length,
    gates_30d: act.filter(p => p.dias_gate != null && p.dias_gate >= 0 && p.dias_gate <= 30).length,
    gates_vencidos: act.filter(p => p.dias_gate != null && p.dias_gate < 0).length,
    alertas: alertas.length
  };
  return { hoy, empresa: getConfig('empresa', ''), etapas: ETAPAS, ...D, alertas, kpis, config: configPublica() };
}

function configPublica() {
  // En hosting, IDI_N8N_URL apunta al webhook de clasificación; si no se da la del asistente, se deduce del mismo n8n.
  const envUrl = process.env.IDI_N8N_URL || '';
  const envAsis = process.env.IDI_N8N_ASISTENTE_URL || (envUrl ? envUrl.replace(/\/webhook\/[^/?#]+\/?$/, '/webhook/idi-asistente') : '');
  return { n8n_url: getConfig('n8n_url', envUrl || 'http://localhost:5678/webhook/idi-clasificar'), n8n_asistente_url: getConfig('n8n_asistente_url', envAsis || 'http://localhost:5678/webhook/idi-asistente'), n8n_token: !!(process.env.IDI_N8N_TOKEN || getConfig('n8n_token', '')), n8n_token_env: !!process.env.IDI_N8N_TOKEN,
    modo_ia: getConfig('modo_ia', 'n8n'), fallback_local: getConfig('fallback_local', '1'), demo: getConfig('demo', '0'), publico: /^(1|si|true)$/i.test(process.env.IDI_PUBLICO || '') };
}

module.exports = { construir, estadoActividad, configPublica };
