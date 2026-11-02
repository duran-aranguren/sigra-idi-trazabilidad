// Pantallas de detalle de cada indicador y figura del tablero (estilo informe científico).
import { S, esc, attr, money, nf, fecha, fechaCorta, relDias, ETAPAS, ETAPA_CORTA, HZ_COLOR, HZ_NOMBRE, stageColor, chipSalud, SALUD, plink, val, mill, POSTURA_COLOR } from './core.js';
import { hbars, donut, legend, bubbleMap, riskHeat, tip, stackRows, scatterXY, gateTimeline, funnel, heat, dominioMapa, cuadrante } from './viz.js';
import { alertasHTML } from './v-tablero.js';
import tablero from './v-tablero.js';

// ---------- utilidades de maquetación ----------
const pad = n => String(n).padStart(2, '0');
const pctTxt = v => Math.round(v) + ' %';
const tabla = (cab, filas, { max = null } = {}) => `<div class="scroll" ${max ? `style="max-height:${max}px"` : 'style="max-height:none"'}><table class="tbl"><thead><tr>${cab.map(c => `<th class="${c.r ? 'right' : ''}">${c.t}</th>`).join('')}</tr></thead><tbody>${filas.map(f => `<tr>${f.map((v, i) => `<td class="${cab[i] && cab[i].r ? 'right num' : ''}">${v}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${cab.length}" class="empty">Sin datos para mostrar</td></tr>`}</tbody></table></div>`;
const chipDesv = d => `<span class="chip ${d > 15 ? 'bad' : d > 5 ? 'warn' : d < -15 ? 'blue' : ''}">${d > 0 ? '+' : ''}${d} pts</span>`;
const lista = arr => arr.length ? arr.map(a => `<div class="action"><span>${a}</span></div>`).join('') : '<div class="action">No se requieren acciones inmediatas con los datos actuales.</div>';
const codigos = ps => ps.map(p => `<a href="#/proyecto/${p.id}">${esc(p.codigo)}</a>`).join(', ');
const cortoP = p => `${p.codigo.slice(-3)} · ${p.nombre.length > 34 ? p.nombre.slice(0, 33) + '…' : p.nombre}`;

const ETAPA_DEF = [
  ['Explorar la oportunidad y formular la hipótesis de valor', 'Vigilancia tecnológica, entrevistas con clientes, búsqueda de patentes (FTO), prueba de concepto', '¿Vale la pena invertir en madurar la idea?'],
  ['Validar la viabilidad técnica, regulatoria y de costos', 'Especificaciones, ensayos de laboratorio, calificación de proveedores, análisis regulatorio, costo objetivo', '¿Es técnica y económicamente viable?'],
  ['Desarrollar prototipos y compararlos con el patrón', 'Formulaciones, lotes en planta piloto, ensayos fisicoquímicos, panel sensorial, estabilidad acelerada', '¿El prototipo cumple las especificaciones y convence al cliente?'],
  ['Demostrar el atractivo económico', 'Estudio de mercado, modelo financiero (VPN, TIR, payback), CAPEX y capacidad, estrategia de PI, análisis de riesgos', '¿El retorno esperado justifica un piloto?'],
  ['Preparar la prueba a escala real', 'Alcance y métricas, cliente aliado o maquilador, compras, permisos y etiquetas, protocolo de calidad', '¿Estamos listos para producir y vender en piloto?'],
  ['Validar en condiciones reales de producción y mercado', 'Lotes piloto, despacho, monitoreo de desempeño, retroalimentación, ajustes de proceso, informe', '¿Lanzamos o escalamos?'],
  ['Medir resultados reales y aprender', 'KPIs reales vs. caso de negocio, análisis de desviaciones, lecciones aprendidas, transferencia a operaciones', '¿Escalar, ajustar o discontinuar?']
];

// ---------- catálogo de indicadores ----------
export const IND = [
  { k: 'activos', g: 'Indicador clave', t: 'Proyectos activos', r: 'Amplitud del portafolio y forma del embudo por etapa y estado.' },
  { k: 'inversion', g: 'Indicador clave', t: 'Inversión comprometida y ejecución', r: 'Presupuesto aprobado, gasto ejecutado y desviación frente al avance físico.' },
  { k: 'rvpn', g: 'Indicador clave', t: 'Valor esperado ajustado por riesgo (rVPN)', r: 'Valor que crearía cada proyecto, ponderado por su probabilidad de éxito.' },
  { k: 'salud', g: 'Indicador clave', t: 'Salud del portafolio', r: 'Semáforo reproducible por proyecto y origen de cada alarma.' },
  { k: 'criticas', g: 'Indicador clave', t: 'Actividades críticas atrasadas', r: 'Atrasos en la ruta crítica que mueven la fecha final.' },
  { k: 'riesgos', g: 'Indicador clave', t: 'Riesgos y limitaciones externas', r: 'Matriz probabilidad × impacto, tipos de restricción y planes de mitigación.' },
  { k: 'gates', g: 'Indicador clave', t: 'Gates y decisiones', r: 'Calendario de decisiones de Stage-Gate y preparación de cada proyecto.' },
  { k: 'mapa', g: 'Figura', t: 'Mapa de portafolio riesgo–valor', r: 'Diagrama de burbujas de Cooper: perlas, ostras, pan y mantequilla, elefantes blancos.' },
  { k: 'embudo', g: 'Figura', t: 'Embudo Stage-Gate', r: 'Las siete etapas del modelo, sus entregables y la pregunta de cada gate.' },
  { k: 'horizontes', g: 'Figura', t: 'Balance de horizontes de innovación', r: 'Distribución H1/H2/H3 frente a la referencia 70-20-10.' },
  { k: 'alertas', g: 'Figura', t: 'Alertas del portafolio', r: 'Reglas automáticas, niveles y lista priorizada.' },
  { k: 'carga', g: 'Figura', t: 'Carga por responsable', r: 'Actividades abiertas, atrasadas y críticas por persona.' },
  { k: 'ranking', g: 'Figura', t: 'Ranking de priorización', r: 'Modelo de puntuación de cinco criterios y su relación con el valor esperado.' },
  { k: 'expost', g: 'Figura', t: 'Resultados ex-post', r: 'Cumplimiento real frente a las metas del caso de negocio.' }
];

// ---------- definiciones ----------
const D = {
  activos(T) {
    const act = T.activos, k = T.kpis; const temp = act.filter(p => p.etapa <= 2).length, tard = act.length - temp;
    const cols = [['En curso', 'var(--olive-d)'], ['En pausa', 'var(--p-neu)'], ['Cerrado', 'var(--brand-gold)'], ['Cancelado', 'var(--p-opo)']];
    const rows = ETAPAS.map((e, i) => { const ps = T.proyectos.filter(p => p.etapa === i); return { label: e, vals: Object.fromEntries(cols.map(([c]) => [c, ps.filter(p => p.estado === c).length])), tip: tip(e, ps.map(p => esc(p.codigo + ' · ' + p.estado)).join('<br>') || 'Sin proyectos') }; });
    const lineas = [...new Set(act.map(p => p.linea || 'Sin línea'))].map(l => ({ label: l, value: act.filter(p => (p.linea || 'Sin línea') === l).length, color: 'var(--olive-d)' })).sort((a, b) => b.value - a.value);
    const edad = [...act].sort((a, b) => b.dias_en_etapa - a.dias_en_etapa).map(p => ({ label: cortoP(p), value: p.dias_en_etapa, color: stageColor(p.etapa), txt: p.dias_en_etapa + ' d', href: '#/proyecto/' + p.id, tip: tip(p.codigo + ' · ' + p.nombre, `${ETAPAS[p.etapa]} · ${p.dias_en_etapa} días en la etapa`) }));
    const pausa = T.proyectos.filter(p => p.estado === 'En pausa'), viejos = act.filter(p => p.dias_en_etapa > 150);
    return {
      lead: 'Número de proyectos en ejecución. Mide la amplitud del embudo de innovación y la carga que asume el área; se lee junto con los proyectos en pausa, cancelados y cerrados para tener la foto completa del portafolio.',
      stats: [{ l: 'Activos', v: val(k.activos, 'proyectos') }, { l: 'En pausa', v: val(k.pausados, 'proyectos'), c: k.pausados ? 'warn' : '' }, { l: 'Cerrados / cancelados', v: val(T.proyectos.filter(p => ['Cerrado', 'Cancelado'].includes(p.estado)).length, 'proyectos') }, { l: 'Etapas tempranas', v: val(temp, 'Idea–Prototipo') }, { l: 'Etapas tardías', v: val(tard, 'C. negocio–Ex-post') }],
      fig: { t: 'Proyectos por etapa y estado', c: 'Cada barra suma todos los proyectos de la etapa; los colores indican su estado actual.', b: stackRows(rows, cols.map(([c, col]) => ({ k: c, label: c, color: col })), { lw: 150 }) },
      metodo: 'Activos = Σ proyectos con estado «En curso»\nPortafolio = activos + en pausa + cancelados + cerrados\nTempranas = etapas Idea, Maduración y Prototipo',
      lectura: ['Un embudo sano tiene <b>más proyectos en etapas tempranas</b> que en las tardías: muchas ideas se filtran en los gates.', 'Pocos proyectos tempranos anticipan un <b>vacío de lanzamientos</b> en uno o dos años.', 'Los proyectos en pausa consumen atención sin avanzar: conviene decidir si se reactivan o se detienen.'],
      acciones: [...(pausa.length ? [`Decidir el futuro de los proyectos en pausa: ${codigos(pausa)}.`] : []), temp < tard ? `Reforzar la generación de ideas: hay ${tard} proyectos en etapas tardías y solo ${temp} en tempranas.` : `La base del embudo es adecuada: ${temp} proyectos tempranos frente a ${tard} tardíos.`, ...(viejos.length ? [`Revisar los proyectos con más de 150 días en la misma etapa: ${codigos(viejos)}.`] : [])],
      extra: [{ t: 'Proyectos activos por línea de negocio', c: 'Concentración del esfuerzo de I+D+i por línea.', b: hbars(lineas, { lw: 190 }) }, { t: 'Antigüedad en la etapa actual', c: 'Días desde la última decisión de gate; el color indica la etapa.', b: hbars(edad, { lw: 250 }) }],
      tabla: { t: 'Registro de proyectos', cab: [{ t: 'Proyecto' }, { t: 'Estado' }, { t: 'Etapa' }, { t: 'Líder' }, { t: 'Inicio' }, { t: 'Días en etapa', r: 1 }, { t: 'Salud' }], filas: T.proyectos.map(p => [plink(p), esc(p.estado), esc(ETAPAS[p.etapa]), esc(p.lider), fechaCorta(p.fecha_inicio), p.dias_en_etapa, chipSalud(p.salud)]) },
      n: `${T.proyectos.length} proyectos registrados`
    };
  },

  inversion(T) {
    const act = T.activos, k = T.kpis; const ej = k.inversion ? Math.round(100 * k.ejecutado / k.inversion) : 0;
    const desv = p => p.ejecucion_pct - p.avance; const altas = act.filter(p => desv(p) > 15), sobre = act.filter(p => p.ejecutado > p.presupuesto);
    const ymax = Math.max(110, Math.ceil((Math.max(...act.map(p => p.ejecucion_pct), 0) + 10) / 10) * 10);
    const pts = act.map(p => ({ x: p.avance, y: p.ejecucion_pct, label: p.codigo.slice(-3), color: desv(p) > 15 ? 'var(--crit)' : 'var(--olive-d)', href: '#/proyecto/' + p.id, tip: tip(p.codigo + ' · ' + p.nombre, `Avance físico ${p.avance} % · Ejecución ${p.ejecucion_pct} %<br>Desviación ${desv(p) > 0 ? '+' : ''}${desv(p)} pts · ${money(p.ejecutado)} de ${money(p.presupuesto)}`) }));
    const bandas = (X, Y) => `<polygon points="${X(0)},${Y(15)} ${X(100)},${Y(115)} ${X(100)},${Y(ymax)} ${X(0)},${Y(ymax)}" style="fill:color-mix(in srgb,var(--crit) 7%,transparent)"/><text x="${X(3)}" y="${Y(ymax) + 16}" class="tx3" font-size="10">Gasta más de lo que avanza (desviación > 15 pts)</text>`;
    const porEtapa = ETAPAS.map((e, i) => { const ps = act.filter(p => p.etapa === i); return { label: e, value: ps.reduce((s, p) => s + p.presupuesto, 0), color: stageColor(i), txt: money(ps.reduce((s, p) => s + p.presupuesto, 0)) }; });
    const mx = Math.max(...act.map(p => Math.max(p.presupuesto, p.ejecutado)), 1);
    const dumb = [...act].sort((a, b) => b.presupuesto - a.presupuesto).map(p => `<div class="stkrow" style="--lw:250px" data-href="#/proyecto/${p.id}"><div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer">${esc(cortoP(p))}</div><div class="dumb" data-tip="${tip(p.codigo, `Presupuesto ${money(p.presupuesto)}<br>Ejecutado ${money(p.ejecutado)} (${p.ejecucion_pct} %)`)}"><div class="bg" style="width:${100 * p.presupuesto / mx}%"></div><div class="fg" style="width:${100 * Math.min(p.ejecutado, mx) / mx}%;${p.ejecutado > p.presupuesto ? 'background:var(--crit)' : ''}"></div></div><div class="num" style="color:var(--ink2)">${p.ejecucion_pct} %</div></div>`).join('');
    return {
      lead: 'Presupuesto total aprobado para los proyectos activos y cuánto de él ya se ejecutó. Comparar la ejecución financiera con el avance físico revela los proyectos que gastan más rápido de lo que avanzan.',
      stats: [{ l: 'Comprometida', v: val(mill(k.inversion), 'COP M') }, { l: 'Ejecutada', v: val(mill(k.ejecutado), 'COP M') }, { l: 'Ejecución', v: val(ej, '%') }, { l: 'Desviación > 15 pts', v: val(altas.length, 'proyectos'), c: altas.length ? 'bad' : 'ok' }, { l: 'Sobreejecutados', v: val(sobre.length, 'proyectos'), c: sobre.length ? 'bad' : 'ok' }],
      fig: { t: 'Ejecución presupuestal frente a avance físico', c: 'Cada punto es un proyecto activo. Sobre la diagonal, el gasto avanza más rápido que el trabajo.', b: scatterXY(pts, { xlab: 'Avance físico del proyecto (%)', ylab: 'Ejecución presupuestal (%)', ymax, diag: true, diagLabel: 'ejecución = avance', bandas }) },
      metodo: 'Ejecución (%) = ejecutado / presupuesto × 100\nAvance físico (%) = Σ(duración × avance) / Σ duración\nDesviación (pts) = ejecución − avance físico',
      lectura: ['<b>Sobre la diagonal:</b> el proyecto gasta más de lo que avanza; puede haber sobrecosto o trabajo no reportado.', '<b>Bajo la diagonal:</b> avanza con menos gasto del previsto, o el gasto aún no se ha registrado.', 'Más de la mitad del presupuesto se concentra típicamente en el <b>piloto</b>: es normal que la ejecución se acelere en esa etapa.'],
      acciones: [...altas.map(p => `Revisar costos de <a href="#/proyecto/${p.id}">${esc(p.codigo)}</a>: ejecución ${p.ejecucion_pct} % con avance de ${p.avance} % (+${desv(p)} pts).`), ...sobre.filter(p => !altas.includes(p)).map(p => `Solicitar ampliación o ajuste de alcance para ${esc(p.codigo)}: ya superó su presupuesto.`)],
      extra: [{ t: 'Inversión comprometida por etapa', c: 'Presupuesto total de los proyectos activos según su etapa actual.', b: hbars(porEtapa, { lw: 160 }) }, { t: 'Ejecutado frente a presupuesto por proyecto', c: 'Barra clara = presupuesto; barra oscura = ejecutado (rojo si lo supera).', b: dumb + legend([{ color: 'color-mix(in srgb,var(--brand-olive) 30%,transparent)', label: 'Presupuesto' }, { color: 'var(--olive-d)', label: 'Ejecutado' }, { color: 'var(--crit)', label: 'Sobreejecución' }]) }],
      tabla: { t: 'Detalle financiero por proyecto', cab: [{ t: 'Proyecto' }, { t: 'Presupuesto (COP M)', r: 1 }, { t: 'Ejecutado (COP M)', r: 1 }, { t: 'Ejecución', r: 1 }, { t: 'Avance físico', r: 1 }, { t: 'Desviación', r: 1 }], filas: [...act].sort((a, b) => desv(b) - desv(a)).map(p => [plink(p), mill(p.presupuesto), mill(p.ejecutado), p.ejecucion_pct + ' %', p.avance + ' %', chipDesv(desv(p))]) },
      n: `${act.length} proyectos activos`
    };
  },

  rvpn(T) {
    const act = T.activos, k = T.kpis; const ind = p => p.presupuesto ? p.rvpn / p.presupuesto : 0;
    const mx = Math.max(...act.map(p => p.vpn_esperado), 1);
    const dumb = [...act].sort((a, b) => b.rvpn - a.rvpn).map(p => `<div class="stkrow" style="--lw:250px" data-href="#/proyecto/${p.id}"><div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer">${esc(cortoP(p))}</div><div class="dumb" data-tip="${tip(p.codigo, `VPN ${money(p.vpn_esperado)} × P(éxito) ${Math.round(p.p_exito * 100)} %<br>= rVPN ${money(p.rvpn)}`)}"><div class="bg" style="width:${100 * p.vpn_esperado / mx}%;background:color-mix(in srgb,var(--brand-gold) 35%,transparent)"></div><div class="fg" style="width:${100 * p.rvpn / mx}%;background:var(--s2)"></div></div><div class="num" style="color:var(--ink2)">${mill(p.rvpn)}</div></div>`).join('');
    const hz = ['H1', 'H2', 'H3'].map(h => ({ label: HZ_NOMBRE[h], value: act.filter(p => p.horizonte === h).reduce((s, p) => s + p.rvpn, 0), color: HZ_COLOR[h] })); hz.forEach(x => x.txt = money(x.value));
    const ix = [...act].sort((a, b) => ind(b) - ind(a)).map(p => ({ label: cortoP(p), value: +ind(p).toFixed(2), color: ind(p) >= 1 ? 'var(--olive-d)' : 'var(--p-opo)', txt: ind(p).toFixed(2).replace('.', ',') + '×', href: '#/proyecto/' + p.id }));
    const bajos = act.filter(p => ind(p) < 1), top = [...act].sort((a, b) => ind(b) - ind(a)).slice(0, 3);
    return {
      lead: 'Valor presente neto que se espera crear si el proyecto tiene éxito, ajustado por la probabilidad de lograrlo técnica y comercialmente. Permite comparar en una misma escala proyectos de riesgo muy distinto.',
      stats: [{ l: 'VPN nominal', v: val(mill(k.vpn), 'COP M') }, { l: 'rVPN del portafolio', v: val(mill(k.rvpn), 'COP M') }, { l: 'Descuento por riesgo', v: val(k.vpn ? Math.round(100 * (1 - k.rvpn / k.vpn)) : 0, '%') }, { l: 'Índice rVPN / inversión', v: val(k.inversion ? (k.rvpn / k.inversion).toFixed(2).replace('.', ',') : '0', '×') }],
      fig: { t: 'VPN nominal y valor ajustado por riesgo', c: 'Barra clara = VPN si el proyecto tiene éxito; barra dorada = rVPN. La diferencia es el valor «en riesgo».', b: dumb + legend([{ color: 'color-mix(in srgb,var(--brand-gold) 35%,transparent)', label: 'VPN nominal' }, { color: 'var(--s2)', label: 'rVPN (ajustado)' }]) },
      metodo: 'P(éxito) = P(técnica) × P(comercial)\nrVPN = VPN esperado × P(éxito)\nÍndice de productividad = rVPN / presupuesto',
      lectura: ['La distancia entre ambas barras es el <b>valor que se pierde por incertidumbre</b>; reducirla es el objetivo de cada etapa.', 'Un <b>índice menor a 1</b> indica que el valor esperado no cubre la inversión: el proyecto debe reducir riesgo o costo.', 'Las probabilidades deben actualizarse en cada gate con evidencia: ensayos, panel, piloto.'],
      acciones: [`Priorizar recursos en los proyectos con mejor índice: ${top.map(p => `<a href="#/proyecto/${p.id}">${esc(p.codigo)}</a> (${ind(p).toFixed(1).replace('.', ',')}×)`).join(', ')}.`, ...(bajos.length ? [`Revisar supuestos de valor o costo en ${codigos(bajos)}: su rVPN no cubre el presupuesto.`] : [])],
      extra: [{ t: 'rVPN por horizonte', c: 'Dónde se concentra el valor esperado del portafolio.', b: hbars(hz, { lw: 200 }) }, { t: 'Índice de productividad por proyecto', c: 'rVPN generado por cada peso invertido; en oliva ≥ 1, en ladrillo < 1.', b: hbars(ix, { lw: 250 }) }],
      tabla: { t: 'Cálculo del valor esperado', cab: [{ t: 'Proyecto' }, { t: 'VPN (COP M)', r: 1 }, { t: 'P técnica', r: 1 }, { t: 'P comercial', r: 1 }, { t: 'P éxito', r: 1 }, { t: 'rVPN (COP M)', r: 1 }, { t: 'Presupuesto', r: 1 }, { t: 'Índice', r: 1 }], filas: [...act].sort((a, b) => b.rvpn - a.rvpn).map(p => [plink(p), mill(p.vpn_esperado), pctTxt(p.p_tecnica * 100), pctTxt(p.p_comercial * 100), pctTxt(p.p_exito * 100), `<b>${mill(p.rvpn)}</b>`, mill(p.presupuesto), ind(p).toFixed(2).replace('.', ',') + '×']) },
      n: `${act.length} proyectos activos`
    };
  },

  salud(T) {
    const act = T.activos; const c = s => act.filter(p => p.salud === s).length;
    const ser = [['criticas', 'Críticas atrasadas (+3 c/u)', 'var(--crit)'], ['gate', 'Gate vencido (+3)', 'var(--serious)'], ['presupuesto', 'Presupuesto excedido (+2)', 'var(--s3)'], ['atrasadas', 'Atrasadas con holgura (+1, máx. 3)', 'var(--warn)'], ['riesgos', 'Riesgos altos (+1)', 'var(--p-neu)']];
    const rows = [...act].sort((a, b) => b.salud_puntos - a.salud_puntos).map(p => ({ label: cortoP(p), href: '#/proyecto/' + p.id, vals: p.salud_detalle || {}, txt: `${p.salud_puntos} pts ${SALUD[p.salud].ic}` }));
    const porEtapa = ETAPAS.map((e, i) => { const ps = act.filter(p => p.etapa === i); return { label: e, vals: { verde: ps.filter(p => p.salud === 'verde').length, amarillo: ps.filter(p => p.salud === 'amarillo').length, rojo: ps.filter(p => p.salud === 'rojo').length } }; });
    const rojos = act.filter(p => p.salud === 'rojo'), amar = act.filter(p => p.salud === 'amarillo');
    return {
      lead: 'Semáforo que resume si cada proyecto avanza según lo planeado. Suma puntos por señales de alarma objetivas (atrasos, gates vencidos, riesgos, presupuesto), de modo que cualquier persona pueda reproducir el resultado.',
      stats: [{ l: 'En ruta ●', v: val(c('verde'), 'proyectos'), c: 'ok' }, { l: 'Atención ▲', v: val(c('amarillo'), 'proyectos'), c: 'warn' }, { l: 'En riesgo ■', v: val(c('rojo'), 'proyectos'), c: 'bad' }, { l: 'Puntaje medio', v: val(act.length ? (act.reduce((s, p) => s + p.salud_puntos, 0) / act.length).toFixed(1).replace('.', ',') : 0, 'pts') }],
      fig: { t: 'Puntaje de salud por proyecto y su origen', c: 'Longitud = puntos acumulados; cada color es una regla del semáforo. Umbrales: atención ≥ 2 pts, en riesgo ≥ 7 pts.', b: stackRows(rows, ser.map(([k, l, col]) => ({ k, label: l, color: col })), { lw: 250, fmt: v => v + ' pts' }) },
      metodo: '+3  por cada actividad crítica atrasada\n+1  por actividad atrasada con holgura (máx. 3)\n+3  si el gate de la etapa está vencido\n+1  si hay riesgos altos abiertos (P×I ≥ 15)\n+2  si el ejecutado supera el presupuesto\n\nVerde 0–1 · Amarillo 2–6 · Rojo ≥ 7',
      lectura: ['El semáforo es <b>explicable</b>: cada proyecto muestra qué reglas sumaron puntos en su ficha.', 'Las reglas pesan más lo que <b>mueve la fecha final</b> (ruta crítica, gates) que lo que solo genera ruido.', 'Los proyectos en pausa, cerrados o cancelados no reciben semáforo.'],
      acciones: [...rojos.map(p => `Llevar <a href="#/proyecto/${p.id}">${esc(p.codigo)}</a> al próximo comité: ${esc(p.salud_razones.join('; '))}.`), ...(amar.length ? [`Seguimiento semanal a ${codigos(amar)}.`] : [])],
      extra: [{ t: 'Salud por etapa', c: '¿En qué etapas se concentran los problemas?', b: stackRows(porEtapa, [{ k: 'verde', label: 'En ruta', color: 'var(--good)' }, { k: 'amarillo', label: 'Atención', color: 'var(--warn)' }, { k: 'rojo', label: 'En riesgo', color: 'var(--crit)' }], { lw: 150 }) }],
      tabla: { t: 'Diagnóstico por proyecto', cab: [{ t: 'Proyecto' }, { t: 'Salud' }, { t: 'Puntos', r: 1 }, { t: 'Motivos' }], filas: [...act].sort((a, b) => b.salud_puntos - a.salud_puntos).map(p => [plink(p), chipSalud(p.salud), p.salud_puntos, esc(p.salud_razones.join(' · ') || 'Sin desviaciones')]) },
      n: `${act.length} proyectos activos`
    };
  },

  criticas(T) {
    const act = new Set(T.activos.map(p => p.id)); const atr = T.actividades.filter(a => act.has(a.proyecto_id) && !a.es_hito && a.avance < 100 && a.estado_calc === 'Atrasada').sort((a, b) => b.dias_atraso - a.dias_atraso);
    const crit = atr.filter(a => a.critica); const P = id => T.pmap.get(id);
    const prom = crit.length ? Math.round(crit.reduce((s, a) => s + a.dias_atraso, 0) / crit.length) : 0;
    const bars = atr.slice(0, 22).map(a => ({ label: `${P(a.proyecto_id).codigo.slice(-3)} · ${a.nombre}`, value: a.dias_atraso, color: a.critica ? 'var(--crit)' : 'var(--s2)', txt: `${a.dias_atraso} d · ${a.avance} %`, href: '#/proyecto/' + a.proyecto_id + '/actividades', tip: tip(a.nombre, `${esc(P(a.proyecto_id).codigo)} · ${esc(a.responsable || '')}<br>Fin planificado ${fecha(a.fecha_fin)} · ${a.critica ? 'ruta crítica' : 'holgura ' + a.holgura + ' d'}`) }));
    const resp = new Map(); for (const a of atr) { const r = resp.get(a.responsable || 'Sin asignar') || { c: 0, h: 0 }; a.critica ? r.c++ : r.h++; resp.set(a.responsable || 'Sin asignar', r); }
    const rr = [...resp.entries()].sort((a, b) => (b[1].c + b[1].h) - (a[1].c + a[1].h)).map(([n, v]) => ({ label: n, vals: { c: v.c, h: v.h } }));
    return {
      lead: 'Actividades de la ruta crítica que superaron su fecha de fin sin completarse o que no iniciaron a tiempo. Como no tienen holgura, cada día de atraso se traslada a la fecha final del proyecto.',
      stats: [{ l: 'Críticas atrasadas', v: val(crit.length, 'actividades'), c: crit.length ? 'bad' : 'ok' }, { l: 'Atraso medio (críticas)', v: val(prom, 'días') }, { l: 'Proyectos afectados', v: val(new Set(crit.map(a => a.proyecto_id)).size, 'proyectos') }, { l: 'Atrasadas con holgura', v: val(atr.length - crit.length, 'actividades') }],
      fig: { t: 'Días de atraso por actividad', c: 'Rojo = ruta crítica (sin holgura); dorado = atrasada pero con holgura. Se muestran las 22 de mayor atraso.', b: atr.length ? hbars(bars, { lw: 340 }) + legend([{ color: 'var(--crit)', label: 'Ruta crítica' }, { color: 'var(--s2)', label: 'Con holgura' }]) : '<div class="empty">No hay actividades atrasadas.</div>' },
      metodo: 'Holgura = fecha límite de término − fin planificado\n  fecha límite = inicio más temprano de sus sucesoras\n  (o fin del proyecto si no tiene sucesoras)\nCrítica   ⇔ holgura ≤ 0\nAtrasada  ⇔ fin < hoy y avance < 100 %,\n            o sin iniciar 7 días después de su inicio',
      lectura: ['Prioriza siempre las <b>críticas</b>: las que tienen holgura pueden esperar sin mover la fecha final.', 'Una actividad sin iniciar que bloquea a otras genera <b>atrasos en cadena</b>.', 'Si el atraso es estructural, reprograma la actividad: la ruta crítica se recalcula automáticamente.'],
      acciones: crit.slice(0, 5).map(a => `Desbloquear «${esc(a.nombre)}» en <a href="#/proyecto/${a.proyecto_id}/actividades">${esc(P(a.proyecto_id).codigo)}</a> (${esc(a.responsable || 'sin responsable')}): ${a.dias_atraso} días de atraso.`),
      extra: [{ t: 'Atrasos por responsable', c: 'Ayuda a distinguir problemas de capacidad de problemas puntuales.', b: rr.length ? stackRows(rr, [{ k: 'c', label: 'Críticas', color: 'var(--crit)' }, { k: 'h', label: 'Con holgura', color: 'var(--s2)' }], { lw: 170 }) : '<div class="empty">Sin atrasos.</div>' }],
      tabla: { t: 'Actividades atrasadas', cab: [{ t: 'Proyecto' }, { t: 'Actividad' }, { t: 'Responsable' }, { t: 'Fin planificado' }, { t: 'Atraso', r: 1 }, { t: 'Avance', r: 1 }, { t: 'Tipo' }], filas: atr.map(a => [plink(P(a.proyecto_id), { corto: 26 }), esc(a.nombre), esc(a.responsable || '—'), fechaCorta(a.fecha_fin), a.dias_atraso + ' d', a.avance + ' %', a.critica ? '<span class="chip bad">Crítica</span>' : `<span class="chip">Holgura ${a.holgura} d</span>`]) },
      n: `${atr.length} actividades atrasadas en proyectos activos`
    };
  },

  riesgos(T) {
    const act = new Set(T.activos.map(p => p.id)); const rs = T.restricciones.filter(r => act.has(r.proyecto_id) && r.estado !== 'Cerrada').sort((a, b) => b.score - a.score);
    const altos = rs.filter(r => r.score >= 15), crit = rs.filter(r => r.score >= 20), sinMit = altos.filter(r => !r.mitigacion);
    const tipos = [...new Set(rs.map(r => r.tipo))].map(t => { const x = rs.filter(r => r.tipo === t); return { label: t, vals: { a: x.filter(r => r.score >= 15).length, m: x.filter(r => r.score >= 8 && r.score < 15).length, b: x.filter(r => r.score < 8).length } }; }).sort((a, b) => (b.vals.a + b.vals.m + b.vals.b) - (a.vals.a + a.vals.m + a.vals.b));
    const expo = T.activos.map(p => ({ p, v: rs.filter(r => r.proyecto_id === p.id).reduce((s, r) => s + r.score, 0) })).sort((a, b) => b.v - a.v).map(({ p, v }) => ({ label: cortoP(p), value: v, color: 'var(--serious)', href: '#/proyecto/' + p.id + '/riesgos', txt: v + ' pts' }));
    return {
      lead: 'Restricciones externas (regulatorias, de mercado, de suministro, tecnológicas, de propiedad intelectual) y riesgos internos que pueden frenar los proyectos. Se priorizan por probabilidad × impacto y cada una debe tener responsable y plan de mitigación.',
      stats: [{ l: 'Abiertas', v: val(rs.length, 'registros') }, { l: 'Altas (≥ 15)', v: val(altos.length, 'registros'), c: altos.length ? 'warn' : '' }, { l: 'Críticas (≥ 20)', v: val(crit.length, 'registros'), c: crit.length ? 'bad' : 'ok' }, { l: 'Altas sin mitigación', v: val(sinMit.length, 'registros'), c: sinMit.length ? 'bad' : 'ok' }],
      fig: { t: 'Matriz probabilidad × impacto', c: 'Número de restricciones abiertas en cada celda; el fondo indica la zona de severidad.', b: riskHeat(rs) },
      metodo: 'Puntaje = Probabilidad (1–5) × Impacto (1–5)\nBajo < 8 · Medio 8–14 · Alto 15–19 · Crítico ≥ 20\nTipos: Regulatoria, Mercado, Cadena de suministro,\nTecnológica, Propiedad intelectual, Financiera,\nAmbiental / ESG, Cliente / aliado, Organizacional',
      lectura: ['La esquina superior derecha concentra lo que debe tener <b>plan de mitigación y responsable</b>.', 'Las restricciones externas no se eliminan: se <b>monitorean</b> y se diseñan alternativas (proveedor alterno, ruta regulatoria, rediseño).', 'Revisa el registro en cada gate y cierra lo que ya no aplica.'],
      acciones: [...sinMit.map(r => `Definir plan de mitigación para «${esc(r.titulo)}» (${esc(T.pmap.get(r.proyecto_id).codigo)}, P×I = ${r.score}).`), ...(tipos[0] ? [`El tipo con más registros es «${esc(tipos[0].label)}»: considerar una estrategia transversal para el portafolio.`] : [])],
      extra: [{ t: 'Restricciones por tipo y severidad', c: 'Qué clase de limitación externa pesa más en el portafolio.', b: stackRows(tipos, [{ k: 'a', label: 'Alta (≥ 15)', color: 'var(--crit)' }, { k: 'm', label: 'Media (8–14)', color: 'var(--warn)' }, { k: 'b', label: 'Baja (< 8)', color: 'var(--p-neu)' }], { lw: 170 }) }, { t: 'Exposición al riesgo por proyecto', c: 'Suma de puntajes P×I de las restricciones abiertas.', b: hbars(expo, { lw: 250 }) }],
      tabla: { t: 'Registro priorizado', cab: [{ t: 'Proyecto' }, { t: 'Tipo' }, { t: 'Restricción / riesgo' }, { t: 'P×I', r: 1 }, { t: 'Estado' }, { t: 'Mitigación' }, { t: 'Responsable' }], filas: rs.map(r => [plink(T.pmap.get(r.proyecto_id), { corto: 24 }), esc(r.tipo), esc(r.titulo), `<span class="chip ${r.score >= 20 ? 'bad' : r.score >= 15 ? 'warn' : ''}">${r.probabilidad}×${r.impacto}=${r.score}</span>`, esc(r.estado), r.mitigacion ? esc(r.mitigacion) : '<span style="color:var(--crit-t)">Sin plan</span>', esc(r.responsable || '')]) },
      n: `${rs.length} restricciones abiertas`
    };
  },

  gates(T) {
    const act = T.activos.filter(p => p.proximo_gate).sort((a, b) => a.dias_gate - b.dias_gate);
    const gname = p => (T.amap.get(p.id) || []).find(a => a.es_hito && a.etapa === p.etapa)?.nombre || `Gate ${p.etapa + 1}`;
    const items = act.map(p => ({ p, fecha: p.proximo_gate, dias: p.dias_gate, label: gname(p) }));
    const hace = new Date(Date.parse(T.hoy) - 365 * 864e5).toISOString().slice(0, 10); const dec = T.gates.filter(g => g.fecha >= hace);
    const tipos = ['Go', 'Go con condiciones', 'Reciclar', 'Pausar', 'Detener'].map((d, i) => ({ label: d, value: dec.filter(g => g.decision === d).length, color: ['var(--olive-d)', 'var(--s2)', 'var(--warn)', 'var(--p-neu)', 'var(--crit)'][i] }));
    const venc = act.filter(p => p.dias_gate < 0), pronto = act.filter(p => p.dias_gate >= 0 && p.dias_gate <= 14);
    const pts = act.filter(p => p.dias_gate <= 120).map(p => ({ x: Math.max(-40, p.dias_gate), y: p.avance_etapa, label: p.codigo.slice(-3), color: p.dias_gate < 0 ? 'var(--crit)' : stageColor(p.etapa), href: '#/proyecto/' + p.id, tip: tip(p.codigo + ' · ' + p.nombre, `${relDias(p.dias_gate)} · avance de la etapa ${p.avance_etapa} %`) }));
    return {
      lead: 'Puntos de decisión al cierre de cada etapa. En cada gate el comité revisa la evidencia y decide si el proyecto avanza, avanza con condiciones, repite trabajo, se pausa o se detiene. Preparar los gates a tiempo evita que los proyectos avancen por inercia.',
      stats: [{ l: 'En 30 días', v: val(act.filter(p => p.dias_gate >= 0 && p.dias_gate <= 30).length, 'gates') }, { l: 'En 90 días', v: val(act.filter(p => p.dias_gate >= 0 && p.dias_gate <= 90).length, 'gates') }, { l: 'Vencidos', v: val(venc.length, 'gates'), c: venc.length ? 'bad' : 'ok' }, { l: 'Decisiones (12 meses)', v: val(dec.length, 'registradas') }],
      ancho: true,
      fig: { t: 'Calendario de gates pendientes', c: 'Cada rombo es la fecha planificada del gate; el color indica la etapa (rojo si está vencido). La franja dorada marca los próximos 30 días.', b: gateTimeline(items, T.hoy) },
      metodo: 'Fecha del gate = fin planificado del hito de cierre de la etapa\nDecisiones: Go · Go con condiciones · Reciclar · Pausar · Detener\nVencido ⇔ fecha < hoy sin decisión registrada',
      lectura: ['Un gate próximo con <b>bajo avance de la etapa</b> anticipa una decisión sin evidencia suficiente.', '«Reciclar» no es un fracaso: repetir trabajo con aprendizaje es preferible a avanzar con dudas.', 'Registra siempre el fundamento y las condiciones: quedan en la trazabilidad del proyecto.'],
      acciones: [...venc.map(p => `Programar con urgencia el comité de ${esc(p.codigo)}: gate vencido hace ${-p.dias_gate} días.`), ...pronto.map(p => `Preparar el paquete de evidencia de <a href="#/proyecto/${p.id}">${esc(p.codigo)}</a> (gate en ${p.dias_gate} días, avance de la etapa ${p.avance_etapa} %).`)],
      extra: [{ t: 'Preparación frente a la fecha del gate', c: 'Eje X: días al gate (negativo = vencido). Eje Y: avance de la etapa. Abajo a la izquierda = riesgo de decidir sin evidencia.', b: scatterXY(pts, { xmin: -40, xmax: 120, xlab: 'Días hasta el gate', ylab: 'Avance de la etapa (%)', xfmt: v => Math.round(v), bandas: (X, Y) => `<rect x="${X(-40)}" y="${Y(50)}" width="${X(30) - X(-40)}" height="${Y(0) - Y(50)}" style="fill:color-mix(in srgb,var(--crit) 8%,transparent)"/>` }) }, { t: 'Decisiones registradas en 12 meses', c: 'Distribución de los resultados de los gates.', b: hbars(tipos, { lw: 170 }) }],
      tabla: { t: 'Gates pendientes', cab: [{ t: 'Proyecto' }, { t: 'Gate' }, { t: 'Fecha' }, { t: 'Días', r: 1 }, { t: 'Avance etapa', r: 1 }, { t: 'Salud' }], filas: items.map(i => [plink(i.p), esc(i.label), `<span class="nowrap">${fecha(i.fecha)}</span>`, relDias(i.dias), i.p.avance_etapa + ' %', chipSalud(i.p.salud)]) },
      n: `${act.length} gates pendientes`
    };
  },

  mapa(T) {
    const act = T.activos, d = dominioMapa(act); const Q = ['Perlas', 'Ostras', 'Pan y mantequilla', 'Elefantes blancos']; const q = Object.fromEntries(Q.map(x => [x, act.filter(p => cuadrante(p, d) === x)]));
    const inv = Q.map((x, i) => ({ label: x, value: q[x].reduce((s, p) => s + p.presupuesto, 0), color: ['var(--olive-d)', 'var(--s3)', 'var(--s2)', 'var(--p-neu)'][i] })); inv.forEach(x => x.txt = money(x.value));
    return {
      lead: 'Diagrama de burbujas del portafolio (Cooper): ubica cada proyecto según su probabilidad de éxito y el valor que generaría. Ayuda a balancear apuestas seguras con apuestas de alto valor y a detectar proyectos que consumen recursos sin promesa.',
      stats: Q.map((x, i) => ({ l: x, v: val(q[x].length, 'proyectos'), d: money(inv[i].value), c: x === 'Elefantes blancos' && q[x].length ? 'warn' : '' })),
      ancho: true,
      fig: { t: 'Mapa riesgo–valor del portafolio', c: `Eje X: probabilidad de éxito; eje Y: VPN esperado. Tamaño = presupuesto; color = horizonte. Las líneas punteadas dividen los cuadrantes (P = ${Math.round(d.xm * 100)} %, VPN = ${mill(d.ym)} COP M).`, b: bubbleMap(act, { w: 1120, h: 540 }) + legend(['H1', 'H2', 'H3'].map(h => ({ color: HZ_COLOR[h], label: HZ_NOMBRE[h] }))) },
      metodo: 'Eje X: P(éxito) = P(técnica) × P(comercial)\nEje Y: VPN esperado si hay éxito (COP millones)\nTamaño: presupuesto total del proyecto\nCuadrantes: corte en la mitad de cada eje',
      lectura: ['<b>Perlas</b> (alto valor, alta probabilidad): acelerar y proteger sus recursos.', '<b>Ostras</b> (alto valor, baja probabilidad): invertir en reducir la incertidumbre técnica antes de escalar.', '<b>Pan y mantequilla</b> (seguros, valor modesto): ejecutar con eficiencia; no deben dominar el portafolio.', '<b>Elefantes blancos</b> (bajo valor y baja probabilidad): candidatos a reformular o detener.'],
      acciones: [...(q['Elefantes blancos'].length ? [`Revisar en comité la continuidad de ${codigos(q['Elefantes blancos'])}.`] : []), ...(q['Ostras'].length ? [`Definir experimentos que reduzcan el riesgo técnico de ${codigos(q['Ostras'])}.`] : []), ...(q['Perlas'].length ? [`Asegurar recursos y calendario para ${codigos(q['Perlas'])}.`] : [])],
      extra: [{ t: 'Inversión por cuadrante', c: 'Dónde está puesto el presupuesto del área.', b: hbars(inv, { lw: 170 }) }],
      tabla: { t: 'Clasificación de proyectos', cab: [{ t: 'Proyecto' }, { t: 'Cuadrante' }, { t: 'P éxito', r: 1 }, { t: 'VPN (COP M)', r: 1 }, { t: 'Presupuesto', r: 1 }, { t: 'Horizonte' }, { t: 'Etapa' }], filas: [...act].sort((a, b) => b.rvpn - a.rvpn).map(p => [plink(p), esc(cuadrante(p, d)), pctTxt(p.p_exito * 100), mill(p.vpn_esperado), mill(p.presupuesto), p.horizonte, esc(ETAPAS[p.etapa])]) },
      n: `${act.length} proyectos activos`
    };
  },

  embudo(T) {
    const act = T.activos; const rows = ETAPAS.map((e, i) => { const ps = act.filter(p => p.etapa === i); return { label: e, value: ps.length, color: stageColor(i), on: i <= 1 ? 'var(--ink)' : '#fff', txt: money(ps.reduce((s, p) => s + p.presupuesto, 0)), tip: tip(e, ps.map(p => esc(p.codigo + ' ' + p.nombre)).join('<br>') || 'Sin proyectos') }; });
    const dur = ETAPAS.map(() => []);
    for (const p of T.proyectos) { let prev = p.fecha_inicio; for (const g of (T.gmap.get(p.id) || []).filter(g => g.decision.startsWith('Go')).sort((a, b) => a.fecha.localeCompare(b.fecha))) { dur[g.etapa_origen].push((Date.parse(g.fecha) - Date.parse(prev)) / 864e5); prev = g.fecha; } }
    const durB = ETAPAS.map((e, i) => ({ label: e, value: dur[i].length ? Math.round(dur[i].reduce((s, v) => s + v, 0) / dur[i].length) : 0, color: stageColor(i), txt: dur[i].length ? `${Math.round(dur[i].reduce((s, v) => s + v, 0) / dur[i].length)} d · n=${dur[i].length}` : 's. d.' }));
    const temp = act.filter(p => p.etapa <= 2).length; const todas = dur.flat(); const medio = todas.length ? Math.round(todas.reduce((s, v) => s + v, 0) / todas.length) : 0;
    return {
      lead: 'Recorrido de los proyectos por las siete etapas del modelo Stage-Gate del área, desde la idea hasta la evaluación ex-post. Cada etapa reduce incertidumbre antes de comprometer más recursos, y cada gate es una decisión explícita de continuar o no.',
      stats: [{ l: 'Activos', v: val(act.length, 'proyectos') }, { l: 'Idea → Prototipo', v: val(temp, 'proyectos') }, { l: 'C. negocio → Ex-post', v: val(act.length - temp, 'proyectos') }, { l: 'Duración media de etapa', v: val(medio, 'días') }],
      fig: { t: 'Embudo de innovación', c: 'Ancho = número de proyectos activos en la etapa; a la derecha, la inversión comprometida.', b: funnel(rows) },
      metodo: 'Etapa = fase de trabajo con entregables definidos\nGate  = decisión al cierre de la etapa\nDuración real = días entre gates consecutivos\n(o desde el inicio del proyecto hasta el primer gate)',
      lectura: ['El embudo debe <b>estrecharse</b>: no todas las ideas deben llegar a piloto.', 'Una etapa con muchos proyectos y larga duración real es un <b>cuello de botella</b>.', 'Las etapas finales concentran la mayor parte del presupuesto: los gates previos son los más baratos para detener un proyecto.'],
      acciones: [`La etapa con más proyectos es «${esc(rows.reduce((m, r) => r.value > m.value ? r : m, rows[0]).label)}»: revisar si su capacidad (planta piloto, laboratorio, equipo) es suficiente.`, ...(durB.filter(x => x.value > 120).map(x => `La etapa «${esc(x.label)}» toma en promedio ${x.value} días: buscar actividades que puedan hacerse en paralelo.`))],
      extra: [{ t: 'Duración real por etapa', c: 'Promedio de días entre gates registrados (n = número de etapas completadas).', b: hbars(durB, { lw: 160 }) }],
      tabla: { t: 'Definición de las etapas del modelo', cab: [{ t: 'Etapa' }, { t: 'Objetivo' }, { t: 'Entregables típicos' }, { t: 'Pregunta del gate' }, { t: 'Proyectos actuales' }], filas: ETAPAS.map((e, i) => [`<b>${esc(e)}</b>`, esc(ETAPA_DEF[i][0]), `<span class="small">${esc(ETAPA_DEF[i][1])}</span>`, `<i>${esc(ETAPA_DEF[i][2])}</i>`, act.filter(p => p.etapa === i).map(p => `<a href="#/proyecto/${p.id}" class="code">${esc(p.codigo)}</a>`).join(' ') || '—']) },
      n: `${act.length} proyectos activos · ${todas.length} etapas completadas`
    };
  },

  horizontes(T) {
    const act = T.activos; const tot = act.reduce((s, p) => s + p.presupuesto, 0) || 1; const meta = { H1: 70, H2: 20, H3: 10 };
    const real = Object.fromEntries(['H1', 'H2', 'H3'].map(h => [h, Math.round(100 * act.filter(p => p.horizonte === h).reduce((s, p) => s + p.presupuesto, 0) / tot)]));
    const ser = ['H1', 'H2', 'H3'].map(h => ({ k: h, label: HZ_NOMBRE[h], color: HZ_COLOR[h] }));
    const tipos = ['Incremental', 'Adyacente', 'Disruptiva']; const mx = Math.max(1, ...tipos.flatMap(t => ['H1', 'H2', 'H3'].map(h => act.filter(p => p.tipo_innovacion === t && p.horizonte === h).length)));
    const cross = `<table class="tbl"><thead><tr><th>Tipo \\ Horizonte</th>${['H1', 'H2', 'H3'].map(h => `<th class="right">${h}</th>`).join('')}</tr></thead><tbody>${tipos.map(t => `<tr><td>${t}</td>${['H1', 'H2', 'H3'].map(h => { const n = act.filter(p => p.tipo_innovacion === t && p.horizonte === h).length; return `<td class="hcell"><div class="hc" style="${heat(n, 0, mx)}">${n}</div></td>`; }).join('')}</tr>`).join('')}</tbody></table>`;
    const dif = ['H1', 'H2', 'H3'].map(h => [h, real[h] - meta[h]]).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0];
    return {
      lead: 'Distribución de la inversión entre el negocio actual (H1), negocios adyacentes (H2) y apuestas transformacionales (H3). Un portafolio equilibrado protege los resultados de hoy sin descuidar el crecimiento futuro.',
      stats: ['H1', 'H2', 'H3'].map(h => ({ l: HZ_NOMBRE[h].split(' (')[0], v: val(real[h], '%'), d: `referencia ${meta[h]} %` })).concat([{ l: 'Disruptivos', v: val(act.filter(p => p.tipo_innovacion === 'Disruptiva').length, 'proyectos') }]),
      fig: { t: 'Distribución real frente a la referencia', c: 'Barras 100 %: participación de cada horizonte en el presupuesto de los proyectos activos.', b: stackRows([{ label: 'Portafolio actual', vals: real, txt: `${real.H1} / ${real.H2} / ${real.H3}` }, { label: 'Referencia 70-20-10', vals: meta, txt: '70 / 20 / 10' }], ser, { lw: 170, max: 100, fmt: v => v + ' %' }) },
      metodo: 'Participación Hx = Σ presupuesto de proyectos Hx\n                 / Σ presupuesto activo\nReferencia de uso común: 70 % H1 · 20 % H2 · 10 % H3\n(ajústala a la estrategia de la empresa)',
      lectura: ['<b>H1 · Núcleo:</b> mejoras a productos y procesos actuales; retorno en 0–2 años.', '<b>H2 · Adyacente:</b> nuevos mercados o tecnologías cercanas; retorno en 2–4 años.', '<b>H3 · Transformacional:</b> apuestas de largo plazo, mayor riesgo y mayor potencial.'],
      acciones: [Math.abs(dif[1]) >= 10 ? `El mayor desbalance está en ${dif[0]} (${dif[1] > 0 ? '+' : ''}${dif[1]} pts frente a la referencia): revisar si es una decisión estratégica explícita.` : 'La mezcla de horizontes está cerca de la referencia.'],
      extra: [{ t: 'Tipo de innovación × horizonte', c: 'Número de proyectos activos en cada combinación.', b: cross }],
      tabla: { t: 'Proyectos por horizonte', cab: [{ t: 'Proyecto' }, { t: 'Horizonte' }, { t: 'Tipo' }, { t: 'Presupuesto (COP M)', r: 1 }, { t: '% del portafolio', r: 1 }, { t: 'rVPN (COP M)', r: 1 }], filas: [...act].sort((a, b) => a.horizonte.localeCompare(b.horizonte) || b.presupuesto - a.presupuesto).map(p => [plink(p), p.horizonte, esc(p.tipo_innovacion), mill(p.presupuesto), Math.round(100 * p.presupuesto / tot) + ' %', mill(p.rvpn)]) },
      n: `${act.length} proyectos activos`
    };
  },

  alertas(T) {
    const al = T.alertas; const nom = { actividad_critica: 'Actividad crítica atrasada', gate_vencido: 'Gate vencido', gate_proximo: 'Gate próximo', riesgo: 'Riesgo alto/crítico', stakeholder: 'Stakeholder crítico', presupuesto: 'Presupuesto excedido', dependencia: 'Conflicto de dependencias', sin_actualizar: 'Sin actualizar' };
    const rows = Object.keys(nom).map(t => ({ label: nom[t], vals: { critica: al.filter(a => a.tipo === t && a.nivel === 'critica').length, alta: al.filter(a => a.tipo === t && a.nivel === 'alta').length, media: al.filter(a => a.tipo === t && a.nivel === 'media').length } })).filter(r => r.vals.critica + r.vals.alta + r.vals.media);
    const porProy = [...new Set(al.map(a => a.proyecto_id))].map(id => ({ p: T.pmap.get(id), n: al.filter(a => a.proyecto_id === id).length, c: al.filter(a => a.proyecto_id === id && a.nivel === 'critica').length })).sort((a, b) => b.c - a.c || b.n - a.n);
    const ic = { critica: '<span class="chip bad">Crítica</span>', alta: '<span class="chip warn">Alta</span>', media: '<span class="chip">Media</span>' };
    return {
      lead: 'Señales que la app calcula automáticamente a partir del cronograma, los gates, el registro de riesgos, los stakeholders y el presupuesto. Se ordenan por criticidad para que el comité empiece por lo que más afecta los resultados.',
      stats: [{ l: 'Críticas', v: val(al.filter(a => a.nivel === 'critica').length, 'alertas'), c: 'bad' }, { l: 'Altas', v: val(al.filter(a => a.nivel === 'alta').length, 'alertas'), c: 'warn' }, { l: 'Medias', v: val(al.filter(a => a.nivel === 'media').length, 'alertas') }, { l: 'Proyectos con alertas', v: val(porProy.length, 'proyectos') }],
      fig: { t: 'Alertas por tipo y nivel', c: 'Qué reglas se están disparando con más frecuencia en el portafolio.', b: stackRows(rows, [{ k: 'critica', label: 'Crítica', color: 'var(--crit)' }, { k: 'alta', label: 'Alta', color: 'var(--serious)' }, { k: 'media', label: 'Media', color: 'var(--warn)' }], { lw: 210 }) },
      metodo: 'CRÍTICA  actividad de la ruta crítica atrasada\n         gate vencido hace más de 14 días\n         riesgo con P×I ≥ 20\nALTA     gate vencido ≤ 14 días · riesgo ≥ 15 sin mitigación\n         stakeholder de alto poder opositor (o reticente\n         desde Caso de negocio) · presupuesto excedido\nMEDIA    gate en ≤ 21 días · conflicto de dependencias\n         proyecto sin actualizar en más de 30 días',
      lectura: ['Las alertas se recalculan cada vez que se abre la app: no hay que «cerrarlas», se resuelven <b>corrigiendo la causa</b>.', 'Un mismo problema puede generar varias alertas (atraso → gate vencido): atiende primero la causa raíz.'],
      acciones: porProy.slice(0, 4).map(x => `Revisar <a href="#/proyecto/${x.p.id}">${esc(x.p.codigo)}</a>: ${x.n} alerta(s), ${x.c} crítica(s).`),
      extra: [{ t: 'Lista priorizada', c: 'Pulsa una alerta para abrir el proyecto.', b: alertasHTML(al, { max: 60, ver: false }) }],
      tabla: { t: 'Registro completo de alertas', cab: [{ t: 'Nivel' }, { t: 'Proyecto' }, { t: 'Alerta' }, { t: 'Detalle' }], filas: al.map(a => [ic[a.nivel], plink(T.pmap.get(a.proyecto_id), { corto: 24 }), esc(a.titulo), `<span class="small">${esc(a.detalle)}</span>`]) },
      n: `${al.length} alertas activas`
    };
  },

  carga(T) {
    const act = new Map(T.activos.map(p => [p.id, p])); const per = new Map();
    for (const a of T.actividades) { const p = act.get(a.proyecto_id); if (!p || a.es_hito || a.avance >= 100) continue; const k = a.responsable || 'Sin asignar'; const e = per.get(k) || { n: 0, atr: 0, crit: 0, proy: new Map(), prox: null }; e.n++; if (a.estado_calc === 'Atrasada') e.atr++; if (a.critica) e.crit++; e.proy.set(p.id, (e.proy.get(p.id) || 0) + 1); if (a.fecha_fin >= T.hoy && (!e.prox || a.fecha_fin < e.prox)) e.prox = a.fecha_fin; per.set(k, e); }
    const arr = [...per.entries()].sort((a, b) => b[1].n - a[1].n); const rol = n => (T.personas.find(x => x.nombre === n) || {}).rol || '—';
    const rows = arr.map(([n, e]) => ({ label: n, vals: { ok: e.n - e.atr, atr: e.atr }, txt: `${e.n}${e.atr ? ` (${e.atr}▲)` : ''}` }));
    const proys = [...act.values()]; const mx = Math.max(1, ...arr.flatMap(([, e]) => [...e.proy.values()]));
    const matriz = `<div class="scroll" style="max-height:none"><table class="tbl"><thead><tr><th>Persona</th>${proys.map(p => `<th class="right" title="${attr(p.nombre)}">${esc(p.codigo.slice(-3))}</th>`).join('')}</tr></thead><tbody>${arr.map(([n, e]) => `<tr><td class="nowrap">${esc(n)}</td>${proys.map(p => { const v = e.proy.get(p.id) || 0; return `<td class="hcell">${v ? `<div class="hc" style="${heat(v, 0, mx)}" data-tip="${tip(n, `${v} actividad(es) abiertas en ${esc(p.codigo)}`)}">${v}</div>` : ''}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>`;
    const tot = arr.reduce((s, [, e]) => s + e.n, 0), atr = arr.reduce((s, [, e]) => s + e.atr, 0); const prom = arr.length ? tot / arr.length : 0;
    const sobre = arr.filter(([, e]) => e.n > prom * 1.4);
    return {
      lead: 'Actividades abiertas asignadas a cada persona en los proyectos activos. Permite detectar cuellos de botella de capacidad antes de que se conviertan en atrasos, y redistribuir trabajo entre el equipo.',
      stats: [{ l: 'Personas con carga', v: val(arr.length, 'personas') }, { l: 'Máximo por persona', v: val(arr[0] ? arr[0][1].n : 0, 'act.'), d: arr[0] ? esc(arr[0][0]) : '' }, { l: 'Promedio', v: val(prom.toFixed(1).replace('.', ','), 'act.') }, { l: 'Atrasadas', v: val(tot ? Math.round(100 * atr / tot) : 0, '%'), c: atr ? 'warn' : 'ok' }],
      fig: { t: 'Actividades abiertas por persona', c: 'Oliva = en plazo; rojo = atrasadas.', b: stackRows(rows, [{ k: 'ok', label: 'En plazo', color: 'var(--olive-d)' }, { k: 'atr', label: 'Atrasadas', color: 'var(--crit)' }], { lw: 170 }) },
      metodo: 'Abiertas  = actividades (sin hitos) con avance < 100 %\n            en proyectos «En curso»\nAtrasadas = fin < hoy, o sin iniciar 7 días después del inicio\nCríticas  = abiertas en la ruta crítica (holgura ≤ 0)',
      lectura: ['Una persona con muchas actividades <b>críticas</b> es un punto único de falla para varios proyectos.', 'La matriz persona × proyecto muestra si el trabajo está concentrado o repartido.'],
      acciones: sobre.map(([n, e]) => `Revisar la carga de ${esc(n)}: ${e.n} actividades abiertas (${e.crit} críticas) en ${e.proy.size} proyectos.`),
      extra: [{ t: 'Matriz persona × proyecto', c: 'Actividades abiertas de cada persona en cada proyecto activo (código en el encabezado).', b: matriz }],
      tabla: { t: 'Carga detallada', cab: [{ t: 'Persona' }, { t: 'Rol' }, { t: 'Abiertas', r: 1 }, { t: 'Atrasadas', r: 1 }, { t: 'Críticas', r: 1 }, { t: 'Proyectos', r: 1 }, { t: 'Próximo vencimiento' }], filas: arr.map(([n, e]) => [`<b>${esc(n)}</b>`, esc(rol(n)), e.n, e.atr, e.crit, e.proy.size, e.prox ? fecha(e.prox) : '—']) },
      n: `${tot} actividades abiertas`
    };
  },

  ranking(T) {
    const act = [...T.activos].sort((a, b) => b.score - a.score); const C = [['s_estrategia', 'Estrategia', 25], ['s_mercado', 'Mercado', 20], ['s_tecnica', 'Técnica', 20], ['s_capacidad', 'Capacidad', 15], ['s_riesgo', 'Bajo riesgo', 20]];
    const tbl = `<div class="scroll" style="max-height:none"><table class="tbl"><thead><tr><th>#</th><th>Proyecto</th>${C.map(([, n, w]) => `<th class="right">${n}<br><span class="u">${w} %</span></th>`).join('')}<th style="min-width:140px">Score</th></tr></thead><tbody>${act.map((p, i) => `<tr><td class="num">${i + 1}</td><td>${plink(p, { corto: 34 })}</td>${C.map(([k]) => `<td class="hcell"><div class="hc" style="${heat(p[k], 1, 5)}">${p[k]}</div></td>`).join('')}<td><div class="row"><div class="bar" style="flex:1"><i style="width:${p.score}%;background:${HZ_COLOR[p.horizonte]}"></i></div><b class="num">${p.score}</b></div></td></tr>`).join('')}</tbody></table></div>`;
    const ymax = Math.ceil(Math.max(...act.map(p => p.rvpn), 1000) * 1.1 / 1000) * 1000;
    const pts = act.map(p => ({ x: p.score, y: p.rvpn, label: p.codigo.slice(-3), color: HZ_COLOR[p.horizonte], href: '#/proyecto/' + p.id, tip: tip(p.codigo + ' · ' + p.nombre, `Score ${p.score} · rVPN ${money(p.rvpn)}`) }));
    const s = act.map(p => p.score); const prom = s.length ? s.reduce((a, b) => a + b, 0) / s.length : 0;
    const desal = act.filter(p => p.score >= 80 && p.rvpn < (T.kpis.rvpn / Math.max(1, act.length)) * 0.7);
    return {
      lead: 'Modelo de puntuación que ordena los proyectos activos según cinco criterios clásicos de gestión de portafolios. Sirve para decidir a qué proyectos asignar primero los recursos escasos (personas, planta piloto, presupuesto).',
      stats: [{ l: 'Score medio', v: val(Math.round(prom), '/100') }, { l: 'Mejor', v: val(s[0] || 0, '/100'), d: act[0] ? esc(act[0].codigo) : '' }, { l: 'Más bajo', v: val(s[s.length - 1] || 0, '/100'), d: act.length ? esc(act[act.length - 1].codigo) : '' }, { l: 'Proyectos ≥ 80', v: val(s.filter(x => x >= 80).length, 'proyectos') }],
      ancho: true,
      fig: { t: 'Matriz de puntuación', c: 'Calificación de 1 a 5 en cada criterio (más oscuro = mejor) y score ponderado; la barra usa el color del horizonte.', b: tbl + legend(['H1', 'H2', 'H3'].map(h => ({ color: HZ_COLOR[h], label: HZ_NOMBRE[h] }))) },
      metodo: 'Score = Σ peso × (criterio / 5)\nPesos: estrategia 25 · mercado 20 · técnica 20\n       capacidad 15 · bajo riesgo 20\nCada criterio se califica de 1 a 5 en la revisión del gate',
      lectura: ['El score refleja <b>juicio experto estructurado</b>; el rVPN refleja la <b>economía</b>. Ambos deben conversar.', 'Proyectos con score alto y rVPN bajo pueden ser estratégicos (habilitadores) o estar sobrevalorados.', 'Recalifica los criterios en cada gate con la evidencia nueva.'],
      acciones: [...(desal.length ? [`Validar la justificación estratégica de ${codigos(desal)}: score alto con valor esperado bajo.`] : []), `Asignar primero la capacidad de planta piloto y laboratorio a ${codigos(act.slice(0, 3))}.`],
      extra: [{ t: 'Score frente a valor esperado', c: 'Eje X: score de priorización; eje Y: rVPN. Arriba a la derecha = prioridad clara.', b: scatterXY(pts, { xmin: 40, xmax: 100, ymin: 0, ymax, xlab: 'Score de priorización (0–100)', ylab: 'rVPN (COP millones)', yfmt: v => nf.format(v) }) + legend(['H1', 'H2', 'H3'].map(h => ({ color: HZ_COLOR[h], label: h }))) }],
      tabla: null,
      n: `${act.length} proyectos activos`
    };
  },

  expost(T) {
    const ps = T.proyectos.filter(p => (T.emap.get(p.id) || []).length); const ex = ps.flatMap(p => (T.emap.get(p.id) || []).map(e => ({ p, e, r: e.mayor_mejor ? e.real / e.meta : e.meta / e.real })));
    const ok = ex.filter(x => x.r >= 1).length; const prom = ex.length ? Math.round(100 * ex.reduce((s, x) => s + x.r, 0) / ex.length) : 0;
    const lecc = ps.map(p => `<div style="padding:10px 0;border-bottom:1px solid var(--line)"><div class="row">${plink(p)}<span class="sp"></span>${chipSalud(p.salud)}</div>${p.decision_final ? `<div class="small" style="margin-top:4px"><b>Decisión:</b> ${esc(p.decision_final)}</div>` : ''}${p.lecciones ? `<div class="small muted" style="margin-top:3px">${esc(p.lecciones)}</div>` : ''}</div>`).join('');
    return {
      lead: 'Comparación entre los resultados reales y las metas del caso de negocio una vez lanzado el producto. Cierra el ciclo de aprendizaje del área: confirma qué supuestos fueron correctos y qué debe mejorar en los próximos proyectos.',
      stats: [{ l: 'Proyectos evaluados', v: val(ps.length, 'proyectos') }, { l: 'Indicadores', v: val(ex.length, 'KPIs') }, { l: 'Metas logradas', v: val(ex.length ? Math.round(100 * ok / ex.length) : 0, '%'), c: ok / Math.max(1, ex.length) >= .6 ? 'ok' : 'warn' }, { l: 'Cumplimiento medio', v: val(prom, '%') }],
      fig: { t: 'Cumplimiento por indicador', c: 'Verde ≥ 100 % de la meta; amarillo 85–99 %; rojo por debajo.', b: tablero.expost() },
      metodo: 'Cumplimiento = real / meta      (si más es mejor)\nCumplimiento = meta / real      (si menos es mejor)\nMeta lograda ⇔ cumplimiento ≥ 100 %',
      lectura: ['Las desviaciones de <b>tiempo y costo</b> alimentan la planificación de los siguientes proyectos.', 'Las desviaciones de <b>ventas y margen</b> ponen a prueba los supuestos del caso de negocio.'],
      acciones: ex.filter(x => x.r < .85).map(x => `Analizar la brecha en «${esc(x.e.kpi)}» de ${esc(x.p.codigo)}: ${Math.round(x.r * 100)} % de la meta.`),
      extra: [{ t: 'Decisiones y lecciones aprendidas', c: 'Conocimiento que el área debe reutilizar.', b: lecc || '<div class="empty">Sin registros.</div>' }],
      tabla: { t: 'Indicadores ex-post', cab: [{ t: 'Proyecto' }, { t: 'Indicador' }, { t: 'Meta', r: 1 }, { t: 'Real', r: 1 }, { t: 'Unidad' }, { t: 'Cumplimiento', r: 1 }], filas: ex.map(x => [plink(x.p, { corto: 26 }), esc(x.e.kpi), nf.format(x.e.meta), nf.format(x.e.real), esc(x.e.unidad || ''), `<span class="chip ${x.r >= 1 ? 'ok' : x.r >= .85 ? 'warn' : 'bad'}">${Math.round(x.r * 100)} %</span>`]) },
      n: `${ex.length} indicadores en ${ps.length} proyectos`
    };
  }
};

// ---------- vistas ----------
export const detalle = {
  render({ id }) {
    const T = S.T; const i = IND.findIndex(x => x.k === id);
    if (i < 0) return `<div class="empty">Indicador no encontrado. <a href="#/indicadores">Ver índice</a></div>`;
    const m = IND[i], d = D[id](T); let f = 1;
    const fig = (x, n) => `<figure class="figure" style="margin:0"><div class="fh"><span class="kicker">Fig. ${n}</span><h2>${x.t}</h2></div><figcaption>${x.c}</figcaption>${x.b}</figure>`;
    const prev = IND[(i - 1 + IND.length) % IND.length], next = IND[(i + 1) % IND.length];
    return `<div class="doc-head"><nav class="crumbs"><a href="#/tablero">Tablero</a> / <a href="#/indicadores">Indicadores</a> / <b>${esc(m.t)}</b></nav>
      <div class="kicker">${m.g} ${pad(i + 1)} · Gestión del portafolio I+D+i</div><h1>${esc(m.t)}</h1><p class="lead">${d.lead}</p>
      <div class="stats">${d.stats.map(s => `<div><div class="l">${s.l}</div><div class="v ${s.c || ''}">${s.v}</div>${s.d ? `<div class="d">${s.d}</div>` : ''}</div>`).join('')}</div></div>
    ${(() => { const met = [`<div><h3>Método de cálculo</h3><div class="formula">${esc(d.metodo)}</div></div>`, `<div><h3>Cómo leerlo</h3><ul>${d.lectura.map(l => `<li>${l}</li>`).join('')}</ul></div>`, `<div><h3>Qué hacer ahora</h3>${lista(d.acciones)}</div>`];
      return d.ancho ? `<div class="grid">${fig(d.fig, f++)}<aside class="method wide">${met.join('')}</aside></div>` : `<div class="grid g-32">${fig(d.fig, f++)}<aside class="method">${met.join('')}</aside></div>`; })()}
    ${d.extra && d.extra.length ? `<div class="grid ${d.extra.length > 1 ? 'g2' : ''} mt">${d.extra.map(x => fig(x, f++)).join('')}</div>` : ''}
    ${d.tabla ? `<section class="figure mt"><div class="fh"><span class="kicker">Tabla 1</span><h2>${d.tabla.t}</h2></div><figcaption>Pulsa el nombre de un proyecto para ver su página, o ↗ para abrirla en una pestaña nueva.</figcaption>${tabla(d.tabla.cab, d.tabla.filas, { max: d.tabla.filas.length > 18 ? 640 : null })}</section>` : ''}
    <div class="docnote"><span class="mono">FUENTE</span> Base de datos local (SQLite) de la app <span class="mono">· CORTE</span> ${fecha(T.hoy)} <span class="mono">· n</span> = ${esc(d.n)}<span class="sp"></span><button class="btn sm noprint" data-act="imprimir">Imprimir / PDF</button></div>
    <nav class="pager noprint"><a href="#/detalle/${prev.k}"><small>← Anterior</small>${esc(prev.t)}</a><a class="nx" href="#/detalle/${next.k}"><small>Siguiente →</small>${esc(next.t)}</a></nav>`;
  }
};

export const indicadores = {
  render() {
    const T = S.T; const grupo = g => IND.map((x, i) => [x, i]).filter(([x]) => x.g === g).map(([x, i]) => `<a href="#/detalle/${x.k}"><span class="kicker">${x.g} ${pad(i + 1)}</span><div style="font-weight:500;margin-top:2px">${esc(x.t)}</div><p>${esc(x.r)}</p></a>`).join('');
    return `<div class="doc-head"><nav class="crumbs"><a href="#/tablero">Tablero</a> / <b>Indicadores</b></nav><div class="kicker">Índice · ${IND.length} pantallas de detalle</div><h1>Indicadores y figuras del portafolio</h1><p class="lead">Cada elemento del tablero tiene su propia pantalla con una explicación, el método de cálculo, cómo interpretarlo, acciones sugeridas a partir de los datos actuales y la tabla completa con enlace a cada proyecto.</p></div>
    <h2 class="mb">Indicadores clave</h2><div class="idx mb">${grupo('Indicador clave')}</div>
    <h2 class="mb" style="margin-top:22px">Figuras del tablero</h2><div class="idx">${grupo('Figura')}</div>
    <div class="docnote"><span class="mono">CORTE</span> ${fecha(T.hoy)} · ${esc(T.empresa)}</div>`;
  }
};
