import { S, A, esc, attr, money, nf, fecha, fechaCorta, relDias, ETAPAS, ETAPA_CORTA, HZ_NOMBRE, stageColor, chipSalud, SALUD, api, hacer, toast, modal, formModal, confirmar, sel, $, $$, lista, iniciales, POSTURAS, val, mill } from './core.js';
import { hbars, legend, gantt, radar, chevrons, trlBar, riskHeat, stakeGrid, tip } from './viz.js';
import { card, pageHead } from './v-tablero.js';
import { dropzoneHTML, listaDocs } from './v-docs.js';

const rerender = () => document.dispatchEvent(new CustomEvent('rerender'));
const TABS = [['resumen', 'Resumen'], ['actividades', 'Actividades y ruta crítica'], ['stakeholders', 'Stakeholders'], ['riesgos', 'Riesgos y restricciones'], ['gates', 'Gates'], ['documentos', 'Documentos'], ['bitacora', 'Bitácora']];
let filtroAct = 'etapa';

// ---------- formularios ----------
const camposProyecto = (nuevo) => {
  const pers = S.T.personas.map(p => p.nombre);
  return [
    { k: 'nombre', label: 'Nombre del proyecto', req: true, full: true },
    { k: 'descripcion', label: 'Descripción / propuesta de valor', t: 'textarea', full: true },
    { k: 'linea', label: 'Línea de negocio', list: 'dl-lineas' }, { k: 'tipo_innovacion', label: 'Tipo de innovación', t: 'select', opts: ['Incremental', 'Adyacente', 'Disruptiva'] },
    { k: 'horizonte', label: 'Horizonte', t: 'select', opts: [['H1', HZ_NOMBRE.H1], ['H2', HZ_NOMBRE.H2], ['H3', HZ_NOMBRE.H3]] }, { k: 'etapa', label: 'Etapa actual', t: 'select', num: true, opts: ETAPAS.map((e, i) => [i, e]) },
    { k: 'lider', label: 'Líder del proyecto', list: 'dl-personas', req: true }, { k: 'sponsor', label: 'Patrocinador (sponsor)', list: 'dl-personas' },
    { k: 'fecha_inicio', label: 'Fecha de inicio', t: 'date', req: true }, { k: 'fecha_objetivo', label: 'Fecha objetivo (lanzamiento/cierre)', t: 'date' },
    { k: 'presupuesto', label: 'Presupuesto total (COP millones)', t: 'number', min: 0, step: 'any' }, { k: 'ejecutado', label: 'Ejecutado a la fecha (COP millones)', t: 'number', min: 0, step: 'any' },
    { k: 'vpn_esperado', label: 'VPN esperado si tiene éxito (COP millones)', t: 'number', step: 'any' }, { k: 'trl', label: 'TRL (madurez tecnológica 1-9)', t: 'number', min: 1, max: 9 },
    { k: 'p_tecnica', label: 'Probabilidad de éxito técnico', t: 'range', min: 0, max: 100, step: 5, suf: ' %' }, { k: 'p_comercial', label: 'Probabilidad de éxito comercial', t: 'range', min: 0, max: 100, step: 5, suf: ' %' },
    ...(nuevo ? [{ k: 'plantilla', label: '¿Generar plan de actividades de la etapa?', t: 'select', opts: [['1', 'Sí, con la plantilla Stage-Gate (editable)'], ['0', 'No, lo armo yo']], def: '1' }, { k: 'escala', label: 'Escala de tiempos del plan', t: 'select', opts: [['1', 'Rápido (×1)'], ['2', 'Estándar (×2)'], ['3', 'Extendido (×3)']], def: '2' }]
      : [{ k: 'estado', label: 'Estado', t: 'select', opts: ['En curso', 'En pausa', 'Cancelado', 'Cerrado'] }, { k: 'decision_final', label: 'Decisión final / resultado', full: true }, { k: 'lecciones', label: 'Lecciones aprendidas', t: 'textarea', full: true }]),
    { k: 's_estrategia', label: 'Criterio: alineación estratégica (1-5)', t: 'range', min: 1, max: 5 }, { k: 's_mercado', label: 'Criterio: atractivo de mercado (1-5)', t: 'range', min: 1, max: 5 },
    { k: 's_tecnica', label: 'Criterio: factibilidad técnica (1-5)', t: 'range', min: 1, max: 5 }, { k: 's_capacidad', label: 'Criterio: capacidad / recursos (1-5)', t: 'range', min: 1, max: 5 },
    { k: 's_riesgo', label: 'Criterio: bajo riesgo (5 = riesgo bajo)', t: 'range', min: 1, max: 5 }
  ];
};
const aForm = p => ({ ...p, p_tecnica: Math.round((p.p_tecnica || 0) * 100), p_comercial: Math.round((p.p_comercial || 0) * 100) });
const deForm = v => { v = { ...v }; if (v.p_tecnica != null) v.p_tecnica = v.p_tecnica / 100; if (v.p_comercial != null) v.p_comercial = v.p_comercial / 100; if (v.plantilla != null) { v.plantilla = v.plantilla === '1'; v.escala = +v.escala; } return v; };
A['nuevo-proyecto'] = async () => {
  const hoy = S.T.hoy; const v = await formModal({ titulo: 'Nuevo proyecto de innovación', campos: camposProyecto(true), ancho: 760, valores: { tipo_innovacion: 'Incremental', horizonte: 'H1', etapa: 0, fecha_inicio: hoy, lider: S.T.personas[1]?.nombre, sponsor: S.T.personas[0]?.nombre, presupuesto: 0, ejecutado: 0, vpn_esperado: 0, trl: 1, p_tecnica: 50, p_comercial: 50, s_estrategia: 3, s_mercado: 3, s_tecnica: 3, s_capacidad: 3, s_riesgo: 3 }, guardar: 'Crear proyecto' });
  if (!v) return; const r = await hacer(() => api('POST', '/api/proyectos', deForm(v)), 'Proyecto creado'); if (r) location.hash = '#/proyecto/' + r.id;
};
A['editar-proyecto'] = async el => {
  const p = S.T.pmap.get(+el.dataset.id); const v = await formModal({ titulo: `Editar ${p.codigo}`, campos: camposProyecto(false), valores: aForm(p), ancho: 760 });
  if (v) { await hacer(() => api('PUT', '/api/proyectos/' + p.id, deForm(v)), 'Proyecto actualizado'); rerender(); }
};
A['borrar-proyecto'] = async el => { const p = S.T.pmap.get(+el.dataset.id); if (await confirmar(`¿Eliminar el proyecto ${p.codigo} y TODA su información (actividades, stakeholders, riesgos, gates)? Esta acción no se puede deshacer.`, 'Eliminar proyecto', true)) { await hacer(() => api('DELETE', '/api/proyectos/' + p.id), 'Proyecto eliminado'); location.hash = '#/proyectos'; } };

// ---------- actividades ----------
const camposAct = (pid, id) => [
  { k: 'nombre', label: 'Actividad', req: true, full: true }, { k: 'responsable', label: 'Responsable', list: 'dl-personas' }, { k: 'etapa', label: 'Etapa', t: 'select', num: true, opts: ETAPAS.map((e, i) => [i, e]) },
  { k: 'fecha_inicio', label: 'Inicio', t: 'date', req: true }, { k: 'fecha_fin', label: 'Fin', t: 'date', req: true },
  { k: 'avance', label: 'Avance', t: 'range', min: 0, max: 100, step: 5, suf: ' %' }, { k: 'es_hito', label: 'Tipo', t: 'select', num: true, opts: [[0, 'Actividad'], [1, 'Hito / gate (duración 0)']] },
  { k: 'estado', label: 'Marca manual', t: 'select', opts: [['', 'Normal'], ['Bloqueada', 'Bloqueada (esperando algo externo)']] }, { k: 'predecesoras', label: 'Depende de (predecesoras)', t: 'preds', full: true, opts: lista('amap', pid).filter(a => a.id !== id).map(a => ({ id: a.id, nombre: `[${ETAPA_CORTA[a.etapa]}] ${a.nombre}` })) },
  { k: 'notas', label: 'Notas y avances', t: 'textarea', full: true, rows: 3 }
];
A['nueva-act'] = async el => {
  const pid = +el.dataset.id, p = S.T.pmap.get(pid);
  const v = await formModal({ titulo: 'Nueva actividad', campos: camposAct(pid, 0), valores: { responsable: p.lider, etapa: p.etapa, fecha_inicio: S.T.hoy, fecha_fin: S.T.hoy, avance: 0, es_hito: 0, predecesoras: [] }, ancho: 700, guardar: 'Agregar' });
  if (v) { v.proyecto_id = pid; await hacer(() => api('POST', '/api/actividades', v), 'Actividad agregada'); rerender(); }
};
A['editar-act'] = async el => {
  const a = S.T.actividades.find(x => x.id === +el.dataset.id); if (!a) return;
  const meta = `<div class="small muted" style="margin-top:10px">Estado calculado: <b>${a.estado_calc}</b>${a.holgura != null ? ` · Holgura: <b>${a.holgura} d</b>` : ''}${a.critica ? ' · <b style="color:var(--crit-t)">En la ruta crítica</b>' : ''}</div>`;
  const campos = camposAct(a.proyecto_id, a.id);
  const { campo, leerForm } = await import('./core.js');
  const r = await modal({ titulo: 'Editar actividad', ancho: 700, cuerpo: `<form class="grid-form" onsubmit="return false">${campos.map(c => campo(c, a)).join('')}</form>${meta}`, acciones: [{ txt: 'Eliminar', cls: 'danger', fn: async () => (await confirmar('¿Eliminar esta actividad?', 'Eliminar', true)) ? 'del' : false, sinCerrar: true }, { txt: 'Cancelar', fn: () => null }, { txt: 'Guardar', cls: 'primary', fn: bg => { const f = bg.querySelector('form'); if (!f.reportValidity()) return false; return leerForm(f, campos); } }] });
  if (r === 'del') { await hacer(() => api('DELETE', '/api/actividades/' + a.id), 'Actividad eliminada'); rerender(); }
  else if (r && typeof r === 'object') { await hacer(() => api('PUT', '/api/actividades/' + a.id, r), 'Actividad actualizada'); rerender(); }
};
A['generar-plan'] = async el => {
  const p = S.T.pmap.get(+el.dataset.id); const v = await formModal({ titulo: 'Generar plan de actividades', campos: [{ k: 'etapa', label: 'Etapa', t: 'select', num: true, opts: ETAPAS.map((e, i) => [i, e]) }, { k: 'inicio', label: 'Fecha de inicio', t: 'date', req: true }, { k: 'escala', label: 'Escala de tiempos', t: 'select', opts: [['1', 'Rápido (×1)'], ['2', 'Estándar (×2)'], ['3', 'Extendido (×3)']] }], valores: { etapa: p.etapa, inicio: S.T.hoy, escala: '2' }, guardar: 'Generar', ancho: 520, extra: '<p class="small muted mt">Agrega las actividades típicas Stage-Gate de la etapa con dependencias y un gate al final. Podrás editarlas o borrarlas.</p>' });
  if (v) { v.escala = +v.escala; await hacer(() => api('POST', `/api/proyectos/${p.id}/plantilla`, v), 'Plan generado'); rerender(); }
};

// ---------- stakeholders ----------
const camposSta = [{ k: 'nombre', label: 'Nombre / cargo', req: true }, { k: 'organizacion', label: 'Organización' }, { k: 'rol', label: 'Rol en el proyecto', full: true },
  { k: 'poder', label: 'Poder / influencia (1-5)', t: 'range', min: 1, max: 5 }, { k: 'interes', label: 'Interés (1-5)', t: 'range', min: 1, max: 5 }, { k: 'postura', label: 'Postura frente al proyecto', t: 'select', opts: POSTURAS, full: true },
  { k: 'expectativa', label: 'Qué espera del proyecto', t: 'textarea', full: true, rows: 2 }, { k: 'estrategia_comunicacion', label: 'Estrategia de relacionamiento', t: 'textarea', full: true, rows: 2 }];
A['nuevo-stake'] = async el => { const v = await formModal({ titulo: 'Nueva parte interesada', campos: camposSta, valores: { poder: 3, interes: 3, postura: 'Neutral' }, guardar: 'Agregar' }); if (v) { v.proyecto_id = +el.dataset.id; await hacer(() => api('POST', '/api/stakeholders', v), 'Stakeholder agregado'); rerender(); } };
A['editar-stake'] = async el => { const s = S.T.stakeholders.find(x => x.id === +el.dataset.id); const v = await formModal({ titulo: 'Editar parte interesada', campos: camposSta, valores: s }); if (v) { await hacer(() => api('PUT', '/api/stakeholders/' + s.id, v), 'Guardado'); rerender(); } };
A['borrar-stake'] = async el => { if (await confirmar('¿Quitar esta parte interesada?', 'Quitar', true)) { await hacer(() => api('DELETE', '/api/stakeholders/' + el.dataset.id), 'Eliminado'); rerender(); } };

// ---------- riesgos / restricciones ----------
const TIPOS_R = ['Regulatoria', 'Mercado', 'Cadena de suministro', 'Tecnológica', 'Propiedad intelectual', 'Financiera', 'Ambiental / ESG', 'Cliente / aliado', 'Organizacional'];
const camposRes = [{ k: 'titulo', label: 'Restricción o riesgo', req: true, full: true }, { k: 'tipo', label: 'Tipo', t: 'select', opts: TIPOS_R }, { k: 'origen', label: 'Origen', t: 'select', opts: ['Externo', 'Interno'] },
  { k: 'probabilidad', label: 'Probabilidad (1-5)', t: 'range', min: 1, max: 5 }, { k: 'impacto', label: 'Impacto (1-5)', t: 'range', min: 1, max: 5 }, { k: 'descripcion', label: 'Descripción', t: 'textarea', full: true, rows: 2 },
  { k: 'mitigacion', label: 'Plan de mitigación / contingencia', t: 'textarea', full: true, rows: 2 }, { k: 'responsable', label: 'Responsable', list: 'dl-personas' }, { k: 'estado', label: 'Estado', t: 'select', opts: ['Abierta', 'Mitigando', 'Materializada', 'Cerrada'] }, { k: 'fecha_revision', label: 'Próxima revisión', t: 'date' }];
A['nuevo-riesgo'] = async el => { const p = S.T.pmap.get(+el.dataset.id); const v = await formModal({ titulo: 'Nueva restricción / riesgo', campos: camposRes, valores: { tipo: 'Regulatoria', origen: 'Externo', probabilidad: 3, impacto: 3, estado: 'Abierta', responsable: p.lider }, guardar: 'Agregar', ancho: 680 }); if (v) { v.proyecto_id = p.id; await hacer(() => api('POST', '/api/restricciones', v), 'Riesgo agregado'); rerender(); } };
A['editar-riesgo'] = async el => { const r = S.T.restricciones.find(x => x.id === +el.dataset.id); const v = await formModal({ titulo: 'Editar restricción / riesgo', campos: camposRes, valores: r, ancho: 680 }); if (v) { await hacer(() => api('PUT', '/api/restricciones/' + r.id, v), 'Guardado'); rerender(); } };
A['borrar-riesgo'] = async el => { if (await confirmar('¿Eliminar este registro?', 'Eliminar', true)) { await hacer(() => api('DELETE', '/api/restricciones/' + el.dataset.id), 'Eliminado'); rerender(); } };

// ---------- ex-post ----------
const camposKpi = [{ k: 'kpi', label: 'Indicador', req: true, full: true }, { k: 'meta', label: 'Meta (caso de negocio)', t: 'number', step: 'any', req: true }, { k: 'real', label: 'Resultado real', t: 'number', step: 'any', req: true }, { k: 'unidad', label: 'Unidad' }, { k: 'mayor_mejor', label: 'Interpretación', t: 'select', num: true, opts: [[1, 'Más es mejor'], [0, 'Menos es mejor']] }];
A['nuevo-kpi'] = async el => { const v = await formModal({ titulo: 'Nuevo indicador ex-post', campos: camposKpi, valores: { mayor_mejor: 1 }, ancho: 560 }); if (v) { v.proyecto_id = +el.dataset.id; await hacer(() => api('POST', '/api/expost', v), 'Indicador agregado'); rerender(); } };
A['editar-kpi'] = async el => { const k = S.T.expost.find(x => x.id === +el.dataset.id); const v = await formModal({ titulo: 'Editar indicador', campos: camposKpi, valores: k, ancho: 560 }); if (v) { await hacer(() => api('PUT', '/api/expost/' + k.id, v), 'Guardado'); rerender(); } };
A['borrar-kpi'] = async el => { if (await confirmar('¿Eliminar el indicador?', 'Eliminar', true)) { await hacer(() => api('DELETE', '/api/expost/' + el.dataset.id), 'Eliminado'); rerender(); } };
A['filtro-act'] = el => { filtroAct = el.dataset.f; rerender(); };

// ---------- vista ----------
const dl = (k, v) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
export default {
  render({ id, tab = 'resumen' }) {
    const T = S.T, p = T.pmap.get(+id);
    if (!p) return `<div class="empty">Proyecto no encontrado. <a href="#/proyectos">Volver a la lista</a></div>`;
    const acts = lista('amap', p.id), sts = lista('smap', p.id), rs = lista('rmap', p.id), gs = lista('gmap', p.id), docs = lista('dmap', p.id), bit = lista('bmap', p.id);
    const kpi = (l, v, d) => `<div class="kpi"><div class="l">${l}</div><div class="v" style="font-size:23px">${v}</div><div class="d">${d}</div></div>`;
    const head = `<div class="doc-head" style="padding-bottom:16px"><nav class="crumbs"><a href="#/tablero">Tablero</a> / <a href="#/proyectos">Proyectos</a> / <b>${esc(p.codigo)}</b></nav>
    <div class="phead"><div style="flex:1;min-width:300px"><div class="kicker">${esc(p.codigo)} · ${esc(p.linea || 'Sin línea')} · ${esc(ETAPAS[p.etapa])}</div><h1>${esc(p.nombre)}</h1><div class="row wrap gap-s" style="margin-top:8px">${p.estado === 'En curso' ? chipSalud(p.salud) : ''}<span class="chip">${esc(p.estado)}</span><span class="chip">${esc(p.tipo_innovacion)}</span><span class="chip">${p.horizonte}</span><span class="chip">👤 ${esc(p.lider)}</span></div></div>
    <div class="row wrap noprint"><a class="btn" href="#/ficha/${p.id}" target="_blank" rel="noopener" title="Ficha técnica imprimible en pestaña nueva">📄 Ficha técnica ↗</a><a class="btn" href="#/proyecto/${p.id}/${tab}" target="_blank" rel="noopener" title="Abrir esta página en una pestaña nueva">↗ Pestaña nueva</a><button class="btn" data-act="editar-proyecto" data-id="${p.id}">Editar</button><button class="btn primary" data-act="registrar-gate" data-id="${p.id}">◆ Registrar gate</button><button class="btn ghost" data-act="borrar-proyecto" data-id="${p.id}" title="Eliminar proyecto">🗑</button></div></div></div>
    <div class="card" style="padding:10px 14px">${chevrons(p.etapa, p.estado === 'Cerrado')}</div>
    <div class="kpis mt">${kpi('Avance global', val(p.avance, '%'), `<div class="bar" style="margin-top:6px"><i style="width:${p.avance}%"></i></div><span class="small">Etapa actual: ${p.avance_etapa} %</span>`)}
    ${kpi('Ejecución presupuestal', val(p.ejecucion_pct, '%'), `<div class="bar ${p.ejecucion_pct > 100 ? 'bad' : ''}" style="margin-top:6px"><i style="width:${Math.min(100, p.ejecucion_pct)}%"></i></div><span class="small">${money(p.ejecutado)} de ${money(p.presupuesto)}</span>`)}
    ${kpi('rVPN', val(mill(p.rvpn), 'COP M'), `VPN ${money(p.vpn_esperado)} × éxito ${Math.round(p.p_exito * 100)} %`)}
    ${kpi('Madurez tecnológica', val(p.trl, 'TRL / 9'), trlBar(p.trl))}
    ${kpi('Próximo gate', p.proximo_gate ? relDias(p.dias_gate) : '—', p.proximo_gate ? fecha(p.proximo_gate) : 'Sin gate pendiente')}
    ${kpi('Score de portafolio', val(p.score, '/ 100'), `${p.dias_en_etapa} días en la etapa actual`)}</div>
    <nav class="tabs">${TABS.map(([k, n]) => `<a href="#/proyecto/${p.id}/${k}" class="${k === tab ? 'on' : ''}">${n}${k === 'actividades' ? `<span class="n">${acts.length}</span>` : k === 'stakeholders' ? `<span class="n">${sts.length}</span>` : k === 'riesgos' ? `<span class="n">${rs.length}</span>` : k === 'documentos' ? `<span class="n">${docs.length}</span>` : ''}</a>`).join('')}</nav>`;
    return head + this['tab_' + tab](p, { acts, sts, rs, gs, docs, bit });
  },
  tab_resumen(p, { acts, rs }) {
    const T = S.T; const crit = acts.filter(a => a.critica && a.avance < 100 && !a.es_hito).sort((a, b) => a.fecha_fin.localeCompare(b.fecha_fin)).slice(0, 6);
    const ex = lista('emap', p.id);
    const expost = (p.etapa === 6 || ex.length) ? card('Evaluación ex-post', 'Resultados reales vs. metas del caso de negocio', `${ex.length ? `<table class="tbl"><thead><tr><th>Indicador</th><th class="right">Meta</th><th class="right">Real</th><th>Cumplimiento</th><th></th></tr></thead><tbody>${ex.map(e => { const r = e.mayor_mejor ? e.real / e.meta : e.meta / e.real; return `<tr><td>${esc(e.kpi)}</td><td class="num right">${nf.format(e.meta)} <span class="faint small">${esc(e.unidad || '')}</span></td><td class="num right"><b>${nf.format(e.real)}</b></td><td style="min-width:140px"><div class="bar ${r >= 1 ? 'ok' : r >= .85 ? 'warn' : 'bad'}"><i style="width:${Math.min(100, r * 100)}%"></i></div><span class="small faint">${Math.round(r * 100)} %</span></td><td class="t-actions"><button class="btn sm ghost" data-act="editar-kpi" data-id="${e.id}">Editar</button><button class="btn sm ghost" data-act="borrar-kpi" data-id="${e.id}">✕</button></td></tr>`; }).join('')}</tbody></table>` : '<div class="empty">Define los indicadores de la evaluación ex-post.</div>'}<div class="mt"><button class="btn sm" data-act="nuevo-kpi" data-id="${p.id}">＋ Indicador</button></div>${p.decision_final ? `<div class="hint mt"><b>Decisión:</b> ${esc(p.decision_final)}</div>` : ''}${p.lecciones ? `<div class="mt"><b>Lecciones aprendidas</b><p class="muted">${esc(p.lecciones)}</p></div>` : ''}`, '', 'mt') : '';
    return `<div class="grid g-21">
      ${card('Ficha del proyecto', '', `<p style="margin-top:0">${esc(p.descripcion || 'Sin descripción')}</p><dl class="meta">${dl('Líder', esc(p.lider))}${dl('Patrocinador', esc(p.sponsor || '—'))}${dl('Inicio', fecha(p.fecha_inicio))}${dl('Fecha objetivo', fecha(p.fecha_objetivo))}${dl('Horizonte', HZ_NOMBRE[p.horizonte])}${dl('P. técnica / comercial', `${Math.round(p.p_tecnica * 100)} % / ${Math.round(p.p_comercial * 100)} %`)}${dl('Actividades', `${p.actividades_completas} de ${p.actividades_total} completas`)}${dl('Última actualización', p.actualizado ? fecha(p.actualizado) : '—')}</dl>
      ${p.salud_razones.length ? `<h3 style="margin:16px 0 4px">Motivos del estado «${SALUD[p.salud].txt}»</h3>${p.salud_razones.map(r => `<div class="reason">${esc(r)}</div>`).join('')}` : (p.estado === 'En curso' ? '<div class="hint mt">Sin desviaciones relevantes: el proyecto va según lo planeado.</div>' : '')}`)}
      ${card('Criterios de portafolio', `Score ${p.score}/100`, radar([p.s_estrategia, p.s_mercado, p.s_tecnica, p.s_capacidad, p.s_riesgo], ['Estrategia', 'Mercado', 'Técnica', 'Capacidad', 'Bajo riesgo']))}
    </div>
    <div class="grid g2 mt">
      ${card('Actividades críticas pendientes', 'Las que, si se retrasan, mueven la fecha final', crit.length ? `<table class="tbl"><tbody>${crit.map(a => `<tr class="clic" data-act="editar-act" data-id="${a.id}"><td>${esc(a.nombre)}<div class="small faint">${esc(a.responsable || '')} · vence ${fecha(a.fecha_fin)}</div></td><td class="right nowrap">${a.estado_calc === 'Atrasada' ? `<span class="chip bad">▲ ${a.dias_atraso} d</span>` : `<span class="chip">${a.avance} %</span>`}</td></tr>`).join('')}</tbody></table>` : '<div class="empty">Sin actividades críticas pendientes</div>', `<a class="btn sm ghost" href="#/proyecto/${p.id}/actividades">Ver Gantt</a>`)}
      ${card('Principales riesgos y restricciones', '', rs.filter(r => r.estado !== 'Cerrada').sort((a, b) => b.score - a.score).slice(0, 4).map(r => `<div style="padding:7px 0;border-bottom:1px solid var(--line)"><div class="row"><span class="chip ${r.score >= 20 ? 'bad' : r.score >= 15 ? 'warn' : ''}">${r.score}</span><b style="flex:1">${esc(r.titulo)}</b></div><div class="small muted">${esc(r.tipo)} · ${esc(r.estado)}</div></div>`).join('') || '<div class="empty">Sin riesgos registrados</div>', `<a class="btn sm ghost" href="#/proyecto/${p.id}/riesgos">Ver todos</a>`)}
    </div>${expost}`;
  },
  tab_actividades(p, { acts }) {
    const f = { etapa: a => a.etapa >= p.etapa - 0 && a.etapa <= p.etapa + 0, todas: () => true, criticas: a => a.critica && a.avance < 100, atrasadas: a => a.estado_calc === 'Atrasada' }[filtroAct] || (() => true);
    let vis = acts.filter(f); if (filtroAct === 'etapa') vis = acts.filter(a => a.etapa === p.etapa || a.etapa === p.etapa + 1);
    vis = [...vis].sort((a, b) => a.etapa - b.etapa || a.orden - b.orden);
    const chip = a => ({ Completada: '<span class="chip ok">Completada</span>', Atrasada: `<span class="chip bad">▲ Atrasada ${a.dias_atraso} d</span>`, 'En curso': '<span class="chip blue">En curso</span>', Bloqueada: '<span class="chip warn">Bloqueada</span>', Planificada: '<span class="chip">Planificada</span>' })[a.estado_calc];
    const seg = [['etapa', 'Etapa actual y siguiente'], ['todas', 'Todas'], ['criticas', 'Críticas pendientes'], ['atrasadas', 'Atrasadas']];
    return `<div class="row wrap mb"><div class="seg">${seg.map(([k, n]) => `<button class="${filtroAct === k ? 'on' : ''}" data-act="filtro-act" data-f="${k}">${n}</button>`).join('')}</div><div class="sp"></div><button class="btn" data-act="generar-plan" data-id="${p.id}">Generar plan de etapa</button><button class="btn primary" data-act="nueva-act" data-id="${p.id}">＋ Actividad</button></div>
    ${card('Cronograma con ruta crítica', 'Barras rojas = actividades sin holgura: cualquier atraso mueve la fecha final. Pulsa una barra para editarla.', gantt(vis, { hoy: S.T.hoy }))}
    <div class="grid mt">${card(`Actividades (${vis.length})`, '', `<div class="scroll"><table class="tbl"><thead><tr><th>Actividad</th><th>Responsable</th><th>Inicio</th><th>Fin</th><th style="min-width:150px">Avance</th><th>Estado</th><th class="right">Holgura</th><th></th></tr></thead><tbody>${vis.map(a => `<tr class="${a.avance >= 100 ? 'done' : ''}"><td>${a.es_hito ? '◆ ' : ''}${esc(a.nombre)}${a.critica && a.avance < 100 ? ' <span class="chip bad" title="En la ruta crítica">crítica</span>' : ''}${a.conflicto && a.conflicto.length ? ' <span class="chip warn" title="Inicia antes de que termine una predecesora">dependencia</span>' : ''}<div class="small faint">${ETAPA_CORTA[a.etapa]}</div></td><td class="small">${esc(a.responsable || '—')}</td><td class="nowrap small">${fechaCorta(a.fecha_inicio)}</td><td class="nowrap small">${fechaCorta(a.fecha_fin)}</td><td>${a.es_hito ? (a.avance >= 100 ? 'Decidido' : '—') : `<div class="row"><input type="range" class="avs" data-id="${a.id}" min="0" max="100" step="5" value="${a.avance}" style="padding:0" aria-label="Avance"><span class="small num" style="width:34px">${a.avance}%</span></div>`}</td><td>${chip(a)}</td><td class="num right small">${a.holgura == null ? '—' : a.holgura + ' d'}</td><td class="t-actions"><button class="btn sm ghost" data-act="editar-act" data-id="${a.id}">Editar</button></td></tr>`).join('') || '<tr><td colspan="8" class="empty">Sin actividades en este filtro</td></tr>'}</tbody></table></div>`)}</div>`;
  },
  tab_stakeholders(p, { sts }) {
    const items = sts.map(s => ({ poder: s.poder, interes: s.interes, postura: s.postura, label: s.nombre.length > 15 ? s.nombre.slice(0, 14).trim() + '…' : s.nombre, r: 10, tip: tip(s.nombre, `${esc(s.organizacion || '')} · ${esc(s.rol || '')}<br>Poder ${s.poder} · Interés ${s.interes} · ${s.postura}<br>Espera: ${esc(s.expectativa || '—')}`) }));
    return `<div class="row mb"><div class="sp"></div><button class="btn primary" data-act="nuevo-stake" data-id="${p.id}">＋ Parte interesada</button></div>
    <div class="grid g-21">${card('Mapa poder × interés', 'Estrategia: gestionar de cerca (alto-alto), mantener satisfecho (alto poder), informar (alto interés), monitorear', stakeGrid(items, { w: 640, h: 480 }))}
    ${card('Cómo gestionarlos', '', ['Gestionar de cerca', 'Mantener satisfecho', 'Mantener informado', 'Monitorear'].map(c => { const arr = sts.filter(s => s.cuadrante === c); return `<div style="margin-bottom:10px"><b>${c}</b> <span class="faint">(${arr.length})</span><div class="small muted">${arr.map(s => esc(s.nombre)).join(' · ') || '—'}</div></div>`; }).join(''))}</div>
    <div class="grid mt">${card('Registro de partes interesadas', '', `<div class="scroll"><table class="tbl"><thead><tr><th>Nombre</th><th>Organización / rol</th><th class="right">Poder</th><th class="right">Interés</th><th>Postura</th><th>Qué espera y cómo gestionarlo</th><th></th></tr></thead><tbody>${sts.map(s => `<tr><td><b>${esc(s.nombre)}</b></td><td class="small">${esc(s.organizacion || '')}<div class="faint">${esc(s.rol || '')}</div></td><td class="num right">${s.poder}</td><td class="num right">${s.interes}</td><td><span class="chip" style="background:color-mix(in srgb,var(--p-${({ Promotor: 'prom', Favorable: 'fav', Neutral: 'neu', Reticente: 'ret', Opositor: 'opo' })[s.postura]}) 28%,transparent)">${s.postura}</span></td><td class="small">${esc(s.expectativa || '')}<div class="muted">${esc(s.estrategia_comunicacion || '')}</div></td><td class="t-actions"><button class="btn sm ghost" data-act="editar-stake" data-id="${s.id}">Editar</button><button class="btn sm ghost" data-act="borrar-stake" data-id="${s.id}">✕</button></td></tr>`).join('') || '<tr><td colspan="7" class="empty">Aún no hay partes interesadas</td></tr>'}</tbody></table></div>`)}</div>`;
  },
  tab_riesgos(p, { rs }) {
    const ord = [...rs].sort((a, b) => b.score - a.score);
    return `<div class="row mb"><div class="sp"></div><button class="btn primary" data-act="nuevo-riesgo" data-id="${p.id}">＋ Restricción / riesgo</button></div>
    <div class="grid g-12">${card('Matriz del proyecto', 'Probabilidad × impacto', riskHeat(rs.filter(r => r.estado !== 'Cerrada')))}
    ${card('Registro', '', `<div class="scroll"><table class="tbl"><thead><tr><th>Tipo</th><th>Restricción / riesgo</th><th class="right">P×I</th><th>Estado</th><th>Mitigación</th><th></th></tr></thead><tbody>${ord.map(r => `<tr class="${r.estado === 'Cerrada' ? 'done' : ''}"><td class="small">${esc(r.tipo)}<div class="faint">${esc(r.origen)}</div></td><td><b>${esc(r.titulo)}</b><div class="small muted">${esc(r.descripcion || '')}</div></td><td class="num right"><span class="chip ${r.score >= 20 ? 'bad' : r.score >= 15 ? 'warn' : ''}">${r.probabilidad}×${r.impacto}=${r.score}</span></td><td class="small">${esc(r.estado)}<div class="faint">${esc(r.responsable || '')}</div></td><td class="small">${r.mitigacion ? esc(r.mitigacion) : '<span style="color:var(--crit-t)">Sin plan</span>'}</td><td class="t-actions"><button class="btn sm ghost" data-act="editar-riesgo" data-id="${r.id}">Editar</button><button class="btn sm ghost" data-act="borrar-riesgo" data-id="${r.id}">✕</button></td></tr>`).join('') || '<tr><td colspan="6" class="empty">Sin registros</td></tr>'}</tbody></table></div>`)}</div>`;
  },
  tab_gates(p, { gs }) {
    const dias = []; let prev = p.fecha_inicio; const entradas = gs.filter(g => g.decision.startsWith('Go') && g.etapa_destino > g.etapa_origen);
    for (const g of entradas) { dias.push({ label: ETAPAS[g.etapa_origen], value: Math.round((Date.parse(g.fecha) - Date.parse(prev)) / 86400000), color: stageColor(g.etapa_origen) }); prev = g.fecha; }
    if (p.estado === 'En curso') dias.push({ label: ETAPAS[p.etapa] + ' (en curso)', value: p.dias_en_etapa, color: stageColor(p.etapa) });
    return `<div class="grid g-12">${card('Historial de decisiones', 'Trazabilidad de cada gate', `<div class="tl">${[...gs].reverse().map(g => `<div class="it ${g.decision === 'Go con condiciones' ? 'cond' : g.decision}"><div class="row"><b>${esc(g.decision)}</b><span class="faint small">${fecha(g.fecha)}</span></div><div class="small">${esc(ETAPAS[g.etapa_origen])}${g.etapa_destino !== g.etapa_origen ? ' → ' + esc(ETAPAS[g.etapa_destino]) : ' (se repite)'}</div><div class="small muted">${esc(g.comentario || '')} ${g.decidido_por ? `· <i>${esc(g.decidido_por)}</i>` : ''}</div></div>`).join('') || '<div class="empty">Sin decisiones registradas</div>'}</div>`, `<button class="btn sm primary" data-act="registrar-gate" data-id="${p.id}">◆ Registrar</button>`)}
    ${card('Días por etapa', 'Duración real de cada etapa', dias.length ? hbars(dias, { fmt: v => v + ' d' }) : '<div class="empty">Aún no hay etapas completadas</div>')}</div>`;
  },
  tab_documentos(p, { docs }) {
    return `<div class="grid g-12">${card('Subir avances', 'Correos (.eml), reportes de ensayo (.docx, .pdf), presentaciones (.pptx), hojas (.xlsx), capturas (.png/.jpg) o texto. La IA propone qué actualizar y tú apruebas.', dropzoneHTML(p.id))}${card('Documentos del proyecto', '', listaDocs(docs))}</div>`;
  },
  tab_bitacora(p, { bit }) {
    const ob = { ia: '<span class="chip blue">IA</span>', manual: '<span class="chip">Manual</span>', sistema: '<span class="chip line">Sistema</span>' };
    return card('Bitácora de cambios', 'Quién o qué modificó la información del proyecto', `<div class="scroll"><table class="tbl"><thead><tr><th>Fecha</th><th>Acción</th><th>Detalle</th><th>Origen</th></tr></thead><tbody>${bit.map(b => `<tr><td class="nowrap small">${fecha(b.fecha)}</td><td><b>${esc(b.accion)}</b></td><td class="small">${esc(b.detalle || '')}</td><td>${ob[b.origen] || esc(b.origen)}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">Sin movimientos</td></tr>'}</tbody></table></div>`);
  },
  mount(root) {
    $$('.avs', root).forEach(r => { r.oninput = () => { r.nextElementSibling.textContent = r.value + '%'; }; r.onchange = async () => { await hacer(() => api('PUT', '/api/actividades/' + r.dataset.id, { avance: +r.value }), 'Avance actualizado'); rerender(); }; });
  }
};


// ================= FICHA TÉCNICA IMPRIMIBLE =================
export const ficha = {
  render({ id }) {
    const T = S.T, p = T.pmap.get(+id); if (!p) return '<div class="empty">Proyecto no encontrado.</div>';
    const acts = lista('amap', p.id), sts = lista('smap', p.id), rs = lista('rmap', p.id), gs = lista('gmap', p.id), ex = lista('emap', p.id);
    const vis = acts.filter(a => a.etapa === p.etapa || a.etapa === p.etapa + 1).sort((a, b) => a.etapa - b.etapa || a.orden - b.orden);
    const k = (l, v, d = '') => `<div class="kpi"><div class="l">${l}</div><div class="v" style="font-size:21px">${v}</div><div class="d">${d}</div></div>`;
    const t = (cab, filas) => `<table class="tbl"><thead><tr>${cab.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${filas.join('') || `<tr><td colspan="${cab.length}" class="faint">Sin registros</td></tr>`}</tbody></table>`;
    return `<div class="ficha">
    <div class="row noprint mb"><a class="btn" href="#/proyecto/${p.id}">← Volver al proyecto</a><span class="sp"></span><button class="btn primary" data-act="imprimir">Imprimir / guardar PDF</button></div>
    <header class="ficha-top"><img src="img/sigra-logo.png" alt="SIGRA"><div><div class="kicker">Ficha técnica de proyecto · I+D+i</div><h1 style="font-size:26px;margin-top:2px">${esc(p.nombre)}</h1><div class="small muted">${esc(p.descripcion || '')}</div></div>
      <div class="meta2">CÓDIGO ${esc(p.codigo)}<br>ETAPA ${esc(ETAPAS[p.etapa].toUpperCase())}<br>ESTADO ${esc(p.estado.toUpperCase())}<br>CORTE ${T.hoy}</div></header>
    ${chevrons(p.etapa, p.estado === 'Cerrado')}
    <div class="kpis" style="margin-top:14px">${k('Avance global', val(p.avance, '%'), `Etapa actual ${p.avance_etapa} %`)}${k('Ejecución', val(p.ejecucion_pct, '%'), `${money(p.ejecutado)} de ${money(p.presupuesto)}`)}${k('rVPN', val(mill(p.rvpn), 'COP M'), `VPN ${mill(p.vpn_esperado)} × ${Math.round(p.p_exito * 100)} %`)}${k('Madurez', val(p.trl, 'TRL'), trlBar(p.trl))}${k('Próximo gate', p.proximo_gate ? relDias(p.dias_gate) : '—', p.proximo_gate ? fecha(p.proximo_gate) : '')}${k('Score', val(p.score, '/100'), '')}</div>
    <h2 class="sec">1 · Identificación</h2>
    <dl class="meta">${[['Línea de negocio', p.linea], ['Tipo de innovación', p.tipo_innovacion], ['Horizonte', HZ_NOMBRE[p.horizonte]], ['Líder', p.lider], ['Patrocinador', p.sponsor], ['Inicio', fecha(p.fecha_inicio)], ['Fecha objetivo', fecha(p.fecha_objetivo)], ['P. técnica / comercial', `${Math.round(p.p_tecnica * 100)} % / ${Math.round(p.p_comercial * 100)} %`]].map(([a, b]) => `<div><dt>${a}</dt><dd>${esc(b || '—')}</dd></div>`).join('')}</dl>
    <h2 class="sec">2 · Estado y salud</h2>
    <div class="row wrap gap-s">${p.estado === 'En curso' ? chipSalud(p.salud) : `<span class="chip">${esc(p.estado)}</span>`}<span class="small muted">${p.salud_razones.length ? esc(p.salud_razones.join(' · ')) : 'Sin desviaciones relevantes.'}</span></div>
    <h2 class="sec">3 · Cronograma de la etapa actual y la siguiente (ruta crítica en rojo)</h2>
    ${gantt(vis, { hoy: T.hoy })}
    <h2 class="sec">4 · Partes interesadas</h2>
    ${t(['Nombre', 'Organización', 'Poder', 'Interés', 'Postura', 'Estrategia'], sts.map(s => `<tr><td><b>${esc(s.nombre)}</b></td><td class="small">${esc(s.organizacion || '')}</td><td class="num">${s.poder}</td><td class="num">${s.interes}</td><td>${esc(s.postura)}</td><td class="small">${esc(s.estrategia_comunicacion || s.cuadrante)}</td></tr>`))}
    <h2 class="sec">5 · Riesgos y limitaciones externas</h2>
    ${t(['Tipo', 'Restricción / riesgo', 'P×I', 'Estado', 'Mitigación'], [...rs].sort((a, b) => b.score - a.score).map(r => `<tr><td class="small">${esc(r.tipo)}</td><td>${esc(r.titulo)}</td><td class="num">${r.probabilidad}×${r.impacto}=${r.score}</td><td class="small">${esc(r.estado)}</td><td class="small">${esc(r.mitigacion || 'Sin plan')}</td></tr>`))}
    <h2 class="sec">6 · Historial de gates</h2>
    ${t(['Fecha', 'Decisión', 'Transición', 'Fundamento', 'Decidido por'], gs.map(g => `<tr><td class="num">${fecha(g.fecha)}</td><td><b>${esc(g.decision)}</b></td><td class="small">${esc(ETAPAS[g.etapa_origen])}${g.etapa_destino !== g.etapa_origen ? ' → ' + esc(ETAPAS[g.etapa_destino]) : ''}</td><td class="small">${esc(g.comentario || '')}</td><td class="small">${esc(g.decidido_por || '')}</td></tr>`))}
    ${ex.length ? `<h2 class="sec">7 · Evaluación ex-post</h2>${t(['Indicador', 'Meta', 'Real', 'Cumplimiento'], ex.map(e => { const r = e.mayor_mejor ? e.real / e.meta : e.meta / e.real; return `<tr><td>${esc(e.kpi)}</td><td class="num">${nf.format(e.meta)} ${esc(e.unidad || '')}</td><td class="num">${nf.format(e.real)}</td><td><span class="chip ${r >= 1 ? 'ok' : r >= .85 ? 'warn' : 'bad'}">${Math.round(r * 100)} %</span></td></tr>`; }))}${p.decision_final ? `<p><b>Decisión:</b> ${esc(p.decision_final)}</p>` : ''}${p.lecciones ? `<p class="muted">${esc(p.lecciones)}</p>` : ''}` : ''}
    <div class="docnote"><span class="mono">SIGRA · I+D+i</span> Ficha generada por la app de trazabilidad · ${fecha(T.hoy)}<span class="sp"></span><span class="mono">Calidad · Innovación · Sostenibilidad · Transparencia</span></div></div>`;
  }
};
