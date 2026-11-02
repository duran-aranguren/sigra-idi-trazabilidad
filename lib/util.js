'use strict';
// Utilidades de fechas (todas en UTC para evitar problemas de zona horaria) y helpers varios.
const DAY = 86400000;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

function hoyISO() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function dayNum(iso) {
  if (!iso || !ISO.test(iso)) return NaN;
  const [y, m, d] = iso.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY);
}
function fromDayNum(n) {
  const d = new Date(n * DAY);
  const p = x => String(x).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}
const addDays = (iso, n) => fromDayNum(dayNum(iso) + n);
const diffDays = (a, b) => dayNum(a) - dayNum(b); // a - b

// Generador pseudoaleatorio determinista (para datos demo reproducibles)
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const num = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
const quitarTildes = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
const norm = s => quitarTildes(s).toLowerCase();

module.exports = { hoyISO, dayNum, fromDayNum, addDays, diffDays, mulberry32, clamp, num, quitarTildes, norm, ISO };
