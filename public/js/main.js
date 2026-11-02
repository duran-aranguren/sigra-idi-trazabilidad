import { S, A, esc, cargar, toast, $, $$, api } from './core.js';
import tablero from './v-tablero.js';
import proyecto from './v-proyecto.js';
import { pipeline, portafolio, cronograma, proyectos, alertas, equipo, stakeholders, riesgos } from './v-varias.js';
import { documentos, asistente, montarDrop } from './v-docs.js';
import { config } from './v-config.js';
import { detalle, indicadores } from './v-detalle.js';
import { ficha } from './v-proyecto.js';

const VISTAS = { tablero, indicadores, pipeline, portafolio, cronograma, proyectos, alertas, equipo, stakeholders, riesgos, documentos, asistente, config };
const ic = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const NAV = [
  ['Principal', [['tablero', 'Tablero', '<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>'], ['indicadores', 'Indicadores', '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'], ['pipeline', 'Pipeline', '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>'], ['portafolio', 'Portafolio', '<circle cx="8" cy="15" r="4"/><circle cx="16" cy="8" r="3"/><path d="M3 21h18"/>'], ['cronograma', 'Cronograma', '<path d="M3 6h10M3 12h16M3 18h7"/>']]],
  ['Gestión', [['proyectos', 'Proyectos', '<path d="M4 4h16v16H4z"/><path d="M4 9h16M9 9v11"/>'], ['stakeholders', 'Stakeholders', '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/>'], ['riesgos', 'Riesgos y límites', '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>'], ['alertas', 'Alertas', '<path d="M6 8a6 6 0 0112 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 004 0"/>'], ['equipo', 'Equipo', '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-4 3-6 7-6s7 2 7 6M17 5a3 3 0 010 6M22 20c0-3-2-5-5-5.5"/>']]],
  ['Inteligencia', [['documentos', 'Documentos e IA', '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5M9 14h6M9 17h4"/>'], ['asistente', 'Asistente', '<path d="M4 5h16v11H9l-5 4z"/>']]],
  ['Sistema', [['config', 'Configuración', '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>']]]
];

function shell() {
  $('#app').innerHTML = `<aside class="side"><a class="brand" href="#/tablero" style="text-decoration:none"><img src="img/sigra-logo.png" alt="SIGRA" width="92" height="66"><div><b>Trazabilidad I+D+i</b><small>Stage-Gate · Portafolio</small></div></a>
  <button class="menu-btn" data-act="menu" aria-expanded="false" aria-controls="nav-principal"><b>☰</b><span id="menu-actual">Menú</span></button>
  <nav class="nav" id="nav-principal">${NAV.map(([g, items]) => `<div class="grp">${g}</div>${items.map(([k, n, d]) => `<a href="#/${k}" data-nav="${k}" title="${n}">${ic(d)}<span>${n}</span>${k === 'alertas' ? '<span class="bd" id="bd" hidden></span>' : ''}</a>`).join('')}`).join('')}</nav>
  <div class="foot" id="foot"></div></aside>
  <main><div class="top"><div class="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg><input id="gs" type="search" placeholder="Buscar proyecto…" autocomplete="off"><div class="res" id="gres" hidden></div></div><div class="sp"></div><button class="btn" data-act="tema-toggle" title="Cambiar tema (claro/oscuro)">🌓</button><a class="btn" href="#/documentos" title="Subir archivo">📎 Subir archivo</a><button class="btn primary" data-act="nuevo-proyecto" title="Nuevo proyecto">＋ Nuevo proyecto</button></div>
  <div class="page" id="page"></div></main><datalist id="dl-personas"></datalist><datalist id="dl-lineas"></datalist>`;
  const gs = $('#gs'), res = $('#gres');
  gs.oninput = () => { const q = gs.value.trim().toLowerCase(); if (!q) { res.hidden = true; return; } const r = S.T.proyectos.filter(p => (p.codigo + ' ' + p.nombre + ' ' + (p.linea || '')).toLowerCase().includes(q)).slice(0, 8); res.innerHTML = r.map(p => `<a href="#/proyecto/${p.id}"><b>${esc(p.codigo)}</b> ${esc(p.nombre)}</a>`).join('') || '<a>Sin resultados</a>'; res.hidden = false; };
  gs.onblur = () => setTimeout(() => { res.hidden = true; }, 200);
}
function actualizarShell() {
  const T = S.T; const bd = $('#bd'); if (bd) { const n = T.alertas.filter(a => a.nivel !== 'media').length; bd.hidden = !n; bd.textContent = n; bd.title = `${n} alertas críticas y altas (de ${T.alertas.length} activas)`; }
  $('#dl-personas').innerHTML = T.personas.map(p => `<option value="${esc(p.nombre)}">`).join(''); $('#dl-lineas').innerHTML = [...new Set(T.proyectos.map(p => p.linea).filter(Boolean))].map(l => `<option value="${esc(l)}">`).join('');
  $('#foot').innerHTML = `<span style="font-family:var(--mono);font-size:9.5px;letter-spacing:.1em">CORTE ${T.hoy}</span><br>${esc(T.empresa || '')}<br>IA: ${T.config.modo_ia === 'n8n' ? 'n8n' : 'modo local'}<div style="margin-top:8px;color:var(--brand-gold);font-size:10.5px">Calidad · Innovación · Sostenibilidad · Transparencia</div>`;
}
function ruta() { const h = location.hash.replace(/^#\/?/, '') || 'tablero'; const [v, a, b] = h.split('/'); if (v === 'proyecto') return { v, params: { id: a, tab: b || 'resumen' } }; if (v === 'detalle' || v === 'ficha') return { v, params: { id: a } }; return { v: VISTAS[v] ? v : 'tablero', params: {} }; }

let ultima = null;
async function render(conservar = false) {
  const { v, params } = ruta(); const vista = v === 'proyecto' ? proyecto : v === 'detalle' ? detalle : v === 'ficha' ? ficha : VISTAS[v]; const page = $('#page'); document.body.classList.toggle('modo-ficha', v === 'ficha');
  const y = conservar && ultima === location.hash ? window.scrollY : 0;
  try {
    $$('.nav a').forEach(a => a.classList.toggle('on', a.dataset.nav === ({ proyecto: 'proyectos', ficha: 'proyectos', detalle: 'indicadores' }[v] || v)));
    const act = $('.nav a.on span'); $('#menu-actual').textContent = act ? act.textContent : 'Menú'; cerrarMenu();
    const vacia = !S.T.proyectos.length && ['tablero', 'indicadores', 'detalle', 'pipeline', 'portafolio', 'cronograma', 'stakeholders', 'riesgos', 'alertas', 'equipo'].includes(v);
    page.innerHTML = vacia ? `<div class="card" style="max-width:640px;margin:60px auto;text-align:center;padding:40px"><div style="font-size:42px">🧭</div><h1 style="margin:8px 0">Aún no hay proyectos</h1><p class="muted">Crea tu primer proyecto de innovación (puedes generar el plan de actividades Stage-Gate automáticamente) o carga el caso de demostración con 15 proyectos.</p><div class="row" style="justify-content:center;margin-top:18px"><button class="btn primary" data-act="nuevo-proyecto">＋ Crear mi primer proyecto</button><button class="btn" data-act="reset-demo">Cargar caso demo</button></div></div>` : vista.render(params); if (!vacia) vista.mount?.(page, params); montarDrop(page);
    document.title = ((v === 'proyecto' || v === 'ficha') && S.T.pmap.get(+params.id) ? S.T.pmap.get(+params.id).codigo + ' · ' : '') + 'SIGRA · Trazabilidad I+D+i';
  } catch (e) { console.error(e); page.innerHTML = `<div class="card"><h2>Ocurrió un error al mostrar esta vista</h2><p class="muted">${esc(e.message)}</p><a class="btn" href="#/tablero">Ir al tablero</a></div>`; }
  window.scrollTo(0, y); ultima = location.hash;
}

// ---------- eventos globales ----------
document.addEventListener('click', e => {
  const act = e.target.closest('[data-act]');
  if (act && A[act.dataset.act]) { e.preventDefault(); A[act.dataset.act](act, e); return; }
  const hr = e.target.closest('[data-href]');
  if (hr && !e.target.closest('button, a, input, select, textarea')) { location.hash = hr.dataset.href; }
});
document.addEventListener('rerender', () => render(true));
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches && e.target.matches('[data-href][tabindex]')) location.hash = e.target.dataset.href; });
window.addEventListener('hashchange', () => render(false));
const tipEl = () => $('#tip');
document.addEventListener('mouseover', e => { const t = e.target.closest('[data-tip]'); if (!t) return; tipEl().innerHTML = t.getAttribute('data-tip'); tipEl().classList.add('on'); });
document.addEventListener('mousemove', e => { const el = tipEl(); if (!el.classList.contains('on')) return; const w = el.offsetWidth, h = el.offsetHeight; let x = e.clientX + 14, y = e.clientY + 16; if (x + w > innerWidth - 8) x = e.clientX - w - 14; if (y + h > innerHeight - 8) y = e.clientY - h - 14; el.style.left = x + 'px'; el.style.top = y + 'px'; });
document.addEventListener('mouseout', e => { if (e.target.closest('[data-tip]') && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('[data-tip]') === e.target.closest('[data-tip]'))) tipEl().classList.remove('on'); });
document.addEventListener('scroll', () => tipEl().classList.remove('on'), { passive: true });

function tema(t) { document.documentElement.dataset.theme = t; try { localStorage.setItem('idi_tema', t); } catch {} }
function cerrarMenu() { const s = $('aside.side'); if (s) { s.classList.remove('abierto'); $('.menu-btn').setAttribute('aria-expanded', 'false'); } }
A['menu'] = () => { const s = $('aside.side'); const ab = s.classList.toggle('abierto'); $('.menu-btn').setAttribute('aria-expanded', String(ab)); };
document.addEventListener('click', e => { if (!e.target.closest('aside.side')) cerrarMenu(); }, true);
document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarMenu(); });
A['salir'] = async () => { try { await api('POST', '/api/logout'); } catch {} location.href = '/acceso'; };
async function sesionUI() { try { const y = await api('GET', '/api/yo'); if (!y.publico) return; S.yo = y; document.documentElement.dataset.rol = y.rol; const b = $('.top [data-act="tema-toggle"]'); if (b && !$('#yo')) b.insertAdjacentHTML('beforebegin', `<span id="yo" class="chip" title="Rol: ${esc(y.rol)}">👤 ${esc(y.nombre || y.usuario)} · ${esc(y.rol)}</span><button class="btn" data-act="salir" title="Cerrar sesión">Salir</button>`); } catch {} }
A['tema'] = el => tema(el.dataset.t); A['imprimir'] = () => window.print(); A['tema-toggle'] = () => tema(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
try { tema(localStorage.getItem('idi_tema') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')); } catch { tema('light'); }

// ---------- arranque ----------
document.addEventListener('datos', () => S.T && $('#bd') !== undefined && actualizarShell());
(async () => {
  shell(); sesionUI();
  try { await cargar(); actualizarShell(); await render(); }
  catch (e) { $('#page').innerHTML = `<div class="card"><h2>No se pudo cargar la información</h2><p class="muted">${esc(e.message)}</p></div>`; }
})();
