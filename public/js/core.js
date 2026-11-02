// Utilidades compartidas: formato, API, estado, modales y formularios.
export const S = { T: null, ruta: null };
export const A = {};            // registro de acciones (data-act)
export const ETAPAS = ['Idea', 'Maduración', 'Prototipo', 'Caso de negocio', 'Plan piloto', 'Piloto', 'Evaluación ex-post'];
export const ETAPA_CORTA = ['Idea', 'Madur.', 'Prototipo', 'C. negocio', 'Plan piloto', 'Piloto', 'Ex-post'];

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const attr = esc;
export const nf = new Intl.NumberFormat('es-CO');
export const money = n => '$' + nf.format(Math.round(n || 0)) + ' M';
export const pct = (n, d = 0) => (n * 100).toFixed(d).replace('.', ',') + ' %';
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const fecha = iso => { if (!iso) return '—'; const [y, m, d] = iso.split('-'); return `${d} ${MESES[+m - 1]} ${y}`; };
export const fechaCorta = iso => { if (!iso) return '—'; const [, m, d] = iso.split('-'); return `${d} ${MESES[+m - 1]}`; };
export const dnum = iso => Math.round(Date.parse(iso + 'T00:00:00Z') / 86400000);
export const diasEntre = (a, b) => dnum(a) - dnum(b);
export const relDias = n => n == null ? '—' : n === 0 ? 'hoy' : n > 0 ? `en ${n} d` : `hace ${-n} d`;
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const SALUD = {
  verde: { txt: 'En ruta', ic: '●', cls: 'ok' }, amarillo: { txt: 'Atención', ic: '▲', cls: 'warn' }, rojo: { txt: 'En riesgo', ic: '■', cls: 'bad' },
  pausa: { txt: 'En pausa', ic: '❚❚', cls: 'mute' }, cerrado: { txt: 'Cerrado', ic: '✔', cls: 'mute' }, cancelado: { txt: 'Cancelado', ic: '✖', cls: 'mute' }
};
export const chipSalud = s => `<span class="chip ${SALUD[s].cls}"><i>${SALUD[s].ic}</i>${SALUD[s].txt}</span>`;
export const POSTURAS = ['Promotor', 'Favorable', 'Neutral', 'Reticente', 'Opositor'];
export const POSTURA_COLOR = { Promotor: 'var(--p-prom)', Favorable: 'var(--p-fav)', Neutral: 'var(--p-neu)', Reticente: 'var(--p-ret)', Opositor: 'var(--p-opo)' };
export const HZ_COLOR = { H1: 'var(--s1)', H2: 'var(--s2)', H3: 'var(--s3)' };
export const HZ_TEXT = { H1: 'var(--on-s1)', H2: 'var(--on-s2)', H3: 'var(--on-s3)' };
export const val = (v, u) => `${v}<span class="u">${u}</span>`;
export const mill = n => nf.format(Math.round(n || 0));
// Enlace a la página de un proyecto + icono para abrirla en pestaña nueva
export const plink = (p, { codigo = true, corto = 0 } = {}) => { const n = corto && p.nombre.length > corto ? p.nombre.slice(0, corto - 1) + '…' : p.nombre; return `<span class="pl"><a class="plink" href="#/proyecto/${p.id}" title="${attr(p.nombre)}">${codigo ? `<span class="code">${esc(p.codigo)}</span> ` : ''}${esc(n)}</a><a class="ext" href="#/proyecto/${p.id}" target="_blank" rel="noopener" title="Abrir en pestaña nueva" aria-label="Abrir ${attr(p.nombre)} en pestaña nueva">↗</a></span>`; };
export const HZ_NOMBRE = { H1: 'H1 · Núcleo (0-2 años)', H2: 'H2 · Adyacente (2-4 años)', H3: 'H3 · Transformacional (4+ años)' };
export const stageColor = i => `var(--st${i})`;

// ---------- API ----------
export async function api(method, url, body) {
  const opt = { method, headers: { 'x-idi': '1' } };
  if (body instanceof Blob) { opt.body = body; } else if (body !== undefined) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
  const r = await fetch(url, opt); if (r.status === 401) { location.href = '/acceso'; throw new Error('Ingresa para continuar'); } let j = {}; try { j = await r.json(); } catch {}
  if (!r.ok) throw new Error(j.error || `Error ${r.status}`);
  return j;
}
export async function cargar() {
  S.T = await api('GET', '/api/todo');
  const T = S.T;
  T.pmap = new Map(T.proyectos.map(p => [p.id, p]));
  const by = (arr) => { const m = new Map(); for (const x of arr) { if (!m.has(x.proyecto_id)) m.set(x.proyecto_id, []); m.get(x.proyecto_id).push(x); } return m; };
  T.amap = by(T.actividades); T.smap = by(T.stakeholders); T.rmap = by(T.restricciones); T.gmap = by(T.gates); T.emap = by(T.expost); T.bmap = by(T.bitacora); T.dmap = by(T.documentos.filter(d => d.proyecto_id));
  T.activos = T.proyectos.filter(p => p.estado === 'En curso');
  document.dispatchEvent(new CustomEvent('datos'));
}
export const proy = id => S.T.pmap.get(Number(id));
export const lista = (m, id) => S.T[m].get(Number(id)) || [];

// ---------- UI ----------
export function toast(msg, tipo = 'ok') {
  const el = document.createElement('div'); el.className = 'toast ' + tipo; el.textContent = msg;
  $('#toasts').appendChild(el); setTimeout(() => el.classList.add('out'), 3800); setTimeout(() => el.remove(), 4300);
}
export function modal({ titulo, cuerpo, ancho = 560, acciones = [], cerrable = true }) {
  return new Promise(resolve => {
    const bg = document.createElement('div'); bg.className = 'modal-bg';
    bg.innerHTML = `<div class="modal" role="dialog" aria-modal="true" style="max-width:${ancho}px"><header><h3>${esc(titulo)}</h3>${cerrable ? '<button class="x" data-m="cerrar" aria-label="Cerrar">✕</button>' : ''}</header><div class="mbody">${cuerpo}</div><footer>${acciones.map((a, i) => `<button class="btn ${a.cls || ''}" data-m="${i}">${esc(a.txt)}</button>`).join('')}</footer></div>`;
    const cerrar = v => { bg.remove(); document.removeEventListener('keydown', onKey); resolve(v); };
    const onKey = e => { if (e.key === 'Escape' && cerrable) cerrar(null); };
    bg.addEventListener('click', async e => {
      const b = e.target.closest('[data-m]');
      if (e.target === bg && cerrable) return cerrar(null);
      if (!b) return;
      if (b.dataset.m === 'cerrar') return cerrar(null);
      const a = acciones[+b.dataset.m]; if (!a) return;
      const r = a.fn ? await a.fn(bg, cerrar) : true;
      if (r !== false && !a.sinCerrar) cerrar(r === undefined ? true : r);
    });
    document.addEventListener('keydown', onKey); document.body.appendChild(bg);
    const f = bg.querySelector('input,select,textarea'); if (f) f.focus();
    bg.cerrar = cerrar;
  });
}
export const confirmar = (msg, txt = 'Confirmar', peligro = false) => modal({ titulo: 'Confirmar', cuerpo: `<p>${esc(msg)}</p>`, ancho: 420, acciones: [{ txt: 'Cancelar', fn: () => null, sinCerrar: false }, { txt, cls: peligro ? 'danger' : 'primary', fn: () => true }] }).then(v => v === true);

export function campo(c, v) {
  const val = v?.[c.k] ?? c.def ?? ''; const id = 'f_' + c.k; const req = c.req ? 'required' : '';
  let ctl;
  if (c.t === 'select') ctl = `<select id="${id}" name="${c.k}" ${req}>${(c.opts || []).map(o => { const [ov, ol] = Array.isArray(o) ? o : [o, o]; return `<option value="${attr(ov)}" ${String(ov) === String(val) ? 'selected' : ''}>${esc(ol)}</option>`; }).join('')}</select>`;
  else if (c.t === 'textarea') ctl = `<textarea id="${id}" name="${c.k}" rows="${c.rows || 3}" ${req}>${esc(val)}</textarea>`;
  else if (c.t === 'range') ctl = `<div class="rng"><input id="${id}" name="${c.k}" type="range" min="${c.min}" max="${c.max}" step="${c.step || 1}" value="${attr(val === '' ? c.min : val)}" oninput="this.nextElementSibling.textContent=this.value+'${c.suf || ''}'"><output>${esc(val === '' ? c.min : val)}${c.suf || ''}</output></div>`;
  else if (c.t === 'preds') ctl = `<div class="preds">${(c.opts || []).map(o => `<label><input type="checkbox" name="${c.k}" value="${o.id}" ${(val || []).includes(o.id) ? 'checked' : ''}> ${esc(o.nombre)}</label>`).join('') || '<em>No hay otras actividades</em>'}</div>`;
  else ctl = `<input id="${id}" name="${c.k}" type="${c.t || 'text'}" value="${attr(val)}" ${c.min != null ? `min="${c.min}"` : ''} ${c.max != null ? `max="${c.max}"` : ''} ${c.step ? `step="${c.step}"` : ''} ${req} ${c.list ? `list="${c.list}"` : ''}>`;
  return `<label class="fld ${c.full ? 'full' : ''}" for="${id}"><span>${esc(c.label)}${c.req ? ' *' : ''}</span>${ctl}${c.hint ? `<small>${esc(c.hint)}</small>` : ''}</label>`;
}
export function leerForm(root, campos) {
  const out = {};
  for (const c of campos) {
    if (c.t === 'preds') { out[c.k] = $$(`input[name="${c.k}"]:checked`, root).map(x => +x.value); continue; }
    const el = root.querySelector(`[name="${c.k}"]`); if (!el) continue; let v = el.value;
    if (['number', 'range'].includes(c.t)) v = v === '' ? null : Number(v);
    else if (c.t === 'select' && c.num) v = Number(v);
    out[c.k] = v;
  }
  return out;
}
export async function formModal({ titulo, campos, valores = {}, guardar = 'Guardar', ancho = 640, extra = '' }) {
  const cuerpo = `<form class="grid-form" onsubmit="return false">${campos.map(c => campo(c, valores)).join('')}</form>${extra}`;
  return modal({ titulo, cuerpo, ancho, acciones: [{ txt: 'Cancelar', fn: () => null }, { txt: guardar, cls: 'primary', fn: (bg) => { const f = bg.querySelector('form'); if (!f.reportValidity()) return false; return leerForm(f, campos); } }] });
}
export const sel = (arr) => arr.map(x => (Array.isArray(x) ? x : [x, x]));
export const hacer = async (fn, ok) => { try { const r = await fn(); if (ok) toast(ok); await cargar(); return r; } catch (e) { toast(e.message, 'bad'); await cargar().catch(() => {}); return null; } };
export function descargar(nombre, texto, mime = 'text/plain') { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([texto], { type: mime })); a.download = nombre; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }
export const iniciales = n => String(n || '').split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase();
