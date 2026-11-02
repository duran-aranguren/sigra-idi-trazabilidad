import { S, A, esc, attr, nf, fecha, ETAPAS, api, hacer, toast, modal, confirmar, cargar, $, $$, POSTURAS } from './core.js';
import { card, pageHead } from './v-tablero.js';

const rerender = () => document.dispatchEvent(new CustomEvent('rerender'));
const EST = { Pendiente: 'chip', Analizando: 'chip warn', 'Por revisar': 'chip blue', Aplicado: 'chip ok', Descartado: 'chip', Error: 'chip bad' };
const kb = n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';

export const dropzoneHTML = (pid = '') => `<div class="drop" data-drop data-pid="${pid}" tabindex="0" role="button" aria-label="Subir archivos"><div style="font-size:26px">📎</div><b>Arrastra archivos aquí</b> o pulsa para elegirlos <span class="solo-movil">(en el celular puedes tomar una foto)</span><div class="small" style="margin-top:4px">.eml · .docx · .pdf · .pptx · .xlsx · .csv · .txt · .png · .jpg — hasta 30 MB</div><input type="file" multiple hidden accept=".eml,.docx,.pdf,.pptx,.xlsx,.csv,.txt,.md,.png,.jpg,.jpeg,.webp,.html,image/*"></div><div id="subiendo" class="mt small"></div>`;
export const listaDocs = docs => docs.length ? `<table class="tbl"><thead><tr><th>Archivo</th><th>Tipo</th><th>Estado</th><th></th></tr></thead><tbody>${docs.map(d => { const p = d.proyecto_id ? S.T.pmap.get(d.proyecto_id) : null; return `<tr class="clic" data-act="revisar-doc" data-id="${d.id}"><td><b>${esc(d.nombre_original)}</b><div class="small faint">${p ? esc(p.codigo) + ' · ' : ''}${kb(d.tamano)} · ${fecha((d.subido || '').slice(0, 10))}</div></td><td class="small">${esc(d.tipo_doc || '—')}<div class="faint">${esc(d.modo || '')}</div></td><td><span class="${EST[d.estado] || 'chip'}">${esc(d.estado)}</span></td><td class="t-actions"><button class="btn sm ghost" data-act="borrar-doc" data-id="${d.id}" title="Eliminar">✕</button></td></tr>`; }).join('')}</tbody></table>` : '<div class="empty">Aún no hay documentos.</div>';

// Las fotos del celular suelen pesar varios MB: se reducen a 2000 px antes de enviarlas (la IA admite imágenes de hasta 5 MB)
async function reducirImagen(f) {
  if (!/^image\/(jpeg|png|webp)$/.test(f.type) || f.size <= 3.5 * 1024 * 1024) return f;
  try {
    const bmp = await createImageBitmap(f); const k = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k); c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.85)); return blob ? new File([blob], f.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : f;
  } catch { return f; }
}
export async function subir(files, pid) {
  files = await Promise.all([...files].map(reducirImagen));
  const box = $('#subiendo'); let ultimo = null; const resultados = [];
  for (const f of files) {
    if (f.size > 30 * 1024 * 1024) { toast(`${f.name}: supera 30 MB`, 'bad'); continue; }
    if (box) box.innerHTML = `<span class="spin"></span> Analizando <b>${esc(f.name)}</b>… ${S.T.config.modo_ia === 'n8n' ? '(la IA puede tardar unos segundos)' : ''}`;
    try { const r = await fetch(`/api/documentos?nombre=${encodeURIComponent(f.name)}${pid ? '&proyecto_id=' + pid : ''}`, { method: 'POST', headers: { 'x-idi': '1' }, body: f }); const j = await r.json(); if (!r.ok) throw new Error(j.error); ultimo = j; resultados.push(j); if (j.estado === 'Error') toast(`${f.name}: ${j.error}`, 'bad'); } catch (e) { toast(`${f.name}: ${e.message}`, 'bad'); }
  }
  if (box) box.innerHTML = ''; await cargar(); rerender();
  if (ultimo && files.length === 1 && ultimo.estado === 'Por revisar') abrirRevision(ultimo.id);
  else if (resultados.length) toast(`${resultados.length} archivo(s) procesado(s). Revisa las propuestas pendientes.`);
}
export function montarDrop(root) {
  $$('[data-drop]', root).forEach(z => {
    const inp = $('input', z); const pid = z.dataset.pid;
    z.onclick = () => inp.click(); z.onkeydown = e => { if (e.key === 'Enter') inp.click(); };
    inp.onchange = () => { if (inp.files.length) subir([...inp.files], pid); };
    z.ondragover = e => { e.preventDefault(); z.classList.add('over'); }; z.ondragleave = () => z.classList.remove('over');
    z.ondrop = e => { e.preventDefault(); z.classList.remove('over'); if (e.dataTransfer.files.length) subir([...e.dataTransfer.files], pid); };
  });
}

A['borrar-doc'] = async el => { if (await confirmar('¿Eliminar el documento y su archivo?', 'Eliminar', true)) { await hacer(() => api('DELETE', '/api/documentos/' + el.dataset.id), 'Documento eliminado'); rerender(); } };
A['revisar-doc'] = el => abrirRevision(+el.dataset.id);

export async function abrirRevision(id) {
  let d; try { d = await api('GET', '/api/documentos/' + id); } catch (e) { return toast(e.message, 'bad'); }
  const T = S.T; const pr = d.propuesta; const lock = d.estado === 'Aplicado' || d.estado === 'Descartado';
  const opts = T.proyectos.map(p => `<option value="${p.id}" ${pr && pr.proyecto.id === p.id ? 'selected' : (!pr && d.proyecto_id === p.id ? 'selected' : '')}>${esc(p.codigo)} · ${esc(p.nombre)}</option>`).join('');
  const nuevo = pr && pr.proyecto.nuevo ? `<option value="nuevo">➕ Crear proyecto nuevo: ${esc(pr.proyecto.nuevo.nombre)}</option>` : '';
  const cab = `<div class="row wrap" style="margin-bottom:10px"><b>${esc(d.nombre_original)}</b><span class="faint small">${kb(d.tamano)}</span><span class="${EST[d.estado]}">${esc(d.estado)}</span>${d.modo ? `<span class="chip ${/n8n/.test(d.modo) && !/respaldo/.test(d.modo) ? 'blue' : 'warn'}">${esc(d.modo)}</span>` : ''}<span class="sp"></span><a class="btn sm" href="/api/documentos/${d.id}/archivo">⬇ Original</a></div>`;
  if (d.estado === 'Error' || !pr) return modal({ titulo: 'Documento sin análisis', ancho: 640, cuerpo: `${cab}<div class="warnbox">${esc(d.error || 'El documento aún no tiene análisis.')}</div><p class="muted small">Puedes reintentar el análisis (verifica en Configuración que n8n esté activo) o cambiar al modo local.</p>`, acciones: [{ txt: 'Cerrar', fn: () => null }, { txt: 'Reintentar análisis', cls: 'primary', fn: async () => { try { await api('POST', `/api/documentos/${d.id}/analizar`, {}); await cargar(); rerender(); setTimeout(() => abrirRevision(d.id), 50); } catch (e) { toast(e.message, 'bad'); } return true; } }] });
  const confClr = pr.proyecto.confianza >= .7 ? 'ok' : pr.proyecto.confianza >= .4 ? 'warn' : 'bad';
  const act = id => T.actividades.find(a => a.id === id);
  const sec = (titulo, n, cuerpo) => n ? `<h3 style="margin:16px 0 4px">${titulo} <span class="chip">${n}</span></h3>${cuerpo}` : '';
  const dis = lock ? 'disabled' : '';
  const body = `${cab}
  <div class="grid-form" style="margin-bottom:8px"><label class="fld full"><span>Proyecto al que pertenece <span class="chip ${confClr}" style="margin-left:6px">confianza ${Math.round(pr.proyecto.confianza * 100)} %</span></span><select id="rv-proy" ${dis}><option value="">— Selecciona —</option>${opts}${nuevo}</select><small>${esc(pr.proyecto.motivo || '')}</small></label></div>
  ${pr.aviso ? `<div class="warnbox" style="margin-bottom:10px">${esc(pr.aviso)}</div>` : ''}
  <div class="hint"><b>${esc(pr.tipo_documento)}</b>${pr.fecha_documento ? ' · ' + fecha(pr.fecha_documento) : ''}<br>${esc(pr.resumen || 'Sin resumen')}</div>
  ${pr.hallazgos_clave.length ? `<h3 style="margin:14px 0 4px">Hallazgos clave</h3><ul style="margin:0;padding-left:20px">${pr.hallazgos_clave.map(h => `<li>${esc(h)}</li>`).join('')}</ul>` : ''}
  ${pr.alertas.length ? `<div class="warnbox" style="margin-top:10px">${pr.alertas.map(a => '⚠ ' + esc(a)).join('<br>')}</div>` : ''}
  ${pr.etapa_sugerida ? `<div class="hint" style="margin-top:10px">La IA sugiere que el proyecto podría estar en la etapa <b>${esc(pr.etapa_sugerida)}</b>. Si corresponde, registra la decisión en la pestaña Gates.</div>` : ''}
  ${sec('Actividades a actualizar', pr.actividades_actualizar.length, pr.actividades_actualizar.map((a, i) => { const x = act(a.id); return `<div class="prop" data-sec="au" data-i="${i}"><label class="ck"><input type="checkbox" checked ${dis}><div><b>${esc(x ? x.nombre : 'Actividad ' + a.id)}</b><div class="small muted">Avance actual ${x ? x.avance : '?'} % → ${esc(a.comentario || '')}</div></div></label><div class="ed"><label>Nuevo avance %<input type="number" data-f="avance" min="0" max="100" value="${a.avance}" ${dis}></label><label>Nueva fecha fin<input type="date" data-f="fecha_fin" value="${a.fecha_fin || ''}" ${dis}></label></div><input type="hidden" data-f="comentario" value="${attr(a.comentario || '')}"></div>`; }).join(''))}
  ${sec('Actividades nuevas', pr.actividades_nuevas.length, pr.actividades_nuevas.map((a, i) => `<div class="prop" data-sec="an" data-i="${i}"><label class="ck"><input type="checkbox" checked ${dis}><div style="flex:1"><input type="text" data-f="nombre" value="${attr(a.nombre)}" ${dis}><div class="small muted">${esc(a.comentario || '')}</div></div></label><div class="ed"><label>Responsable<input type="text" data-f="responsable" list="dl-personas" value="${attr(a.responsable || '')}" ${dis}></label><label>Inicio<input type="date" data-f="fecha_inicio" value="${a.fecha_inicio || ''}" ${dis}></label><label>Fin<input type="date" data-f="fecha_fin" value="${a.fecha_fin || ''}" ${dis}></label></div><input type="hidden" data-f="comentario" value="${attr(a.comentario || '')}"></div>`).join(''))}
  ${sec('Partes interesadas detectadas', pr.stakeholders_nuevos.length, pr.stakeholders_nuevos.map((s, i) => `<div class="prop" data-sec="st" data-i="${i}"><label class="ck"><input type="checkbox" checked ${dis}><div style="flex:1"><input type="text" data-f="nombre" value="${attr(s.nombre)}" ${dis}><div class="small muted">${esc(s.expectativa || '')}</div></div></label><div class="ed"><label>Organización<input type="text" data-f="organizacion" value="${attr(s.organizacion)}" ${dis}></label><label>Poder 1-5<input type="number" data-f="poder" min="1" max="5" value="${s.poder}" ${dis}></label><label>Interés 1-5<input type="number" data-f="interes" min="1" max="5" value="${s.interes}" ${dis}></label><label>Postura<select data-f="postura" ${dis}>${POSTURAS.map(x => `<option ${x === s.postura ? 'selected' : ''}>${x}</option>`).join('')}</select></label></div><input type="hidden" data-f="rol" value="${attr(s.rol)}"><input type="hidden" data-f="expectativa" value="${attr(s.expectativa)}"></div>`).join(''))}
  ${sec('Riesgos y restricciones detectados', pr.restricciones_nuevas.length, pr.restricciones_nuevas.map((r, i) => `<div class="prop" data-sec="rs" data-i="${i}"><label class="ck"><input type="checkbox" checked ${dis}><div style="flex:1"><input type="text" data-f="titulo" value="${attr(r.titulo)}" ${dis}><div class="small muted">${esc(r.descripcion || '')}</div></div></label><div class="ed"><label>Tipo<input type="text" data-f="tipo" value="${attr(r.tipo)}" ${dis}></label><label>Prob. 1-5<input type="number" data-f="probabilidad" min="1" max="5" value="${r.probabilidad}" ${dis}></label><label>Impacto 1-5<input type="number" data-f="impacto" min="1" max="5" value="${r.impacto}" ${dis}></label></div><input type="hidden" data-f="descripcion" value="${attr(r.descripcion)}"><input type="hidden" data-f="mitigacion" value="${attr(r.mitigacion)}"></div>`).join(''))}
  ${!pr.actividades_actualizar.length && !pr.actividades_nuevas.length && !pr.stakeholders_nuevos.length && !pr.restricciones_nuevas.length ? '<div class="empty">La propuesta no incluye cambios para aplicar; el documento quedará asociado al proyecto.</div>' : ''}
  ${d.texto ? `<details style="margin-top:14px"><summary class="small muted" style="cursor:pointer">Texto extraído del archivo</summary><pre style="white-space:pre-wrap;max-height:200px;overflow:auto;font-size:12px;background:var(--surface2);padding:10px;border-radius:8px">${esc(d.texto.slice(0, 4000))}</pre></details>` : ''}`;
  const leer = bg => {
    const out = { ...pr, actividades_actualizar: [], actividades_nuevas: [], stakeholders_nuevos: [], restricciones_nuevas: [] };
    const map = { au: 'actividades_actualizar', an: 'actividades_nuevas', st: 'stakeholders_nuevos', rs: 'restricciones_nuevas' };
    $$('.prop', bg).forEach(el => { if (!$('input[type=checkbox]', el).checked) return; const o = {}; $$('[data-f]', el).forEach(f => { o[f.dataset.f] = f.type === 'number' ? Number(f.value) : f.value || null; });
      if (el.dataset.sec === 'au') o.id = pr.actividades_actualizar[+el.dataset.i].id; out[map[el.dataset.sec]].push(o); });
    return out;
  };
  const acciones = lock ? [{ txt: 'Cerrar', fn: () => null }] : [
    { txt: 'Descartar', fn: async () => { await hacer(() => api('POST', `/api/documentos/${d.id}/descartar`), 'Documento descartado'); rerender(); return true; } },
    { txt: 'Reanalizar con este proyecto', fn: async bg => { const v = $('#rv-proy', bg).value; if (!v || v === 'nuevo') { toast('Selecciona un proyecto para reanalizar', 'bad'); return false; } toast('Reanalizando…'); try { await api('POST', `/api/documentos/${d.id}/analizar`, { proyecto_id: +v }); await cargar(); rerender(); setTimeout(() => abrirRevision(d.id), 50); } catch (e) { toast(e.message, 'bad'); } return true; } },
    { txt: 'Aplicar cambios seleccionados', cls: 'primary', fn: async bg => { const v = $('#rv-proy', bg).value; if (!v) { toast('Selecciona el proyecto', 'bad'); return false; }
      const prop = leer(bg); if (v !== 'nuevo' && +v !== pr.proyecto.id) prop.actividades_actualizar = [];
      try { const r = await api('POST', `/api/documentos/${d.id}/aplicar`, { proyecto_id: v === 'nuevo' ? null : +v, crear_proyecto: v === 'nuevo', propuesta: prop }); await cargar(); toast(`${r.cambios} cambio(s) aplicado(s). Queda registrado en la bitácora.`); rerender(); return true; } catch (e) { toast(e.message, 'bad'); return false; } } }];
  return modal({ titulo: lock ? 'Documento procesado' : 'Revisar propuesta de la IA', ancho: 820, cuerpo: body, acciones });
}

export const documentos = {
  render() {
    const T = S.T; const pend = T.documentos.filter(d => d.estado === 'Por revisar').length;
    return `${pageHead('Documentos y avances', 'Sube correos, reportes de ensayo, presentaciones o capturas: la IA los clasifica, resume y propone actualizar actividades, riesgos y stakeholders. Nada cambia hasta que tú lo apruebes.')}
    <div class="grid g-12">${card('Subir archivos', `Modo actual: <b>${T.config.modo_ia === 'n8n' ? 'n8n + IA' : 'Análisis local (palabras clave)'}</b> · <a href="#/config">cambiar</a>`, dropzoneHTML(''))}
    ${card('Cómo funciona', '', `<ol style="margin:0;padding-left:20px;line-height:1.7"><li>El archivo se guarda ${T.config.publico ? 'en el servidor' : 'en tu PC (carpeta <code>uploads</code>)'} y se extrae su texto.</li><li>La app lo envía a <b>n8n</b>, que consulta el modelo de IA con el contexto de tus proyectos.</li><li>La IA devuelve una <b>propuesta</b>: proyecto, resumen, avances, riesgos, stakeholders.</li><li>Tú revisas, editas y aplicas. Todo queda en la <b>bitácora</b> con origen "IA".</li></ol>${pend ? `<div class="hint mt"><b>${pend}</b> propuesta(s) esperan tu revisión.</div>` : ''}`)}</div>
    <div class="grid mt">${card(`Documentos (${T.documentos.length})`, '', listaDocs(T.documentos))}</div>`;
  },
  mount(root) { montarDrop(root); }
};

// ================= ASISTENTE =================
const hist = [];
export const asistente = {
  render() {
    const sug = ['¿Qué proyectos están en riesgo y por qué?', 'Resume el portafolio para el comité de innovación', '¿Qué gates vencen en los próximos 30 días?', '¿Qué restricciones externas amenazan más al portafolio?', '¿Qué proyectos deberíamos pausar y por qué?'];
    return `${pageHead('Asistente del portafolio', 'Pregunta sobre el estado de tus proyectos. Responde con los datos actuales de la app (vía n8n + IA).')}
    <div class="card"><div class="chat" id="chat">${hist.length ? hist.map(m => `<div class="msg ${m.r}">${esc(m.t)}</div>`).join('') : '<div class="empty">Haz una pregunta o elige una sugerencia.</div>'}</div>
    <div class="row wrap mt" style="margin-top:12px">${sug.map(s => `<button class="btn sm" data-act="sug" data-q="${attr(s)}">${esc(s)}</button>`).join('')}</div>
    <div class="row mt" style="margin-top:12px"><input id="q" type="text" placeholder="Escribe tu pregunta…" autocomplete="off"><button class="btn primary" id="envia">Preguntar</button></div></div>`;
  },
  mount(root) {
    const q = $('#q', root), chat = $('#chat', root); chat.scrollTop = chat.scrollHeight;
    const enviar = async txt => {
      txt = (txt || q.value).trim(); if (!txt) return; q.value = ''; hist.push({ r: 'u', t: txt }); rerender();
      const ch = () => { const c = $('#chat'); c.scrollTop = c.scrollHeight; };
      setTimeout(() => { const c = $('#chat'); if (c) { c.insertAdjacentHTML('beforeend', '<div class="msg a" id="pend"><span class="spin"></span> Pensando…</div>'); ch(); } }, 30);
      try { const r = await api('POST', '/api/asistente', { pregunta: txt, historial: hist.slice(0, -1).map(m => ({ r: m.r, t: m.t })) }); hist.push({ r: 'a', t: r.respuesta || '(sin respuesta)' }); } catch (e) { hist.push({ r: 'a', t: '⚠ ' + e.message }); }
      rerender(); setTimeout(ch, 50);
    };
    $('#envia', root).onclick = () => enviar(); q.onkeydown = e => { if (e.key === 'Enter') enviar(); };
    A['sug'] = el => enviar(el.dataset.q);
    q.focus();
  }
};
