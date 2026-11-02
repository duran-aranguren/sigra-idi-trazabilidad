'use strict';
// Extracción de texto SIN dependencias externas: zip (docx/pptx/xlsx), eml, texto plano y PDF básico.
const zlib = require('zlib');

function leerZip(buf) {
  const entradas = new Map();
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('Archivo ZIP inválido');
  const total = buf.readUInt16LE(eocd + 10); let off = buf.readUInt32LE(eocd + 16);
  for (let n = 0; n < total; n++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) break;
    const metodo = buf.readUInt16LE(off + 10), comp = buf.readUInt32LE(off + 20);
    const nl = buf.readUInt16LE(off + 28), el = buf.readUInt16LE(off + 30), cl = buf.readUInt16LE(off + 32), lho = buf.readUInt32LE(off + 42);
    const nombre = buf.toString('utf8', off + 46, off + 46 + nl);
    const lnl = buf.readUInt16LE(lho + 26), lel = buf.readUInt16LE(lho + 28), ini = lho + 30 + lnl + lel;
    entradas.set(nombre, { metodo, datos: buf.subarray(ini, ini + comp) });
    off += 46 + nl + el + cl;
  }
  return { texto(nombre) { const e = entradas.get(nombre); if (!e) return null; return (e.metodo === 8 ? zlib.inflateRawSync(e.datos) : e.datos).toString('utf8'); }, nombres: [...entradas.keys()] };
}
const entidades = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&amp;/g, '&');
const limpiarTexto = t => t.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

function docx(buf) {
  const z = leerZip(buf); const xml = z.texto('word/document.xml') || '';
  return limpiarTexto(entidades(xml.replace(/<\/w:p>/g, '\n').replace(/<\/w:tc>/g, '\t').replace(/<w:tab\/>/g, '\t').replace(/<w:br[^>]*\/>/g, '\n').replace(/<[^>]+>/g, '')));
}
function pptx(buf) {
  const z = leerZip(buf);
  const slides = z.nombres.filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a, b) => parseInt(a.match(/(\d+)\.xml/)[1]) - parseInt(b.match(/(\d+)\.xml/)[1]));
  const partes = slides.map((n, i) => {
    const xml = z.texto(n);
    const t = entidades(xml.replace(/<\/a:p>/g, '\n').replace(/<[^>]+>/g, ''));
    const nota = z.texto(n.replace('slides/slide', 'notesSlides/notesSlide').replace('.xml', '.xml'));
    const tn = nota ? entidades(nota.replace(/<\/a:p>/g, '\n').replace(/<[^>]+>/g, '')).trim() : '';
    return `--- Diapositiva ${i + 1} ---\n${t.trim()}${tn ? `\n[Notas] ${tn}` : ''}`;
  });
  return limpiarTexto(partes.join('\n\n'));
}
function colIdx(ref) { let n = 0; for (const ch of ref.replace(/\d+/g, '')) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; }
function xlsx(buf) {
  const z = leerZip(buf);
  const ss = []; const sx = z.texto('xl/sharedStrings.xml');
  if (sx) for (const m of sx.matchAll(/<si>([\s\S]*?)<\/si>/g)) ss.push(entidades([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(x => x[1]).join('')));
  const hojas = z.nombres.filter(n => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort();
  const out = [];
  hojas.forEach((h, i) => {
    out.push(`--- Hoja ${i + 1} ---`);
    const xml = z.texto(h); let filas = 0;
    for (const r of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
      if (++filas > 300) { out.push('…'); break; }
      const celdas = [];
      for (const c of r[1].matchAll(/<c ([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const ref = (c[1].match(/r="([A-Z]+\d+)"/) || [])[1]; const t = (c[1].match(/t="(\w+)"/) || [])[1];
        const v = c[2] ? (c[2].match(/<v>([\s\S]*?)<\/v>/) || [])[1] : null;
        const isv = c[2] ? (c[2].match(/<is>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>/) || [])[1] : null;
        let val = t === 's' && v != null ? ss[+v] : (isv != null ? entidades(isv) : (v != null ? entidades(v) : ''));
        if (ref) celdas[colIdx(ref)] = val;
      }
      out.push(Array.from(celdas, x => x ?? '').join('\t'));
    }
  });
  return limpiarTexto(out.join('\n'));
}
function decodificarCuerpo(cuerpo, enc, charset) {
  enc = (enc || '').toLowerCase(); let b;
  if (enc.includes('base64')) b = Buffer.from(cuerpo.replace(/\s+/g, ''), 'base64');
  else if (enc.includes('quoted-printable')) b = Buffer.from(cuerpo.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16))), 'latin1');
  else b = Buffer.from(cuerpo, 'latin1');
  const cs = (charset || 'utf-8').toLowerCase();
  try { return new TextDecoder(cs.includes('iso') || cs.includes('1252') ? 'windows-1252' : 'utf-8').decode(b); } catch { return b.toString('utf8'); }
}
function cabeceras(txt) {
  const h = {}; let ultimo = null;
  for (const l of txt.split(/\r?\n/)) { if (/^\s/.test(l) && ultimo) h[ultimo] += ' ' + l.trim(); else { const m = l.match(/^([\w-]+):\s*(.*)$/); if (m) { ultimo = m[1].toLowerCase(); h[ultimo] = m[2]; } } }
  return h;
}
function decodificarMime(s) { return (s || '').replace(/\?=\s+=\?/g, '?==?').replace(/=\?([^?]+)\?([bq])\?([^?]*)\?=/gi, (_, cs, e, t) => e.toLowerCase() === 'b' ? Buffer.from(t, 'base64').toString('utf8') : decodificarCuerpo(t.replace(/_/g, ' '), 'quoted-printable', cs)); }
function eml(buf) {
  const raw = buf.toString('latin1'); const i = raw.search(/\r?\n\r?\n/);
  const hd = cabeceras(raw.slice(0, i)); let cuerpo = raw.slice(i).replace(/^\r?\n\r?\n/, '');
  const ct = hd['content-type'] || ''; const bnd = (ct.match(/boundary="?([^";\s]+)"?/i) || [])[1];
  let texto = '';
  const recorrer = (hdr, body) => {
    const t = hdr['content-type'] || 'text/plain'; const b = (t.match(/boundary="?([^";\s]+)"?/i) || [])[1];
    if (/multipart/i.test(t) && b) { for (const parte of body.split('--' + b)) { const j = parte.search(/\r?\n\r?\n/); if (j < 0) continue; recorrer(cabeceras(parte.slice(0, j)), parte.slice(j).replace(/^\r?\n\r?\n/, '')); } }
    else if (/text\/plain/i.test(t)) texto += decodificarCuerpo(body, hdr['content-transfer-encoding'], (t.match(/charset="?([^";\s]+)/i) || [])[1]) + '\n';
    else if (/text\/html/i.test(t) && !texto) texto += decodificarCuerpo(body, hdr['content-transfer-encoding'], (t.match(/charset="?([^";\s]+)/i) || [])[1]).replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<br\s*\/?>|<\/p>/gi, '\n').replace(/<[^>]+>/g, '') + '\n';
  };
  recorrer(hd, cuerpo);
  const enc = ['from', 'to', 'cc', 'date', 'subject'].filter(k => hd[k]).map(k => `${k[0].toUpperCase() + k.slice(1)}: ${decodificarMime(hd[k])}`).join('\n');
  return limpiarTexto(enc + '\n\n' + entidades(texto));
}
function pdfBasico(buf) {
  // Extracción best-effort de PDFs de texto simple (sin fuentes CID). Para PDFs complejos o escaneados se usa la IA con el PDF adjunto.
  const s = buf.toString('latin1'); const out = [];
  for (const m of s.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    let d; try { d = zlib.inflateSync(Buffer.from(m[1], 'latin1')).toString('latin1'); } catch { d = m[1]; }
    if (!/BT[\s\S]*ET/.test(d)) continue;
    for (const t of d.matchAll(/\[((?:[^\]\\]|\\.)*)\]\s*TJ|\(((?:[^)\\]|\\.)*)\)\s*Tj/g)) {
      const frag = t[1] != null ? [...t[1].matchAll(/\(((?:[^)\\]|\\.)*)\)/g)].map(x => x[1]).join('') : t[2];
      out.push(frag.replace(/\\([()\\])/g, '$1').replace(/\\n/g, '\n'));
    }
  }
  return limpiarTexto(out.join(' ').replace(/\s{2,}/g, ' '));
}

const TEXTO = ['txt', 'md', 'csv', 'tsv', 'json', 'log', 'xml', 'yaml', 'yml'];
const IMG = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' };

/** Devuelve { texto, tipo, ia: {tipo:'image'|'document', mime} | null, aviso } */
function extraer(nombre, buf) {
  const ext = (nombre.split('.').pop() || '').toLowerCase();
  try {
    if (ext === 'docx') return { texto: docx(buf), tipo: 'documento Word' };
    if (ext === 'pptx') return { texto: pptx(buf), tipo: 'presentación' };
    if (ext === 'xlsx') return { texto: xlsx(buf), tipo: 'hoja de cálculo' };
    if (ext === 'eml') return { texto: eml(buf), tipo: 'correo' };
    if (ext === 'pdf') return { texto: pdfBasico(buf), tipo: 'PDF', ia: { tipo: 'document', mime: 'application/pdf' } };
    if (IMG[ext]) return { texto: '', tipo: 'imagen / captura', ia: { tipo: 'image', mime: IMG[ext] }, aviso: 'Las imágenes solo pueden analizarse con IA (n8n).' };
    if (ext === 'html' || ext === 'htm') return { texto: limpiarTexto(entidades(buf.toString('utf8').replace(/<(script|style)[\s\S]*?<\/\1>/gi, '').replace(/<br\s*\/?>|<\/p>|<\/div>|<\/tr>/gi, '\n').replace(/<[^>]+>/g, ' '))), tipo: 'página web' };
    if (TEXTO.includes(ext)) return { texto: buf.toString('utf8'), tipo: 'texto' };
    if (['doc', 'ppt', 'xls', 'msg'].includes(ext)) return { texto: '', tipo: 'formato antiguo', aviso: `El formato .${ext} no se puede leer directamente: guárdalo como .${ext === 'doc' ? 'docx' : ext === 'ppt' ? 'pptx' : ext === 'xls' ? 'xlsx' : 'eml'} y vuelve a subirlo.` };
  } catch (e) { return { texto: '', tipo: ext, aviso: 'No se pudo leer el archivo: ' + e.message }; }
  return { texto: '', tipo: ext || 'desconocido', aviso: 'Tipo de archivo no reconocido.' };
}

module.exports = { extraer, leerZip };
