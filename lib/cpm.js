'use strict';
// Ruta crítica basada en FECHAS PLANIFICADAS (date-driven CPM).
// Para cada actividad: holgura = (fecha límite de término sin retrasar a sus sucesoras) - (fecha fin planificada).
// Crítica = holgura <= 0 (cualquier retraso mueve la fecha final del proyecto).
const { dayNum } = require('./util');

function calcular(acts) {
  const out = new Map();
  const byId = new Map(acts.map(a => [a.id, a]));
  const preds = new Map(), succ = new Map();
  for (const a of acts) { preds.set(a.id, []); succ.set(a.id, []); }
  for (const a of acts) {
    for (const p of a.predecesoras || []) {
      if (byId.has(p) && p !== a.id) { preds.get(a.id).push(p); succ.get(p).push(a.id); }
    }
  }
  const ES = new Map(), EF = new Map();
  for (const a of acts) { ES.set(a.id, dayNum(a.fecha_inicio)); EF.set(a.id, dayNum(a.fecha_fin)); }

  // orden topológico (Kahn)
  const indeg = new Map(acts.map(a => [a.id, preds.get(a.id).length]));
  const cola = acts.filter(a => indeg.get(a.id) === 0).map(a => a.id);
  const orden = [];
  while (cola.length) {
    const id = cola.shift(); orden.push(id);
    for (const s of succ.get(id)) { indeg.set(s, indeg.get(s) - 1); if (indeg.get(s) === 0) cola.push(s); }
  }
  const ciclo = orden.length !== acts.length;
  const finProyecto = Math.max(...acts.map(a => EF.get(a.id)).filter(Number.isFinite), 0);

  const LF = new Map();
  if (!ciclo) {
    for (let i = orden.length - 1; i >= 0; i--) {
      const id = orden[i];
      const ss = succ.get(id);
      let lf = finProyecto;
      if (ss.length) lf = Math.min(...ss.map(s => LF.get(s) - Math.max(0, EF.get(s) - ES.get(s))));
      LF.set(id, lf);
    }
  }
  for (const a of acts) {
    const conflictos = preds.get(a.id).filter(p => EF.get(p) > ES.get(a.id)).map(p => byId.get(p).nombre);
    let holgura = null, critica = false;
    if (!ciclo && Number.isFinite(EF.get(a.id))) { holgura = LF.get(a.id) - EF.get(a.id); critica = holgura <= 0; }
    out.set(a.id, { holgura, critica, conflicto: conflictos, ciclo });
  }
  return { porId: out, finProyecto, ciclo };
}

module.exports = { calcular };
