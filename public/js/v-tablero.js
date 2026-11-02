import { S, esc, attr, money, nf, fecha, relDias, ETAPAS, HZ_COLOR, HZ_NOMBRE, stageColor, SALUD, chipSalud, A, val, mill } from './core.js';
import { hbars, donut, legend, bubbleMap, riskHeat, tip, stackRows } from './viz.js';

export const card = (titulo, sub, cuerpo, extra = '', cls = '') => `<section class="card ${cls}"><div class="ch"><div><h2>${titulo}</h2>${sub ? `<div class="sub">${sub}</div>` : ''}</div><div class="sp"></div>${extra}</div>${cuerpo}</section>`;
export const pageHead = (t, sub, acc = '', kicker = 'SIGRA · Gestión I+D+i') => `<div class="ph"><div>${kicker ? `<div class="kicker">${kicker}</div>` : ''}<h1>${t}</h1>${sub ? `<p>${sub}</p>` : ''}</div><div class="sp"></div>${acc}</div>`;
// Figura numerada con enlace a su pantalla de detalle y nota de fuente
export const figura = ({ n, titulo, sub = '', cuerpo, href = '', nota = '', cls = '' }) => `<section class="card fig link-card ${cls}"><div class="ch"><div><span class="kicker">Fig. ${String(n).padStart(2, '0')}</span><h2>${href ? `<a href="${href}">${titulo}</a>` : titulo}</h2>${sub ? `<div class="sub">${sub}</div>` : ''}</div><div class="sp"></div>${href ? `<a class="more" href="${href}">Ver detalle →</a>` : ''}</div>${cuerpo}${nota ? `<div class="fnote">${nota}</div>` : ''}</section>`;

export function alertasHTML(lista, { max = 12, ver = true } = {}) {
  if (!lista.length) return '<div class="empty">Sin alertas: el portafolio está en orden.</div>';
  const ic = { critica: '!', alta: '▲', media: 'i' };
  return `<div class="alist">${lista.slice(0, max).map(a => `<div class="al ${a.nivel}" data-href="#/proyecto/${a.proyecto_id}"><div class="ic">${ic[a.nivel]}</div><div><b>${esc(a.titulo)}</b><p>${esc(a.detalle)}</p></div><div class="pc">${esc(a.codigo)}</div></div>`).join('')}</div>${ver && lista.length > max ? `<div class="mt"><a href="#/alertas">Ver las ${lista.length} alertas →</a></div>` : ''}`;
}

export default {
  render() {
    const T = S.T, k = T.kpis, act = T.activos;
    const kpi = (l, v, d, cls = '', href = '') => `<div class="kpi ${cls}" ${href ? `data-href="${href}" style="cursor:pointer" role="link" tabindex="0"` : ''}>${href ? '<span class="go">↗</span>' : ''}<div class="l">${l}</div><div class="v">${v}</div><div class="d">${d}</div></div>`;
    const ej = k.inversion ? Math.round(100 * k.ejecutado / k.inversion) : 0;
    const kp = `<div class="kpis">
      ${kpi('Proyectos activos', val(k.activos, `de ${k.total}`), `${k.pausados} en pausa · ${k.cerrados} cerrado(s)`, '', '#/detalle/activos')}
      ${kpi('Inversión comprometida', val(mill(k.inversion), 'COP M'), `Ejecutado ${ej} %<div class="bar" style="margin-top:6px"><i style="width:${Math.min(100, ej)}%"></i></div>`, '', '#/detalle/inversion')}
      ${kpi('Valor esperado (rVPN)', val(mill(k.rvpn), 'COP M'), `VPN nominal ${mill(k.vpn)} · P̄ éxito ${Math.round(k.p_exito_prom * 100)} %`, 'gold', '#/detalle/rvpn')}
      ${kpi('Salud del portafolio', `<span class="sem" style="color:var(--good-t)"><i>●</i>${k.verde}</span><span class="sem" style="color:var(--warn-t)"><i>▲</i>${k.amarillo}</span><span class="sem" style="color:var(--crit-t)"><i>■</i>${k.rojo}</span>`, 'En ruta · Atención · En riesgo', '', '#/detalle/salud')}
      ${kpi('Críticas atrasadas', val(k.criticas_atrasadas, 'act.'), 'Mueven la fecha final', k.criticas_atrasadas ? 'alert' : '', '#/detalle/criticas')}
      ${kpi('Riesgos altos abiertos', val(k.riesgos_altos, 'P×I ≥ 15'), 'Restricciones externas e internas', k.riesgos_altos ? 'alert' : '', '#/detalle/riesgos')}
      ${kpi('Gates en 30 días', val(k.gates_30d, 'decisiones'), k.gates_vencidos ? `<b style="color:var(--crit-t)">${k.gates_vencidos} vencido(s)</b>` : 'Ninguno vencido', k.gates_vencidos ? 'alert' : '', '#/detalle/gates')}
    </div>`;

    // embudo
    const emb = ETAPAS.map((e, i) => { const ps = act.filter(p => p.etapa === i); return { label: e, value: ps.length, color: stageColor(i), txt: `${ps.length} · ${money(ps.reduce((s, p) => s + p.presupuesto, 0))}`, href: '#/pipeline', tip: tip(e, ps.map(p => esc(p.codigo + ' ' + p.nombre)).join('<br>') || 'Sin proyectos') }; });
    const dSalud = [['verde', 'var(--good)'], ['amarillo', 'var(--warn)'], ['rojo', 'var(--crit)']].map(([s, c]) => ({ label: SALUD[s].txt, value: act.filter(p => p.salud === s).length, color: c }));
    // horizontes
    const tot = act.reduce((s, p) => s + p.presupuesto, 0) || 1; const meta = { H1: 70, H2: 20, H3: 10 };
    const hz = ['H1', 'H2', 'H3'].map(h => { const v = act.filter(p => p.horizonte === h).reduce((s, p) => s + p.presupuesto, 0); const sh = Math.round(100 * v / tot); return { label: HZ_NOMBRE[h], value: sh, color: HZ_COLOR[h], txt: `${sh} % <span class="faint">/ ${meta[h]} %</span>`, tip: tip(HZ_NOMBRE[h], `${money(v)} · ${sh} % de la inversión<br>Referencia habitual: ${meta[h]} %`) }; });
    const restr = T.restricciones.filter(r => r.estado !== 'Cerrada' && act.some(p => p.id === r.proyecto_id));
    // gates próximos
    const gates = act.filter(p => p.proximo_gate).sort((a, b) => a.dias_gate - b.dias_gate).slice(0, 7);
    // carga
    const carga = new Map(); for (const a of T.actividades) { const p = T.pmap.get(a.proyecto_id); if (!p || p.estado !== 'En curso' || a.avance >= 100 || a.es_hito) continue; const c = carga.get(a.responsable || 'Sin asignar') || { n: 0, atr: 0 }; c.n++; if (a.estado_calc === 'Atrasada') c.atr++; carga.set(a.responsable || 'Sin asignar', c); }
    const cl = [...carga.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 8); const cmax = Math.max(1, ...cl.map(x => x[1].n));
    const cargaHTML = `<div class="hbars">${cl.map(([n, c]) => `<div class="hb" data-tip="${tip(n, `${c.n} actividades abiertas · ${c.atr} atrasadas`)}"><div class="lb">${esc(n)}</div><div class="tr" style="display:flex"><i style="width:${100 * (c.n - c.atr) / cmax}%;background:var(--olive-d);border-radius:0"></i><i style="width:${100 * c.atr / cmax}%;background:var(--crit);border-radius:0 4px 4px 0"></i></div><div class="vl">${c.n}${c.atr ? ` <span style="color:var(--crit-t)">(${c.atr}▲)</span>` : ''}</div></div>`).join('')}</div>${legend([{ color: 'var(--olive-d)', label: 'Abiertas' }, { color: 'var(--crit)', label: 'Atrasadas' }])}`;
    const rank = [...act].sort((a, b) => b.score - a.score).slice(0, 8).map(p => ({ label: `${p.codigo.slice(-3)} · ${p.nombre}`, value: p.score, color: HZ_COLOR[p.horizonte], href: '#/proyecto/' + p.id, tip: tip(p.codigo + ' · ' + p.nombre, `Score ${p.score}/100 · ${ETAPAS[p.etapa]}<br>Estrategia ${p.s_estrategia} · Mercado ${p.s_mercado} · Técnica ${p.s_tecnica} · Capacidad ${p.s_capacidad} · Riesgo ${p.s_riesgo}`) }));
    const n = `<span>n = ${act.length} proyectos activos</span><span>Corte ${fecha(T.hoy)}</span>`;
    return `${pageHead('Tablero del portafolio I+D+i', `${esc(T.empresa)} · panel de control con corte al ${fecha(T.hoy)}. Pulsa cualquier indicador o figura para ver su explicación y el detalle.`, `<a class="btn" href="#/indicadores">Índice de indicadores</a><button class="btn primary" data-act="nuevo-proyecto">＋ Nuevo proyecto</button>`, 'Gestión de la innovación · Stage-Gate')}
    ${kp}
    <div class="grid g-21">
      ${figura({ n: 1, titulo: 'Mapa de portafolio riesgo–valor', sub: 'Probabilidad de éxito vs. VPN esperado · tamaño = presupuesto · color = horizonte', href: '#/detalle/mapa', cuerpo: bubbleMap(act) + legend(['H1', 'H2', 'H3'].map(h => ({ color: HZ_COLOR[h], label: HZ_NOMBRE[h] }))), nota: n })}
      <div class="grid">
        ${figura({ n: 2, titulo: 'Embudo Stage-Gate', sub: 'Proyectos activos e inversión por etapa', href: '#/detalle/embudo', cuerpo: hbars(emb, { max: Math.max(1, ...emb.map(e => e.value)) }) })}
        ${figura({ n: 3, titulo: 'Salud del portafolio', sub: 'Atrasos críticos, gates, riesgos y presupuesto', href: '#/detalle/salud', cuerpo: `<div class="row" style="gap:18px">${donut(dSalud, { size: 140, centro: String(act.length), sub: 'activos' })}<div style="flex:1">${dSalud.map(d => `<div class="row" style="margin:5px 0"><b style="width:11px;height:11px;border-radius:3px;background:${d.color};display:inline-block"></b><span>${d.label}</span><span class="sp"></span><b class="num">${d.value}</b></div>`).join('')}</div></div>` })}
      </div>
    </div>
    <div class="grid g3 mt">
      ${figura({ n: 4, titulo: 'Balance de horizontes', sub: '% de inversión real / referencia 70-20-10', href: '#/detalle/horizontes', cuerpo: stackRows([{ label: 'Portafolio actual', vals: Object.fromEntries(hz.map((h, i) => [['H1', 'H2', 'H3'][i], h.value])), txt: hz.map(h => h.value).join(' / ') }, { label: 'Referencia', vals: meta, txt: '70 / 20 / 10' }], ['H1', 'H2', 'H3'].map(h => ({ k: h, label: HZ_NOMBRE[h], color: HZ_COLOR[h] })), { lw: 130, max: 100, fmt: v => v + ' %' }) + `<div class="small muted mt">${hz.map(h => `${esc(h.label.split(' (')[0])}: <b>${h.value} %</b> (ref. ${meta[h.label.slice(0, 2)]} %)`).join('<br>')}</div>` })}
      ${figura({ n: 5, titulo: 'Matriz de riesgos y restricciones', sub: `${restr.length} abiertas en proyectos activos`, href: '#/detalle/riesgos', cuerpo: riskHeat(restr) })}
      ${figura({ n: 6, titulo: 'Próximos gates', sub: 'Decisiones de Stage-Gate por fecha', href: '#/detalle/gates', cuerpo: gates.length ? `<div>${gates.map(p => `<div class="row" style="padding:7px 0;border-bottom:1px solid var(--line);cursor:pointer" data-href="#/proyecto/${p.id}"><span class="code" style="width:34px">${p.codigo.slice(-3)}</span><div style="flex:1;min-width:0"><div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:500">${esc(p.nombre)}</div><div class="small muted">Gate ${p.etapa + 1} · ${fecha(p.proximo_gate)}</div></div><span class="chip ${p.dias_gate < 0 ? 'bad' : p.dias_gate <= 14 ? 'warn' : ''}">${relDias(p.dias_gate)}</span></div>`).join('')}</div>` : '<div class="empty">Sin gates pendientes</div>' })}
    </div>
    <div class="grid g-32 mt">
      ${figura({ n: 7, titulo: 'Alertas que requieren decisión', sub: 'Priorizadas por criticidad', href: '#/detalle/alertas', cuerpo: alertasHTML(T.alertas, { max: 8, ver: false }) })}
      ${figura({ n: 8, titulo: 'Carga por responsable', sub: 'Actividades abiertas en proyectos activos', href: '#/detalle/carga', cuerpo: cargaHTML })}
    </div>
    <div class="grid g2 mt">
      ${figura({ n: 9, titulo: 'Ranking de priorización', sub: 'Puntaje 0-100: estrategia, mercado, técnica, capacidad y riesgo', href: '#/detalle/ranking', cuerpo: hbars(rank, { max: 100, lw: 230 }) })}
      ${figura({ n: 10, titulo: 'Resultados ex-post', sub: 'Cumplimiento de metas en proyectos evaluados', href: '#/detalle/expost', cuerpo: this.expost() })}
    </div>`;
  },
  card,
  expost() {
    const T = S.T; const ps = T.proyectos.filter(p => p.etapa === 6 && (T.emap.get(p.id) || []).length);
    if (!ps.length) return '<div class="empty">Aún no hay proyectos con evaluación ex-post.</div>';
    return ps.map(p => `<div style="margin-bottom:12px"><div class="row"><b>${esc(p.codigo)}</b> <span class="muted">${esc(p.nombre)}</span><span class="sp"></span>${chipSalud(p.salud)}</div>${hbars((T.emap.get(p.id) || []).map(e => { const r = e.mayor_mejor ? e.real / e.meta : e.meta / e.real; const ok = r >= 1; return { label: e.kpi, value: Math.min(130, r * 100), color: ok ? 'var(--good)' : r >= .85 ? 'var(--warn)' : 'var(--crit)', txt: `${Math.round(r * 100)} %`, tip: tip(e.kpi, `Meta ${nf.format(e.meta)} ${esc(e.unidad || '')} · Real ${nf.format(e.real)} ${esc(e.unidad || '')}<br>${e.mayor_mejor ? 'Más es mejor' : 'Menos es mejor'}`) }; }), { max: 130, lw: 190 })}</div>`).join('') + legend([{ color: 'var(--good)', label: 'Meta lograda (≥100 %)' }, { color: 'var(--warn)', label: 'Cerca (85-99 %)' }, { color: 'var(--crit)', label: 'Por debajo' }]);
  }
};
