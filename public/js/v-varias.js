import { S, A, esc, attr, money, nf, fecha, relDias, ETAPAS, ETAPA_CORTA, HZ_COLOR, HZ_NOMBRE, stageColor, chipSalud, SALUD, api, hacer, toast, modal, formModal, confirmar, descargar, cargar, sel, $, $$, iniciales } from './core.js';
import { hbars, donut, legend, bubbleMap, portfolioTimeline, matrizEtapaLinea, riskHeat, stakeGrid, tip, trlBar } from './viz.js';
import { card, pageHead, alertasHTML } from './v-tablero.js';

const DECISIONES = [['Go', 'Go — avanzar a la siguiente etapa'], ['Go con condiciones', 'Go con condiciones'], ['Reciclar', 'Reciclar — repetir trabajo de la etapa'], ['Pausar', 'Pausar el proyecto'], ['Detener', 'Detener (Kill) — cancelar el proyecto']];

async function registrarGate(pid, decisionDef) {
  const p = S.T.pmap.get(+pid);
  const campos = [{ k: 'decision', label: 'Decisión del gate', t: 'select', opts: DECISIONES, def: decisionDef, full: true }, { k: 'comentario', label: 'Fundamento / condiciones', t: 'textarea', full: true, hint: 'Qué evidencia respalda la decisión y qué condiciones deben cumplirse.' }, { k: 'decidido_por', label: 'Decidido por', def: p.sponsor || '', full: true }];
  const info = `<div class="hint" style="margin-bottom:12px"><b>${esc(p.codigo)} · ${esc(p.nombre)}</b><br>Etapa actual: <b>${ETAPAS[p.etapa]}</b>${p.etapa < 6 ? ' → ' + ETAPAS[p.etapa + 1] : ' → cierre'}<br>Avance de la etapa: ${p.avance_etapa} % · Salud: ${SALUD[p.salud].txt}${p.salud_razones.length ? '<br>⚠ ' + p.salud_razones.map(esc).join(' · ') : ''}</div>`;
  const { campo, leerForm } = await import('./core.js');
  const r = await modal({ titulo: 'Registrar decisión de gate', ancho: 600, cuerpo: info + `<form class="grid-form" onsubmit="return false">${campos.map(c => campo(c, {})).join('')}</form>`, acciones: [{ txt: 'Cancelar', fn: () => null }, { txt: 'Registrar decisión', cls: 'primary', fn: bg => leerForm(bg.querySelector('form'), campos) }] });
  if (!r) return;
  await hacer(() => api('POST', `/api/proyectos/${p.id}/gate`, r), 'Decisión registrada');
  document.dispatchEvent(new CustomEvent('rerender'));
}
A['registrar-gate'] = el => registrarGate(el.dataset.id, el.dataset.dec || 'Go');

// ================= PIPELINE (kanban) =================
export const pipeline = {
  render() {
    const T = S.T; let ver = sessionStorage.getItem('pipe_ver') || 'activos';
    const ps = T.proyectos.filter(p => ver === 'todos' || p.estado === 'En curso' || p.estado === 'En pausa');
    const cols = ETAPAS.map((e, i) => { const arr = ps.filter(p => p.etapa === i); return `<div class="kcol" data-etapa="${i}"><header><b class="dot" style="background:${stageColor(i)}"></b><b>${e}</b><span class="cnt">${arr.length}</span></header><div class="sum">${money(arr.reduce((s, p) => s + p.presupuesto, 0))} · rVPN ${money(arr.reduce((s, p) => s + p.rvpn, 0))}</div>${arr.map(p => `<div class="kcard ${p.salud}" draggable="true" data-id="${p.id}" data-href="#/proyecto/${p.id}"><div class="cd">${esc(p.codigo)} ${p.estado !== 'En curso' ? `<span class="chip" style="margin-left:4px">${esc(p.estado)}</span>` : ''}</div><div class="nm">${esc(p.nombre)}</div><div class="bar ${p.salud === 'rojo' ? 'bad' : p.salud === 'amarillo' ? 'warn' : ''}" data-tip="${tip('Avance de la etapa ' + p.avance_etapa + ' %', 'Avance global ' + p.avance + ' %')}"><i style="width:${p.avance_etapa}%"></i></div><div class="mt2"><span title="Líder">👤 ${esc(iniciales(p.lider))}</span><span>TRL ${p.trl}</span><span>${p.horizonte}</span>${p.proximo_gate ? `<span class="chip ${p.dias_gate < 0 ? 'bad' : p.dias_gate <= 14 ? 'warn' : ''}" title="Próximo gate">◆ ${relDias(p.dias_gate)}</span>` : ''}</div></div>`).join('') || '<div class="faint small" style="padding:8px">Sin proyectos</div>'}</div>`; }).join('');
    return `${pageHead('Pipeline Stage-Gate', 'Arrastra una tarjeta a otra columna para registrar la decisión del gate. El borde indica la salud del proyecto.', `<div class="seg" id="pv"><button data-v="activos" class="${ver === 'activos' ? 'on' : ''}">Activos y pausados</button><button data-v="todos" class="${ver === 'todos' ? 'on' : ''}">Todos</button></div><button class="btn primary" data-act="nuevo-proyecto">＋ Nuevo proyecto</button>`)}<div class="kanban">${cols}</div>`;
  },
  mount(root) {
    $$('#pv button', root).forEach(b => b.onclick = () => { sessionStorage.setItem('pipe_ver', b.dataset.v); document.dispatchEvent(new CustomEvent('rerender')); });
    let drag = null;
    $$('.kcard', root).forEach(c => { c.ondragstart = e => { drag = c.dataset.id; c.classList.add('dragging'); e.dataTransfer.setData('text/plain', drag); }; c.ondragend = () => c.classList.remove('dragging'); });
    $$('.kcol', root).forEach(col => {
      col.ondragover = e => { e.preventDefault(); col.classList.add('over'); }; col.ondragleave = () => col.classList.remove('over');
      col.ondrop = e => { e.preventDefault(); col.classList.remove('over'); const p = S.T.pmap.get(+drag); if (!p) return; const dest = +col.dataset.etapa;
        if (dest === p.etapa) return registrarGate(p.id, 'Reciclar');
        if (dest === p.etapa + 1) return registrarGate(p.id, 'Go');
        toast('Los proyectos avanzan una etapa a la vez. Registra primero la decisión del gate de la etapa actual.', 'bad'); };
    });
  }
};

// ================= PORTAFOLIO =================
export const portafolio = {
  render() {
    const T = S.T; const todos = sessionStorage.getItem('port_ver') === 'todos'; const ps = T.proyectos.filter(p => todos || p.estado === 'En curso');
    const filas = [...ps].sort((a, b) => b.score - a.score).map((p, i) => `<tr class="clic" data-href="#/proyecto/${p.id}"><td class="faint">${i + 1}</td><td><b>${esc(p.codigo)}</b> ${esc(p.nombre)}</td><td><span class="chip line" style="border-color:${stageColor(p.etapa)}">${ETAPA_CORTA[p.etapa]}</span></td><td><span class="chip" style="background:color-mix(in srgb,${HZ_COLOR[p.horizonte]} 18%,transparent)">${p.horizonte}</span></td><td class="small">${esc(p.tipo_innovacion)}</td><td class="num right">${p.trl}</td><td class="num right">${Math.round(p.p_exito * 100)} %</td><td class="num right">${money(p.vpn_esperado)}</td><td class="num right"><b>${money(p.rvpn)}</b></td><td class="num right">${money(p.presupuesto)}</td><td style="min-width:90px"><div class="bar ${p.ejecucion_pct > 100 ? 'bad' : ''}"><i style="width:${Math.min(100, p.ejecucion_pct)}%"></i></div><span class="small faint">${p.ejecucion_pct} %</span></td><td style="min-width:90px"><div class="bar ok"><i style="width:${p.score}%;background:${HZ_COLOR[p.horizonte]}"></i></div><span class="small faint">${p.score}</span></td><td>${chipSalud(p.salud)}</td></tr>`).join('');
    const tipos = ['Incremental', 'Adyacente', 'Disruptiva'].map((t, i) => ({ label: t, value: ps.filter(p => p.tipo_innovacion === t).reduce((s, p) => s + p.presupuesto, 0), n: ps.filter(p => p.tipo_innovacion === t).length, color: ['var(--s1)', 'var(--s2)', 'var(--s3)'][i] })); tipos.forEach(t => t.txt = money(t.value));
    const lineas = [...new Set(ps.map(p => p.linea || 'Sin línea'))].map(l => ({ label: l, value: ps.filter(p => (p.linea || 'Sin línea') === l).reduce((s, p) => s + p.presupuesto, 0), txt: '', color: 'var(--s1)' })).sort((a, b) => b.value - a.value); lineas.forEach(l => l.txt = money(l.value));
    return `${pageHead('Portafolio de innovación', 'Balance de riesgo y retorno, mezcla de horizontes y priorización', `<div class="seg" id="pv"><button data-v="activos" class="${!todos ? 'on' : ''}">Solo activos</button><button data-v="todos" class="${todos ? 'on' : ''}">Todos</button></div>`)}
    <div class="grid g-21">
      ${card('Mapa de burbujas (Cooper)', 'Cuadrante superior derecho = proyectos con alto valor y alta probabilidad de éxito', bubbleMap(ps, { w: 860, h: 470 }) + legend(['H1', 'H2', 'H3'].map(h => ({ color: HZ_COLOR[h], label: HZ_NOMBRE[h] }))))}
      <div class="grid">
        ${card('Mezcla por tipo de innovación', 'Inversión presupuestada', `<div class="row" style="gap:16px">${donut(tipos, { size: 150, centro: String(ps.length), sub: 'proyectos' })}<div style="flex:1">${tipos.map(t => `<div style="margin:6px 0"><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${t.color}"></span> <b>${t.label}</b> <span class="faint">(${t.n})</span><div class="small muted">${t.txt}</div></div>`).join('')}</div></div>`)}
        ${card('Inversión por línea de negocio', '', hbars(lineas))}
      </div>
    </div>
    <div class="grid mt">${card('Etapa × línea de negocio', 'Cantidad de proyectos; pasa el cursor para ver cuáles', matrizEtapaLinea(ps))}</div>
    <div class="grid mt">${card('Priorización del portafolio', 'Score = estrategia 25 % · mercado 20 % · técnica 20 % · capacidad 15 % · riesgo 20 % (editable en cada proyecto)', `<div class="scroll"><table class="tbl"><thead><tr><th>#</th><th>Proyecto</th><th>Etapa</th><th>Hor.</th><th>Tipo</th><th class="right">TRL</th><th class="right">P(éxito)</th><th class="right">VPN</th><th class="right">rVPN</th><th class="right">Presupuesto</th><th>Ejecución</th><th>Score</th><th>Salud</th></tr></thead><tbody>${filas}</tbody></table></div>`)}</div>`;
  },
  mount(root) { $$('#pv button', root).forEach(b => b.onclick = () => { sessionStorage.setItem('port_ver', b.dataset.v); document.dispatchEvent(new CustomEvent('rerender')); }); }
};

// ================= CRONOGRAMA =================
export const cronograma = {
  render() {
    const T = S.T; const todos = sessionStorage.getItem('cron_ver') === 'todos'; const ps = T.proyectos.filter(p => todos || p.estado !== 'Cerrado').sort((a, b) => a.etapa - b.etapa || a.fecha_inicio.localeCompare(b.fecha_inicio));
    return `${pageHead('Cronograma del portafolio', 'Recorrido por etapas de cada proyecto, próximo gate (◆) y fecha objetivo (círculo)', `<div class="seg" id="pv"><button data-v="activos" class="${!todos ? 'on' : ''}">Sin cerrados</button><button data-v="todos" class="${todos ? 'on' : ''}">Todos</button></div>`)}
    ${card('Línea de tiempo por etapas', 'Cada barra pasa por las etapas ya recorridas; la línea punteada es el trayecto pendiente hasta la fecha objetivo', portfolioTimeline(ps, T.gmap, T.hoy))}`;
  },
  mount(root) { $$('#pv button', root).forEach(b => b.onclick = () => { sessionStorage.setItem('cron_ver', b.dataset.v); document.dispatchEvent(new CustomEvent('rerender')); }); }
};

// ================= LISTA DE PROYECTOS =================
export const proyectos = {
  filtros: { q: '', etapa: '', estado: '', salud: '', lider: '' },
  render() {
    const T = S.T, f = this.filtros; const lideres = [...new Set(T.proyectos.map(p => p.lider))].sort();
    const ps = T.proyectos.filter(p => (!f.q || (p.codigo + p.nombre + (p.descripcion || '') + (p.linea || '')).toLowerCase().includes(f.q.toLowerCase())) && (f.etapa === '' || p.etapa === +f.etapa) && (!f.estado || p.estado === f.estado) && (!f.salud || p.salud === f.salud) && (!f.lider || p.lider === f.lider));
    const o = (arr, v) => arr.map(x => { const [a, b] = Array.isArray(x) ? x : [x, x]; return `<option value="${attr(a)}" ${String(a) === String(v) ? 'selected' : ''}>${esc(b)}</option>`; }).join('');
    return `${pageHead('Proyectos', `${ps.length} de ${T.proyectos.length} proyectos`, `<button class="btn" data-act="exportar-csv">⬇ CSV</button><button class="btn primary" data-act="nuevo-proyecto">＋ Nuevo proyecto</button>`)}
    <div class="card"><div class="row wrap mb" id="flt"><input type="search" id="fq" placeholder="Buscar por código, nombre o línea…" value="${attr(f.q)}" style="max-width:280px"><select id="fe" style="max-width:170px"><option value="">Todas las etapas</option>${o(ETAPAS.map((e, i) => [i, e]), f.etapa)}</select><select id="fs" style="max-width:150px"><option value="">Todos los estados</option>${o(['En curso', 'En pausa', 'Cancelado', 'Cerrado'], f.estado)}</select><select id="fh" style="max-width:150px"><option value="">Toda salud</option>${o([['verde', 'En ruta'], ['amarillo', 'Atención'], ['rojo', 'En riesgo']], f.salud)}</select><select id="fl" style="max-width:170px"><option value="">Todos los líderes</option>${o(lideres, f.lider)}</select></div>
    <div class="scroll"><table class="tbl" id="tp"><thead><tr><th>Código</th><th>Proyecto</th><th>Etapa</th><th>Líder</th><th>Avance</th><th>Próx. gate</th><th class="right">Presupuesto</th><th>Salud</th></tr></thead><tbody>${ps.map(p => `<tr class="clic" data-href="#/proyecto/${p.id}"><td><b>${esc(p.codigo)}</b></td><td>${esc(p.nombre)}<div class="small faint">${esc(p.linea || '')} · ${esc(p.tipo_innovacion)} · ${p.horizonte}</div></td><td><span class="chip line" style="border-color:${stageColor(p.etapa)}">${esc(ETAPAS[p.etapa])}</span></td><td>${esc(p.lider)}</td><td style="min-width:110px"><div class="bar"><i style="width:${p.avance}%"></i></div><span class="small faint">${p.avance} %</span></td><td class="nowrap">${p.proximo_gate ? `${fecha(p.proximo_gate)} <span class="chip ${p.dias_gate < 0 ? 'bad' : ''}">${relDias(p.dias_gate)}</span>` : '—'}</td><td class="num right">${money(p.presupuesto)}</td><td>${chipSalud(p.salud)}</td></tr>`).join('') || '<tr><td colspan="8" class="empty">Sin resultados</td></tr>'}</tbody></table></div></div>`;
  },
  mount(root) {
    const f = this.filtros; const re = () => document.dispatchEvent(new CustomEvent('rerender'));
    const map = { fq: 'q', fe: 'etapa', fs: 'estado', fh: 'salud', fl: 'lider' };
    for (const [id, k] of Object.entries(map)) { const el = $('#' + id, root); el.oninput = el.onchange = () => { f[k] = el.value; if (id === 'fq') { clearTimeout(this._t); this._t = setTimeout(() => { re(); const n = $('#fq'); n.focus(); n.setSelectionRange(99, 99); }, 200); } else re(); }; }
  }
};
A['exportar-csv'] = () => {
  const T = S.T; const cab = ['Código', 'Nombre', 'Etapa', 'Estado', 'Líder', 'Línea', 'Tipo', 'Horizonte', 'TRL', 'Avance %', 'Presupuesto', 'Ejecutado', 'VPN', 'P(éxito)', 'rVPN', 'Score', 'Salud', 'Próximo gate'];
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  descargar('proyectos-idi.csv', '﻿' + [cab.map(q).join(';'), ...T.proyectos.map(p => [p.codigo, p.nombre, ETAPAS[p.etapa], p.estado, p.lider, p.linea, p.tipo_innovacion, p.horizonte, p.trl, p.avance, p.presupuesto, p.ejecutado, p.vpn_esperado, p.p_exito, p.rvpn, p.score, p.salud, p.proximo_gate || ''].map(q).join(';'))].join('\n'), 'text/csv;charset=utf-8');
};

// ================= ALERTAS =================
export const alertas = {
  render() {
    const T = S.T; const niv = { critica: 'Críticas', alta: 'Altas', media: 'Medias' };
    return `${pageHead('Alertas', `${T.alertas.length} alertas activas, calculadas a partir de cronogramas, gates, riesgos, stakeholders y presupuesto`)}
    <div class="grid g3">${Object.entries(niv).map(([k, n]) => card(`${n} <span class="chip ${k === 'critica' ? 'bad' : k === 'alta' ? 'warn' : ''}">${T.alertas.filter(a => a.nivel === k).length}</span>`, '', alertasHTML(T.alertas.filter(a => a.nivel === k), { max: 40, ver: false }))).join('')}</div>`;
  }
};

// ================= EQUIPO =================
export const equipo = {
  render() {
    const T = S.T; const by = new Map(T.personas.map(p => [p.nombre, { p, abiertas: 0, atr: 0, proyectos: new Set(), lidera: [] }]));
    for (const a of T.actividades) { const pr = T.pmap.get(a.proyecto_id); if (!pr || pr.estado !== 'En curso' || a.avance >= 100 || a.es_hito) continue; const e = by.get(a.responsable) || by.set(a.responsable, { p: { nombre: a.responsable, rol: 'Sin registrar', area: '' }, abiertas: 0, atr: 0, proyectos: new Set(), lidera: [] }).get(a.responsable); e.abiertas++; if (a.estado_calc === 'Atrasada') e.atr++; e.proyectos.add(pr.codigo); }
    for (const p of T.activos) { const e = by.get(p.lider); if (e) e.lidera.push(p.codigo); }
    const arr = [...by.values()].filter(e => e.abiertas || e.lidera.length).sort((a, b) => b.abiertas - a.abiertas); const mx = Math.max(1, ...arr.map(e => e.abiertas));
    return `${pageHead('Equipo y carga de trabajo', 'Actividades abiertas por responsable en proyectos activos', `<button class="btn primary" data-act="nueva-persona">＋ Agregar persona</button>`)}
    <div class="grid g-12">${card('Carga actual', 'Barras: abiertas (azul) y atrasadas (rojo)', `<div class="hbars">${arr.map(e => `<div class="hb" style="grid-template-columns:150px 1fr 80px" data-tip="${tip(e.p.nombre, `${e.abiertas} abiertas · ${e.atr} atrasadas · ${e.proyectos.size} proyecto(s)`)}"><div class="lb">${esc(e.p.nombre)}</div><div class="tr" style="display:flex"><i style="width:${100 * (e.abiertas - e.atr) / mx}%;background:var(--s1);border-radius:0"></i><i style="width:${100 * e.atr / mx}%;background:var(--crit);border-radius:0 4px 4px 0"></i></div><div class="vl">${e.abiertas}${e.atr ? ` <span style="color:var(--crit-t)">(${e.atr}▲)</span>` : ''}</div></div>`).join('')}</div>`)}
    ${card('Personas', '', `<table class="tbl"><thead><tr><th>Nombre</th><th>Rol</th><th>Lidera</th><th></th></tr></thead><tbody>${T.personas.map(p => `<tr><td><b>${esc(p.nombre)}</b></td><td>${esc(p.rol || '')}<div class="small faint">${esc(p.area || '')}</div></td><td class="small">${esc((by.get(p.nombre)?.lidera || []).join(', ')) || '—'}</td><td class="t-actions"><button class="btn sm ghost" data-act="editar-persona" data-id="${p.id}">Editar</button><button class="btn sm ghost" data-act="borrar-persona" data-id="${p.id}">✕</button></td></tr>`).join('')}</tbody></table>`)}</div>`;
  }
};
const camposPersona = [{ k: 'nombre', label: 'Nombre', req: true, full: true }, { k: 'rol', label: 'Rol' }, { k: 'area', label: 'Área' }];
A['nueva-persona'] = async () => { const v = await formModal({ titulo: 'Agregar persona', campos: camposPersona }); if (v) { await hacer(() => api('POST', '/api/personas', v), 'Persona agregada'); document.dispatchEvent(new CustomEvent('rerender')); } };
A['editar-persona'] = async el => { const p = S.T.personas.find(x => x.id === +el.dataset.id); const v = await formModal({ titulo: 'Editar persona', campos: camposPersona, valores: p }); if (v) { await hacer(() => api('PUT', '/api/personas/' + p.id, v), 'Guardado'); document.dispatchEvent(new CustomEvent('rerender')); } };
A['borrar-persona'] = async el => { if (await confirmar('¿Eliminar a esta persona del equipo? Las actividades asignadas conservan el nombre.', 'Eliminar', true)) { await hacer(() => api('DELETE', '/api/personas/' + el.dataset.id), 'Eliminada'); document.dispatchEvent(new CustomEvent('rerender')); } };

// ================= STAKEHOLDERS (portafolio) =================
export const stakeholders = {
  render() {
    const T = S.T; const act = new Set(T.activos.map(p => p.id)); const g = new Map();
    for (const s of T.stakeholders) { if (!act.has(s.proyecto_id)) continue; const k = (s.organizacion || s.nombre).trim(); const e = g.get(k) || { k, nombres: new Set(), proyectos: new Set(), poder: 0, interes: 0, n: 0, posturas: {} }; e.nombres.add(s.nombre); e.proyectos.add(s.proyecto_id); e.poder += s.poder; e.interes += s.interes; e.n++; e.posturas[s.postura] = (e.posturas[s.postura] || 0) + 1; g.set(k, e); }
    const orden = ['Opositor', 'Reticente', 'Neutral', 'Favorable', 'Promotor'];
    const arr = [...g.values()].map(e => ({ ...e, poder: Math.round(e.poder / e.n), interes: Math.round(e.interes / e.n), postura: orden.find(p => e.posturas[p]) })).sort((a, b) => b.poder - a.poder || b.proyectos.size - a.proyectos.size);
    const items = arr.map(e => ({ poder: e.poder, interes: e.interes, postura: e.postura, n: e.proyectos.size, r: 9 + Math.min(8, e.proyectos.size * 1.6), tip: tip(e.k, `${e.proyectos.size} proyecto(s) · poder ${e.poder} · interés ${e.interes}<br>Postura más crítica: ${e.postura}<br>${esc([...e.nombres].slice(0, 3).join(', '))}`) }));
    const crit = arr.filter(e => e.poder >= 4 && ['Opositor', 'Reticente'].includes(e.postura));
    return `${pageHead('Mapa de partes interesadas', 'Organizaciones que influyen en varios proyectos activos (el número dentro de la burbuja = proyectos en los que participa)')}
    <div class="grid g-21">${card('Poder × interés', 'Color = postura más crítica registrada; promedio de poder e interés entre proyectos', stakeGrid(items, { w: 640, h: 500, etiquetas: false }))}
    <div class="grid">${card('Requieren estrategia', 'Alto poder y postura reticente u opositora', crit.length ? crit.map(e => `<div style="padding:8px 0;border-bottom:1px solid var(--line)"><b>${esc(e.k)}</b> <span class="chip ${e.postura === 'Opositor' ? 'bad' : 'warn'}">${e.postura}</span><div class="small muted">${e.proyectos.size} proyecto(s) · poder ${e.poder} · interés ${e.interes}</div></div>`).join('') : '<div class="empty">Sin organizaciones críticas.</div>')}</div></div>
    <div class="grid mt">${card('Registro consolidado', `${arr.length} organizaciones`, `<div class="scroll"><table class="tbl"><thead><tr><th>Organización</th><th>Personas</th><th class="right">Proyectos</th><th class="right">Poder</th><th class="right">Interés</th><th>Postura</th><th>Cuadrante</th></tr></thead><tbody>${arr.map(e => `<tr><td><b>${esc(e.k)}</b></td><td class="small">${esc([...e.nombres].slice(0, 2).join(', '))}</td><td class="num right">${e.proyectos.size}</td><td class="num right">${e.poder}</td><td class="num right">${e.interes}</td><td><span class="chip" style="background:color-mix(in srgb,${({ Promotor: 'var(--p-prom)', Favorable: 'var(--p-fav)', Neutral: 'var(--p-neu)', Reticente: 'var(--p-ret)', Opositor: 'var(--p-opo)' })[e.postura]} 25%,transparent)">${e.postura}</span></td><td class="small">${e.poder >= 4 && e.interes >= 4 ? 'Gestionar de cerca' : e.poder >= 4 ? 'Mantener satisfecho' : e.interes >= 4 ? 'Mantener informado' : 'Monitorear'}</td></tr>`).join('')}</tbody></table></div>`)}</div>`;
  }
};

// ================= RIESGOS Y RESTRICCIONES (portafolio) =================
export const riesgos = {
  sel: null, tipo: '',
  render() {
    const T = S.T; const act = new Set(T.activos.map(p => p.id)); let rs = T.restricciones.filter(r => act.has(r.proyecto_id) && r.estado !== 'Cerrada');
    const tipos = [...new Set(rs.map(r => r.tipo))].sort(); const base = rs;
    if (this.tipo) rs = rs.filter(r => r.tipo === this.tipo); const heat = rs; if (this.sel) rs = rs.filter(r => r.probabilidad === this.sel[0] && r.impacto === this.sel[1]);
    rs = [...rs].sort((a, b) => b.score - a.score);
    const porTipo = tipos.map(t => { const x = base.filter(r => r.tipo === t); return { label: t, value: x.length, txt: `${x.length} · prom. ${(x.reduce((s, r) => s + r.score, 0) / x.length).toFixed(1)}`, color: 'var(--s1)', tip: tip(t, `${x.length} restricciones · puntaje medio ${(x.reduce((s, r) => s + r.score, 0) / x.length).toFixed(1)}<br>Altas: ${x.filter(r => r.score >= 15).length}`) }; }).sort((a, b) => b.value - a.value);
    return `${pageHead('Limitaciones externas y riesgos', 'Restricciones regulatorias, de mercado, de suministro, tecnológicas y de propiedad intelectual de los proyectos activos', `<select id="rt" style="width:200px"><option value="">Todos los tipos</option>${tipos.map(t => `<option ${t === this.tipo ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>${this.sel ? '<button class="btn" data-act="limpiar-celda">Quitar filtro de celda</button>' : ''}`)}
    <div class="grid g-12">${card('Matriz probabilidad × impacto', 'Pulsa una celda para filtrar la tabla', riskHeat(heat, { sel: this.sel }))}
    ${card('Restricciones por tipo', 'Cantidad y puntaje medio (probabilidad × impacto)', hbars(porTipo, { max: Math.max(1, ...porTipo.map(p => p.value)) }))}</div>
    <div class="grid mt">${card(`Registro (${rs.length})`, '', `<div class="scroll"><table class="tbl"><thead><tr><th>Proyecto</th><th>Tipo</th><th>Restricción / riesgo</th><th class="right">P×I</th><th>Estado</th><th>Mitigación</th><th>Responsable</th></tr></thead><tbody>${rs.map(r => { const p = T.pmap.get(r.proyecto_id); return `<tr class="clic" data-href="#/proyecto/${p.id}"><td class="nowrap"><b>${esc(p.codigo)}</b></td><td class="small">${esc(r.tipo)}</td><td>${esc(r.titulo)}</td><td class="num right"><span class="chip ${r.score >= 20 ? 'bad' : r.score >= 15 ? 'warn' : ''}">${r.probabilidad}×${r.impacto}=${r.score}</span></td><td class="small">${esc(r.estado)}</td><td class="small">${r.mitigacion ? esc(r.mitigacion) : '<span style="color:var(--crit-t)">Sin plan</span>'}</td><td class="small">${esc(r.responsable || '')}</td></tr>`; }).join('') || '<tr><td colspan="7" class="empty">Sin registros</td></tr>'}</tbody></table></div>`)}</div>`;
  },
  mount(root) { const s = $('#rt', root); if (s) s.onchange = () => { this.tipo = s.value; this.sel = null; document.dispatchEvent(new CustomEvent('rerender')); }; }
};
A['celda-riesgo'] = el => { const p = +el.dataset.p, i = +el.dataset.i; if (location.hash.startsWith('#/riesgos')) { riesgos.sel = (riesgos.sel && riesgos.sel[0] === p && riesgos.sel[1] === i) ? null : [p, i]; document.dispatchEvent(new CustomEvent('rerender')); } };
A['limpiar-celda'] = () => { riesgos.sel = null; document.dispatchEvent(new CustomEvent('rerender')); };
