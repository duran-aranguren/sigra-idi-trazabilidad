// Gráficas SVG/HTML sin librerías. Todas devuelven strings HTML.
import { esc, attr, nf, money, fecha, fechaCorta, dnum, ETAPAS, ETAPA_CORTA, HZ_COLOR, HZ_TEXT, POSTURA_COLOR, stageColor, S } from './core.js';

const tip = (t1, t2) => attr(`<b>${esc(t1)}</b>${t2 ? `<div class="t2">${t2}</div>` : ''}`);
export { tip };

// ---- barras horizontales (HTML) ----
export function hbars(items, { fmt = v => nf.format(v), max, lw } = {}) {
  const m = max ?? Math.max(1, ...items.map(i => i.value));
  return `<div class="hbars" ${lw ? `style="--lw:${lw}px"` : ''}>${items.map(i => `<div class="hb" ${i.tip ? `data-tip="${i.tip}"` : ''} ${i.href ? `data-href="${attr(i.href)}" style="cursor:pointer"` : ''}><div class="lb" title="${attr(i.label)}">${esc(i.label)}</div><div class="tr"><i style="width:${Math.max(0.5, 100 * i.value / m)}%;background:${i.color || 'var(--olive-d)'}"></i></div><div class="vl">${i.txt ?? fmt(i.value)}</div></div>`).join('')}</div>`;
}

// ---- dona ----
export function donut(items, { size = 150, centro = '', sub = '' } = {}) {
  const tot = items.reduce((s, i) => s + i.value, 0) || 1; const r = size / 2 - 8, c = size / 2, w = 22; let a0 = -Math.PI / 2;
  const arc = (a, b) => { const x = (ang, rr) => c + rr * Math.cos(ang), y = (ang, rr) => c + rr * Math.sin(ang), g = b - a > Math.PI ? 1 : 0, R = r, r2 = r - w;
    return `M${x(a, R)},${y(a, R)} A${R},${R} 0 ${g} 1 ${x(b, R)},${y(b, R)} L${x(b, r2)},${y(b, r2)} A${r2},${r2} 0 ${g} 0 ${x(a, r2)},${y(a, r2)} Z`; };
  let paths = '';
  for (const i of items) { if (!i.value) continue; const a1 = a0 + 2 * Math.PI * i.value / tot - (items.filter(x => x.value).length > 1 ? 0.03 : 0);
    paths += `<path d="${arc(a0, Math.max(a0 + 0.01, a1 - 0.0))}" style="fill:${i.color}" class="pt" data-tip="${i.tip || tip(i.label, `${i.txt ?? nf.format(i.value)} · ${(100 * i.value / tot).toFixed(0)} %`)}"/>`; a0 += 2 * Math.PI * i.value / tot; }
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${attr(centro + ' ' + sub)}">${paths}<text x="${c}" y="${c + 3}" text-anchor="middle" class="tx" style="font-size:${size / 6}px;font-weight:700">${esc(centro)}</text><text x="${c}" y="${c + size / 7}" text-anchor="middle" class="tx2" style="font-size:${size / 13}px">${esc(sub)}</text></svg>`;
}
export const legend = items => `<div class="legend">${items.map(i => `<span><b style="background:${i.color}"></b>${esc(i.label)}${i.n != null ? ` <span class="faint">(${i.n})</span>` : ''}</span>`).join('')}</div>`;

// ---- mapa de portafolio (burbujas): prob. de éxito vs VPN, tamaño = presupuesto, color = horizonte ----
export function dominioMapa(ps) {
  const xmax = Math.min(1, Math.ceil(Math.max(...ps.map(p => p.p_exito), .5) * 10 + 1) / 10), ymax = Math.ceil(Math.max(...ps.map(p => p.vpn_esperado), 1000) * 1.1 / 4000) * 4000;
  return { xmax, ymax, xm: xmax / 2, ym: ymax / 2 };
}
export function cuadrante(p, d) { const a = p.p_exito >= d.xm, v = p.vpn_esperado >= d.ym; return a && v ? 'Perlas' : !a && v ? 'Ostras' : a && !v ? 'Pan y mantequilla' : 'Elefantes blancos'; }
export function bubbleMap(ps, { w = 760, h = 430 } = {}) {
  const m = { l: 64, r: 24, t: 20, b: 50 }; const iw = w - m.l - m.r, ih = h - m.t - m.b;
  const { xmax, ymax } = dominioMapa(ps);
  const X = v => m.l + iw * v / xmax, Y = v => m.t + ih * (1 - v / ymax);
  const rmax = Math.max(...ps.map(p => p.presupuesto), 1); const R = p => 7 + 19 * Math.sqrt(p.presupuesto / rmax);
  const xm = xmax / 2, ym = ymax / 2; let s = '';
  for (let i = 0; i <= 4; i++) { const v = ymax * i / 4; s += `<line x1="${m.l}" x2="${w - m.r}" y1="${Y(v)}" y2="${Y(v)}" class="gl"/><text x="${m.l - 8}" y="${Y(v) + 4}" text-anchor="end" class="tx3" font-size="11">${v >= 1000 ? nf.format(v / 1000) + ' mil' : v}</text>`; }
  for (let i = 0; i <= 4; i++) { const v = xmax * i / 4; s += `<text x="${X(v)}" y="${h - m.b + 18}" text-anchor="middle" class="tx3" font-size="11">${Math.round(v * 100)} %</text>`; }
  s += `<line x1="${X(xm)}" x2="${X(xm)}" y1="${m.t}" y2="${h - m.b}" class="ax" stroke-dasharray="4 4"/><line x1="${m.l}" x2="${w - m.r}" y1="${Y(ym)}" y2="${Y(ym)}" class="ax" stroke-dasharray="4 4"/>`;
  const ql = (t, x, y, a) => `<text x="${x}" y="${y}" text-anchor="${a}" class="tx3" font-size="11.5" font-weight="650" letter-spacing=".05em">${t}</text>`;
  s += ql('PERLAS', w - m.r - 6, m.t + 14, 'end') + ql('OSTRAS', m.l + 6, m.t + 14, 'start') + ql('PAN Y MANTEQUILLA', w - m.r - 6, h - m.b - 8, 'end') + ql('ELEFANTES BLANCOS', m.l + 6, h - m.b - 8, 'start');
  s += `<text x="${m.l + iw / 2}" y="${h - 6}" text-anchor="middle" class="tx2" font-size="12">Probabilidad de éxito (técnica × comercial)</text><text transform="translate(14 ${m.t + ih / 2}) rotate(-90)" text-anchor="middle" class="tx2" font-size="12">VPN esperado (COP millones)</text>`;
  const orden = [...ps].sort((a, b) => b.presupuesto - a.presupuesto);
  for (const p of orden) {
    const t = tip(`${p.codigo} · ${p.nombre}`, `Éxito ${(p.p_exito * 100).toFixed(0)} % · VPN ${money(p.vpn_esperado)}<br>rVPN ${money(p.rvpn)} · Presupuesto ${money(p.presupuesto)}<br>${ETAPAS[p.etapa]} · ${p.horizonte}`);
    s += `<g class="pt" data-href="#/proyecto/${p.id}" data-tip="${t}"><circle cx="${X(p.p_exito)}" cy="${Y(p.vpn_esperado)}" r="${R(p)}" style="fill:${HZ_COLOR[p.horizonte]};fill-opacity:.9;stroke:var(--surface);stroke-width:2"/><text x="${X(p.p_exito)}" y="${Y(p.vpn_esperado) + 3.5}" text-anchor="middle" font-size="10" font-weight="500" style="fill:${HZ_TEXT[p.horizonte]};pointer-events:none;font-family:var(--mono)">${p.codigo.slice(-3)}</text></g>`;
  }
  return `<div class="chartwrap"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Mapa de portafolio: probabilidad de éxito contra VPN esperado">${s}</svg></div>`;
}

// ---- matriz de riesgos 5x5 ----
export function riskHeat(restr, { sel = null, actBase = 'riesgo' } = {}) {
  const cnt = Array.from({ length: 6 }, () => Array(6).fill(0)); for (const r of restr) cnt[r.probabilidad][r.impacto]++;
  const w = 420, h = 360, m = { l: 62, t: 14, b: 54 }, cw = (w - m.l - 10) / 5, ch = (h - m.t - m.b) / 5; let s = '';
  const zona = sc => sc >= 20 ? '--z3' : sc >= 15 ? '--z2' : sc >= 8 ? '--z1' : '--z0';
  for (let p = 5; p >= 1; p--) for (let i = 1; i <= 5; i++) {
    const x = m.l + (i - 1) * cw, y = m.t + (5 - p) * ch, n = cnt[p][i], sc = p * i, on = sel && sel[0] === p && sel[1] === i;
    s += `<g class="pt" data-act="celda-riesgo" data-p="${p}" data-i="${i}" data-tip="${tip(`Prob. ${p} × Impacto ${i} = ${sc}`, `${n} riesgo(s) / restricción(es)`)}"><rect x="${x + 1.5}" y="${y + 1.5}" width="${cw - 3}" height="${ch - 3}" rx="6" style="fill:var(${zona(sc)});${on ? 'stroke:var(--ink);stroke-width:2' : ''}"/>${n ? `<circle cx="${x + cw / 2}" cy="${y + ch / 2}" r="14" style="fill:var(--ink)"/><text x="${x + cw / 2}" y="${y + ch / 2 + 4.5}" text-anchor="middle" font-size="13" font-weight="700" style="fill:var(--surface)">${n}</text>` : `<text x="${x + cw / 2}" y="${y + ch / 2 + 4}" text-anchor="middle" font-size="10" class="tx3">${sc}</text>`}</g>`;
  }
  for (let i = 1; i <= 5; i++) { s += `<text x="${m.l + (i - .5) * cw}" y="${h - m.b + 18}" text-anchor="middle" class="tx3" font-size="11.5">${i}</text><text x="${m.l - 10}" y="${m.t + (5 - i + .5) * ch + 4}" text-anchor="end" class="tx3" font-size="11.5">${i}</text>`; }
  s += `<text x="${m.l + (w - m.l - 10) / 2}" y="${h - 10}" text-anchor="middle" class="tx2" font-size="12">Impacto en el proyecto →</text><text transform="translate(14 ${m.t + 2.5 * ch}) rotate(-90)" text-anchor="middle" class="tx2" font-size="12">Probabilidad →</text>`;
  return `<div class="chartwrap" style="max-width:${w}px"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Matriz de riesgos probabilidad por impacto">${s}</svg></div>
  ${legend([{ color: 'var(--z0)', label: 'Bajo (<8)' }, { color: 'var(--z1)', label: 'Medio (8-14)' }, { color: 'var(--z2)', label: 'Alto (15-19)' }, { color: 'var(--z3)', label: 'Crítico (≥20)' }])}`;
}

// ---- mapa de stakeholders poder × interés ----
export function stakeGrid(items, { w = 560, h = 440, etiquetas = true } = {}) {
  const m = { l: 50, r: 14, t: 14, b: 44 }, iw = w - m.l - m.r, ih = h - m.t - m.b; const cw = iw / 5, chh = ih / 5; let s = '';
  const X = v => m.l + (v - .5) * cw, Y = v => m.t + (5 - v + .5) * chh;
  s += `<rect x="${m.l}" y="${m.t}" width="${iw}" height="${ih}" rx="8" style="fill:var(--surface2)"/>`;
  s += `<rect x="${m.l + iw * 0.6}" y="${m.t}" width="${iw * 0.4}" height="${ih * 0.4}" style="fill:color-mix(in srgb,var(--s1) 12%,transparent)"/>`;
  s += `<line x1="${m.l + iw * .6}" x2="${m.l + iw * .6}" y1="${m.t}" y2="${m.t + ih}" class="ax"/><line x1="${m.l}" x2="${m.l + iw}" y1="${m.t + ih * .4}" y2="${m.t + ih * .4}" class="ax"/>`;
  const ql = (t, x, y, a) => `<text x="${x}" y="${y}" text-anchor="${a}" class="tx3" font-size="11" font-weight="650" letter-spacing=".04em">${t}</text>`;
  s += ql('GESTIONAR DE CERCA', m.l + iw - 8, m.t + 16, 'end') + ql('MANTENER SATISFECHO', m.l + 8, m.t + 16, 'start') + ql('MANTENER INFORMADO', m.l + iw - 8, m.t + ih - 8, 'end') + ql('MONITOREAR', m.l + 8, m.t + ih - 8, 'start');
  for (let i = 1; i <= 5; i++) s += `<text x="${X(i)}" y="${h - m.b + 17}" text-anchor="middle" class="tx3" font-size="11.5">${i}</text><text x="${m.l - 9}" y="${Y(i) + 4}" text-anchor="end" class="tx3" font-size="11.5">${i}</text>`;
  s += `<text x="${m.l + iw / 2}" y="${h - 8}" text-anchor="middle" class="tx2" font-size="12">Interés en el proyecto →</text><text transform="translate(13 ${m.t + ih / 2}) rotate(-90)" text-anchor="middle" class="tx2" font-size="12">Poder / influencia →</text>`;
  const celdas = new Map(); for (const it of items) { const k = it.poder + '-' + it.interes; if (!celdas.has(k)) celdas.set(k, []); celdas.get(k).push(it); }
  for (const arr of celdas.values()) arr.forEach((it, idx) => {
    const n = arr.length; const ang = (2 * Math.PI * idx) / n; const rad = n === 1 ? 0 : Math.min(cw, chh) * (n > 4 ? .36 : n > 2 ? .3 : .26);
    const cx = X(it.interes) + rad * Math.cos(ang), cy = Y(it.poder) + rad * Math.sin(ang), r = it.r || 11;
    s += `<g class="pt" ${it.href ? `data-href="${attr(it.href)}"` : ''} data-tip="${it.tip}"><circle cx="${cx}" cy="${cy}" r="${r}" style="fill:${POSTURA_COLOR[it.postura]};stroke:var(--surface);stroke-width:2"/>${it.n ? `<text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="10.5" font-weight="700" fill="#fff" style="pointer-events:none">${it.n}</text>` : ''}${etiquetas && it.label ? `<text x="${cx}" y="${cy + r + 11}" text-anchor="middle" class="tx2" font-size="10" style="pointer-events:none">${esc(it.label)}</text>` : ''}</g>`;
  });
  return `<div class="chartwrap"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Mapa de stakeholders poder por interés">${s}</svg></div>
  ${legend(Object.keys(POSTURA_COLOR).map(k => ({ color: POSTURA_COLOR[k], label: k })))}`;
}

// ---- radar (5 criterios de portafolio) ----
export function radar(vals, labels, { size = 250 } = {}) {
  const c = size / 2, R = size / 2 - 52, n = vals.length; const P = (i, v) => { const a = -Math.PI / 2 + 2 * Math.PI * i / n; return [c + R * v / 5 * Math.cos(a), c + R * v / 5 * Math.sin(a)]; };
  let s = '';
  for (let lv = 1; lv <= 5; lv++) s += `<polygon points="${vals.map((_, i) => P(i, lv).join(',')).join(' ')}" style="fill:none;stroke:var(--line)" stroke-width="1"/>`;
  vals.forEach((_, i) => { const [x, y] = P(i, 5.7); const [ax, ay] = P(i, 5); const anc = x > c + 8 ? 'start' : x < c - 8 ? 'end' : 'middle'; s += `<line x1="${c}" y1="${c}" x2="${ax}" y2="${ay}" class="gl"/><text x="${x + (anc === 'start' ? 4 : anc === 'end' ? -4 : 0)}" y="${y + (anc === 'middle' ? (y < c ? -2 : 10) : 4)}" text-anchor="${anc}" class="tx2" font-size="11">${esc(labels[i])}</text>`; });
  s += `<polygon points="${vals.map((v, i) => P(i, v).join(',')).join(' ')}" style="fill:var(--brand-olive);fill-opacity:.22;stroke:var(--olive-d)" stroke-width="2" stroke-linejoin="round"/>`;
  vals.forEach((v, i) => { const [x, y] = P(i, v); s += `<circle cx="${x}" cy="${y}" r="4.5" style="fill:var(--brand-gold);stroke:var(--olive-d);stroke-width:1.5" data-tip="${tip(labels[i], v + ' de 5')}"/>`; });
  return `<svg viewBox="-46 0 ${size + 92} ${size}" width="100%" style="max-width:${size + 92}px" role="img" aria-label="Radar de criterios de portafolio">${s}</svg>`;
}

// ---- chevrons de etapa ----
export const chevrons = (etapa, cerrado) => `<div class="chev">${ETAPAS.map((e, i) => `<div class="${i < etapa || (cerrado && i <= etapa) ? 'past' : i === etapa ? 'now' : ''}" title="${attr(e)}">${esc(e)}</div>`).join('')}</div>`;
export const trlBar = trl => `<div class="trl" data-tip="${tip('TRL ' + trl + ' de 9', 'Nivel de madurez tecnológica')}">${Array.from({ length: 9 }, (_, i) => `<i class="${i < trl ? 'on' : ''}"></i>`).join('')}</div>`;

// ---- Gantt con ruta crítica ----
export function gantt(acts, { hoy, w = 1180, filas = true } = {}) {
  if (!acts.length) return '<div class="empty">Sin actividades. Agrega una o genera el plan de la etapa.</div>';
  const t0 = Math.min(...acts.map(a => dnum(a.fecha_inicio))) - 3, t1 = Math.max(...acts.map(a => dnum(a.fecha_fin)), dnum(hoy)) + 5;
  const L = 340, rh = 24, top = 46, W = w, iw = W - L - 12; const X = d => L + iw * (d - t0) / (t1 - t0);
  // filas con separadores por etapa
  const rows = []; let last = -1; for (const a of acts) { if (a.etapa !== last) { rows.push({ sep: a.etapa }); last = a.etapa; } rows.push(a); }
  const H = top + rows.length * rh + 14; let s = ''; const pos = new Map();
  // cabecera de meses
  const d0 = new Date(t0 * 86400000), d1 = new Date(t1 * 86400000); let d = new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth(), 1));
  const paso = (t1 - t0) > 540 ? 3 : 1;
  while (d <= d1) { const x = X(Math.round(d.getTime() / 86400000)); if (x >= L) s += `<line x1="${x}" x2="${x}" y1="${top - 8}" y2="${H - 8}" class="gl"/><text x="${x + 4}" y="${top - 14}" class="tx3" font-size="11">${d.toLocaleDateString('es-CO', { month: 'short', year: '2-digit', timeZone: 'UTC' }).replace('.', '')}</text>`; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + paso, 1)); }
  rows.forEach((a, i) => { const y = top + i * rh; if (a.sep != null) { s += `<rect x="0" y="${y}" width="${W}" height="${rh}" style="fill:var(--surface2)"/><text x="10" y="${y + 16}" class="tx2" font-size="11.5" font-weight="700">${esc(ETAPAS[a.sep].toUpperCase())}</text>`; return; } pos.set(a.id, { y: y + rh / 2, a }); });
  // dependencias
  for (const { y, a } of pos.values()) for (const pid of a.predecesoras || []) { const p = pos.get(pid); if (!p) continue; const x1 = X(dnum(p.a.fecha_fin)), x2 = X(dnum(a.fecha_inicio)); const crit = p.a.critica && a.critica; const xm = Math.max(x1 + 5, Math.min(x2 - 5, x1 + 6));
    s += `<path d="M${x1},${p.y} H${xm} V${y} H${Math.max(x2, xm)}" fill="none" style="stroke:${crit ? 'var(--crit)' : 'var(--line2)'}" stroke-width="${crit ? 1.4 : 1}" opacity="${crit ? .85 : .9}"/>`; }
  for (const { y, a } of pos.values()) {
    const x1 = X(dnum(a.fecha_inicio)), x2 = Math.max(X(dnum(a.fecha_fin)), x1 + 3); const bh = 11, by = y - bh / 2;
    const col = a.critica && a.avance < 100 ? 'var(--crit)' : stageColor(a.etapa); const done = a.avance >= 100;
    const t = tip(a.nombre, `${a.responsable || 'Sin responsable'} · ${fecha(a.fecha_inicio)} → ${fecha(a.fecha_fin)}<br>Avance ${a.avance} % · ${a.estado_calc}${a.holgura != null ? ` · holgura ${a.holgura} d` : ''}${a.critica ? '<br><b>Ruta crítica</b>' : ''}${a.conflicto && a.conflicto.length ? '<br>⚠ Inicia antes de que termine: ' + esc(a.conflicto.join(', ')) : ''}`);
    s += `<g class="pt" data-act="editar-act" data-id="${a.id}" data-tip="${t}">`;
    if (a.es_hito) s += `<path d="M${x2},${y - 8} l8,8 l-8,8 l-8,-8 Z" style="fill:${a.avance >= 100 ? 'var(--ink)' : 'var(--surface)'};stroke:var(--ink);stroke-width:2"/>`;
    else s += `<rect x="${x1}" y="${by}" width="${x2 - x1}" height="${bh}" rx="4" style="fill:${col};fill-opacity:.28"/><rect x="${x1}" y="${by}" width="${(x2 - x1) * a.avance / 100}" height="${bh}" rx="4" style="fill:${col}"/>`;
    if (a.estado_calc === 'Atrasada') s += `<text x="${x2 + 6}" y="${y + 4}" font-size="10.5" font-weight="700" style="fill:var(--crit-t)">▲ ${a.dias_atraso} d</text>`;
    s += `<text x="10" y="${y + 4}" font-size="12" class="${done ? 'txd' : 'tx'}"${a.critica && !done ? ' font-weight="650"' : ''}>${esc(a.nombre.length > 50 ? a.nombre.slice(0, 49) + '…' : a.nombre)}</text></g>`;
  }
  const xh = X(dnum(hoy)); s += `<line x1="${xh}" x2="${xh}" y1="${top - 6}" y2="${H - 8}" style="stroke:var(--s2)" stroke-width="2"/><text x="${xh}" y="${top - 30}" text-anchor="middle" font-size="11" font-weight="700" style="fill:var(--s2)">Hoy</text>`;
  s += `<line x1="${L - 6}" x2="${L - 6}" y1="${top}" y2="${H - 8}" class="ax"/>`;
  return `<div class="chartwrap"><svg viewBox="0 0 ${W} ${H}" style="min-width:900px" role="img" aria-label="Diagrama de Gantt con ruta crítica">${s}</svg></div>
  ${legend([{ color: 'var(--crit)', label: 'Ruta crítica (holgura 0)' }, { color: 'var(--st3)', label: 'Con holgura (color = etapa)' }, { color: 'var(--ink)', label: '◆ Hito / gate' }])}`;
}

// ---- línea de tiempo del portafolio ----
export function portfolioTimeline(ps, gmap, hoy, { w = 1180 } = {}) {
  const t0 = Math.min(...ps.map(p => dnum(p.fecha_inicio))) - 10, t1 = Math.max(...ps.map(p => dnum(p.fecha_objetivo)), dnum(hoy)) + 20;
  const L = 250, rh = 30, top = 36, iw = w - L - 14; const X = d => L + iw * (d - t0) / (t1 - t0); const H = top + ps.length * rh + 12; let s = '';
  let d = new Date(Date.UTC(new Date(t0 * 86400000).getUTCFullYear(), new Date(t0 * 86400000).getUTCMonth(), 1));
  while (d.getTime() / 86400000 <= t1) { const x = X(Math.round(d.getTime() / 86400000)); if (x > L) s += `<line x1="${x}" x2="${x}" y1="${top - 6}" y2="${H - 8}" class="gl"/><text x="${x + 4}" y="${top - 12}" class="tx3" font-size="11">${d.toLocaleDateString('es-CO', { month: 'short', year: '2-digit', timeZone: 'UTC' }).replace('.', '')}</text>`; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 3, 1)); }
  ps.forEach((p, i) => {
    const y = top + i * rh + rh / 2, gs = (gmap.get(p.id) || []).filter(g => g.decision.startsWith('Go') && g.etapa_destino > g.etapa_origen).sort((a, b) => a.fecha.localeCompare(b.fecha));
    let ini = dnum(p.fecha_inicio); const fin = p.estado === 'Cerrado' ? dnum(hoy) : dnum(hoy);
    const segs = []; let e = 0; for (const g of gs) { segs.push([e, ini, dnum(g.fecha)]); ini = dnum(g.fecha); e = g.etapa_destino; }
    segs.push([p.etapa, ini, Math.max(ini + 1, fin)]);
    s += `<g class="pt" data-href="#/proyecto/${p.id}" data-tip="${tip(p.codigo + ' · ' + p.nombre, `${ETAPAS[p.etapa]} · ${p.estado}<br>Inicio ${fecha(p.fecha_inicio)} · Objetivo ${fecha(p.fecha_objetivo)}`)}"><text x="8" y="${y + 4}" class="tx" font-size="12"><tspan font-weight="700">${p.codigo.slice(-3)}</tspan> ${esc(p.nombre.length > 33 ? p.nombre.slice(0, 32) + '…' : p.nombre)}</text>`;
    for (const [et, a, b] of segs) s += `<rect x="${X(a)}" y="${y - 6}" width="${Math.max(2, X(b) - X(a) - 2)}" height="12" rx="4" style="fill:${stageColor(et)}" opacity="${p.estado === 'En pausa' ? .45 : 1}"/>`;
    if (p.estado === 'En curso') { const f = dnum(p.fecha_objetivo); if (f > fin) s += `<rect x="${X(fin) + 1}" y="${y - 5}" width="${X(f) - X(fin)}" height="10" rx="4" style="fill:none;stroke:var(--line2);stroke-dasharray:4 3"/><circle cx="${X(f)}" cy="${y}" r="4" style="fill:var(--surface);stroke:var(--ink3);stroke-width:2"/>`; }
    if (p.proximo_gate) { const x = X(dnum(p.proximo_gate)); s += `<path d="M${x},${y - 10} l6,6 l-6,6 l-6,-6 Z" style="fill:${p.dias_gate < 0 ? 'var(--crit)' : 'var(--ink)'};stroke:var(--surface);stroke-width:1.5"/>`; }
    s += `</g>`;
  });
  const xh = X(dnum(hoy)); s += `<line x1="${xh}" x2="${xh}" y1="${top - 6}" y2="${H - 8}" style="stroke:var(--s2)" stroke-width="2"/><text x="${xh}" y="${top - 22}" text-anchor="middle" font-size="11" font-weight="700" style="fill:var(--s2)">Hoy</text>`;
  return `<div class="chartwrap"><svg viewBox="0 0 ${w} ${H}" style="min-width:900px" role="img" aria-label="Cronograma del portafolio por etapas">${s}</svg></div>
  ${legend([...ETAPAS.map((e, i) => ({ color: stageColor(i), label: e })), { color: 'var(--ink)', label: '◆ Próximo gate' }, { color: 'var(--crit)', label: '◆ Gate vencido' }])}`;
}

// ---- matriz etapa × línea (mapa de calor de conteo) ----
export function matrizEtapaLinea(ps) {
  const lineas = [...new Set(ps.map(p => p.linea || 'Sin línea'))].sort(); const mx = Math.max(1, ...lineas.flatMap(l => ETAPAS.map((_, e) => ps.filter(p => (p.linea || 'Sin línea') === l && p.etapa === e).length)));
  return `<div class="scroll" style="max-height:none"><table class="tbl heat"><thead><tr><th>Línea de negocio</th>${ETAPAS.map((e, i) => `<th style="text-align:center">${esc(ETAPA_CORTA[i])}</th>`).join('')}</tr></thead><tbody>${lineas.map(l => `<tr><td style="text-align:left;white-space:nowrap">${esc(l)}</td>${ETAPAS.map((_, e) => { const arr = ps.filter(p => (p.linea || 'Sin línea') === l && p.etapa === e); const n = arr.length; return `<td><div class="c" style="background:${n ? `color-mix(in srgb,var(--olive-d) ${15 + 70 * n / mx}%,var(--surface))` : 'transparent'};color:${n / mx > .55 ? '#fff' : 'var(--ink)'}" ${n ? `data-tip="${tip(l + ' · ' + ETAPAS[e], arr.map(p => esc(p.codigo + ' ' + p.nombre)).join('<br>') + `<br>Inversión ${money(arr.reduce((s, p) => s + p.presupuesto, 0))}`)}"` : ''}>${n || ''}</div></td>`; }).join('')}</tr>`).join('')}</tbody></table></div>`;
}


// ===================== Gráficas adicionales para las pantallas de detalle =====================
// Barras apiladas horizontales (HTML). rows: [{label, href, tip, vals:{k:n}, txt}] · series: [{k, label, color}]
export function stackRows(rows, series, { lw = 170, max, fmt = v => nf.format(v) } = {}) {
  const tot = r => series.reduce((s, x) => s + (r.vals[x.k] || 0), 0); const m = max ?? Math.max(1, ...rows.map(tot));
  return `<div style="--lw:${lw}px">${rows.map(r => `<div class="stkrow" ${r.href ? `data-href="${attr(r.href)}" style="cursor:pointer"` : ''} ${r.tip ? `data-tip="${r.tip}"` : ''}><div class="lb" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${attr(r.label)}">${r.labelHTML || esc(r.label)}</div><div class="stk" style="width:${Math.max(.5, 100 * tot(r) / m)}%">${series.map(x => r.vals[x.k] ? `<i style="flex:${r.vals[x.k]};background:${x.color}" data-tip="${tip(x.label, fmt(r.vals[x.k]))}"></i>` : '').join('')}</div><div class="num" style="color:var(--ink2);white-space:nowrap">${r.txt ?? fmt(tot(r))}</div></div>`).join('')}</div>${legend(series.map(x => ({ color: x.color, label: x.label })))}`;
}

// Dispersión con ejes numéricos, cuadrícula y diagonal opcional (y = x)
export function scatterXY(pts, { w = 760, h = 420, xmin = 0, xmax = 100, ymin = 0, ymax = 100, xlab = '', ylab = '', diag = false, diagLabel = 'y = x', xfmt = v => v, yfmt = v => v, bandas = null } = {}) {
  const m = { l: 62, r: 22, t: 18, b: 48 }, iw = w - m.l - m.r, ih = h - m.t - m.b; const X = v => m.l + iw * (v - xmin) / (xmax - xmin), Y = v => m.t + ih * (1 - (v - ymin) / (ymax - ymin));
  let s = `<rect x="${m.l}" y="${m.t}" width="${iw}" height="${ih}" style="fill:var(--surface2)"/>`;
  if (bandas) s += bandas(X, Y, m, iw, ih);
  for (let i = 0; i <= 5; i++) { const xv = xmin + (xmax - xmin) * i / 5, yv = ymin + (ymax - ymin) * i / 5;
    s += `<line x1="${X(xv)}" x2="${X(xv)}" y1="${m.t}" y2="${m.t + ih}" class="gl"/><line x1="${m.l}" x2="${m.l + iw}" y1="${Y(yv)}" y2="${Y(yv)}" class="gl"/><text x="${X(xv)}" y="${h - m.b + 16}" text-anchor="middle" class="tx3" font-size="10">${xfmt(Math.round(xv * 10) / 10)}</text><text x="${m.l - 8}" y="${Y(yv) + 3.5}" text-anchor="end" class="tx3" font-size="10">${yfmt(Math.round(yv * 10) / 10)}</text>`; }
  if (diag) { const a = Math.max(xmin, ymin), b = Math.min(xmax, ymax); s += `<line x1="${X(a)}" y1="${Y(a)}" x2="${X(b)}" y2="${Y(b)}" style="stroke:var(--ink3)" stroke-width="1.2" stroke-dasharray="5 4"/><text transform="translate(${X(a + (b - a) * .62)} ${Y(a + (b - a) * .62) + 14}) rotate(${Math.atan2(Y(b) - Y(a), X(b) - X(a)) * 180 / Math.PI})" text-anchor="middle" class="tx3" font-size="10.5">${esc(diagLabel)}</text>`; }
  s += `<text x="${m.l + iw / 2}" y="${h - 8}" text-anchor="middle" class="tx2" font-size="11.5">${esc(xlab)}</text><text transform="translate(14 ${m.t + ih / 2}) rotate(-90)" text-anchor="middle" class="tx2" font-size="11.5">${esc(ylab)}</text>`;
  for (const p of pts) { const cx = X(Math.min(xmax, Math.max(xmin, p.x))), cy = Y(Math.min(ymax, Math.max(ymin, p.y)));
    s += `<g class="pt" ${p.href ? `data-href="${attr(p.href)}"` : ''} data-tip="${p.tip || ''}"><circle cx="${cx}" cy="${cy}" r="${p.r || 7}" style="fill:${p.color || 'var(--s1)'};stroke:var(--surface);stroke-width:2"/>${p.label ? `<text x="${cx + (p.r || 7) + 4}" y="${cy + 3.5}" class="tx2" font-size="10" style="font-family:var(--mono);pointer-events:none">${esc(p.label)}</text>` : ''}</g>`; }
  return `<div class="chartwrap"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${attr(ylab + ' vs ' + xlab)}">${s}</svg></div>`;
}

// Línea de eventos: gates por fecha (vencidos a la izquierda de "hoy")
export function gateTimeline(items, hoy, { atras = 30, adelante = 120, w = 1100 } = {}) {
  if (!items.length) return '<div class="empty">No hay gates pendientes.</div>';
  const t0 = dnum(hoy) - Math.max(atras, ...items.map(i => -i.dias + 5)), t1 = dnum(hoy) + Math.max(adelante, ...items.map(i => i.dias + 10));
  const L = 300, rh = 30, top = 34, iw = w - L - 20, H = top + items.length * rh + 10; const X = d => L + iw * (d - t0) / (t1 - t0); let s = '';
  for (let d = t0 - ((t0 % 7) + 7) % 7 + 7; d <= t1; d += 14) s += `<line x1="${X(d)}" x2="${X(d)}" y1="${top - 6}" y2="${H - 6}" class="gl"/><text x="${X(d)}" y="${top - 12}" text-anchor="middle" class="tx3" font-size="10">${fechaCorta(new Date(d * 86400000).toISOString().slice(0, 10))}</text>`;
  s += `<rect x="${X(dnum(hoy) + 0)}" y="${top - 6}" width="${X(dnum(hoy) + 30) - X(dnum(hoy))}" height="${H - top}" style="fill:color-mix(in srgb,var(--brand-gold) 10%,transparent)"/>`;
  items.forEach((it, i) => { const y = top + i * rh + rh / 2, x = X(dnum(it.fecha)), venc = it.dias < 0; const p = it.p;
    s += `<g class="pt" data-href="#/proyecto/${p.id}" data-tip="${tip(p.codigo + ' · ' + p.nombre, `${esc(it.label)}<br>${fecha(it.fecha)} · ${venc ? 'vencido hace ' + -it.dias + ' días' : 'en ' + it.dias + ' días'}<br>Avance de la etapa ${p.avance_etapa} %`)}">
      <line x1="${L}" x2="${w - 20}" y1="${y}" y2="${y}" style="stroke:var(--line)" stroke-dasharray="2 4"/>
      <text x="8" y="${y + 4}" font-size="12" class="tx"><tspan style="font-family:var(--mono)" font-size="10.5" class="tx3">${esc(p.codigo)}</tspan> ${esc(p.nombre.length > 30 ? p.nombre.slice(0, 29) + '…' : p.nombre)}</text>
      <line x1="${X(dnum(hoy))}" x2="${x}" y1="${y}" y2="${y}" style="stroke:${venc ? 'var(--crit)' : 'var(--olive-d)'}" stroke-width="2"/>
      <path d="M${x},${y - 8} l8,8 l-8,8 l-8,-8 Z" style="fill:${venc ? 'var(--crit)' : stageColor(p.etapa)};stroke:var(--surface);stroke-width:1.5"/>
      <text x="${x + (venc ? -12 : 12)}" y="${y + 4}" text-anchor="${venc ? 'end' : 'start'}" font-size="10.5" style="font-family:var(--mono);fill:${venc ? 'var(--crit-t)' : 'var(--ink2)'}">${venc ? it.dias + ' d' : '+' + it.dias + ' d'}</text></g>`; });
  const xh = X(dnum(hoy)); s += `<line x1="${xh}" x2="${xh}" y1="${top - 6}" y2="${H - 6}" style="stroke:var(--brand-gold)" stroke-width="2"/><text x="${xh}" y="${top - 22}" text-anchor="middle" font-size="10.5" style="fill:var(--gold-t);font-family:var(--mono)">HOY</text>`;
  return `<div class="chartwrap"><svg viewBox="0 0 ${w} ${H}" style="min-width:860px" role="img" aria-label="Línea de tiempo de gates">${s}</svg></div>${legend([{ color: 'var(--olive-d)', label: 'Días hasta el gate' }, { color: 'var(--crit)', label: 'Gate vencido' }, { color: 'color-mix(in srgb,var(--brand-gold) 35%,transparent)', label: 'Ventana de 30 días' }])}`;
}

// Embudo centrado (HTML)
export function funnel(rows, { lw = 150 } = {}) {
  const m = Math.max(1, ...rows.map(r => r.value));
  return `<div>${rows.map(r => `<div class="fnrow" style="display:grid;grid-template-columns:${lw}px 1fr 150px;gap:12px;align-items:center;margin:5px 0;${r.href ? 'cursor:pointer' : ''}" ${r.href ? `data-href="${attr(r.href)}"` : ''} ${r.tip ? `data-tip="${r.tip}"` : ''}><div style="font-size:13px">${esc(r.label)}</div><div style="display:flex;justify-content:center"><div style="width:${Math.max(4, 100 * r.value / m)}%;height:26px;border-radius:6px;background:${r.color};display:grid;place-items:center;color:${r.on || '#fff'};font-family:var(--mono);font-size:11.5px">${r.value || ''}</div></div><div class="num" style="color:var(--ink2);font-size:12px">${r.txt || ''}</div></div>`).join('')}</div>`;
}

// Color de celda de calor (escala oliva, una sola tonalidad)
export const heat = (v, min, max) => { const t = max > min ? (v - min) / (max - min) : 0; const pc = Math.round(10 + 75 * t); return `background:color-mix(in srgb,var(--olive-d) ${pc}%,var(--surface));color:${pc > 55 ? '#fff' : 'var(--ink)'}`; };
