'use strict';
const path = require('path');
const fs = require('fs');
let DatabaseSync;
try { ({ DatabaseSync } = require('node:sqlite')); }
catch { console.error(`\n  Esta app necesita Node.js 22.13 o superior (tienes ${process.version}).\n  Descarga la versión LTS desde https://nodejs.org y vuelve a intentarlo.\n`); process.exit(1); }

const DATA_DIR = path.join(__dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_FILE = process.env.IDI_DB || path.join(DATA_DIR, 'idi.db');

const db = new DatabaseSync(DB_FILE);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS personas(
  id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT UNIQUE NOT NULL, rol TEXT, area TEXT);
CREATE TABLE IF NOT EXISTS proyectos(
  id INTEGER PRIMARY KEY AUTOINCREMENT, codigo TEXT UNIQUE NOT NULL, nombre TEXT NOT NULL, descripcion TEXT,
  linea TEXT, tipo_innovacion TEXT DEFAULT 'Incremental', horizonte TEXT DEFAULT 'H1',
  etapa INTEGER DEFAULT 0, estado TEXT DEFAULT 'En curso', lider TEXT, sponsor TEXT,
  fecha_inicio TEXT, fecha_objetivo TEXT, presupuesto REAL DEFAULT 0, ejecutado REAL DEFAULT 0,
  vpn_esperado REAL DEFAULT 0, p_tecnica REAL DEFAULT 0.5, p_comercial REAL DEFAULT 0.5, trl INTEGER DEFAULT 1,
  s_estrategia INTEGER DEFAULT 3, s_mercado INTEGER DEFAULT 3, s_tecnica INTEGER DEFAULT 3,
  s_capacidad INTEGER DEFAULT 3, s_riesgo INTEGER DEFAULT 3,
  decision_final TEXT, lecciones TEXT, creado TEXT, actualizado TEXT);
CREATE TABLE IF NOT EXISTS actividades(
  id INTEGER PRIMARY KEY AUTOINCREMENT, proyecto_id INTEGER NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  etapa INTEGER DEFAULT 0, nombre TEXT NOT NULL, responsable TEXT, fecha_inicio TEXT, fecha_fin TEXT,
  avance INTEGER DEFAULT 0, estado TEXT DEFAULT '', es_hito INTEGER DEFAULT 0, predecesoras TEXT DEFAULT '[]',
  notas TEXT, orden INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS stakeholders(
  id INTEGER PRIMARY KEY AUTOINCREMENT, proyecto_id INTEGER NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL, organizacion TEXT, rol TEXT, poder INTEGER DEFAULT 3, interes INTEGER DEFAULT 3,
  postura TEXT DEFAULT 'Neutral', expectativa TEXT, estrategia_comunicacion TEXT, contacto TEXT);
CREATE TABLE IF NOT EXISTS restricciones(
  id INTEGER PRIMARY KEY AUTOINCREMENT, proyecto_id INTEGER NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  tipo TEXT, titulo TEXT NOT NULL, descripcion TEXT, origen TEXT DEFAULT 'Externo',
  probabilidad INTEGER DEFAULT 3, impacto INTEGER DEFAULT 3, mitigacion TEXT, responsable TEXT,
  estado TEXT DEFAULT 'Abierta', fecha_revision TEXT);
CREATE TABLE IF NOT EXISTS gates(
  id INTEGER PRIMARY KEY AUTOINCREMENT, proyecto_id INTEGER NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  etapa_origen INTEGER, etapa_destino INTEGER, fecha TEXT, decision TEXT, comentario TEXT, decidido_por TEXT);
CREATE TABLE IF NOT EXISTS expost(
  id INTEGER PRIMARY KEY AUTOINCREMENT, proyecto_id INTEGER NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  kpi TEXT NOT NULL, meta REAL, real REAL, unidad TEXT, mayor_mejor INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS documentos(
  id INTEGER PRIMARY KEY AUTOINCREMENT, proyecto_id INTEGER REFERENCES proyectos(id) ON DELETE SET NULL,
  nombre_original TEXT, archivo TEXT, mime TEXT, tamano INTEGER, tipo_doc TEXT, subido TEXT,
  estado TEXT DEFAULT 'Pendiente', texto TEXT, resumen TEXT, propuesta TEXT, modo TEXT, error TEXT);
CREATE TABLE IF NOT EXISTS bitacora(
  id INTEGER PRIMARY KEY AUTOINCREMENT, proyecto_id INTEGER REFERENCES proyectos(id) ON DELETE CASCADE,
  fecha TEXT, accion TEXT, detalle TEXT, origen TEXT DEFAULT 'manual');
CREATE TABLE IF NOT EXISTS config(clave TEXT PRIMARY KEY, valor TEXT);
CREATE INDEX IF NOT EXISTS ix_act_proy ON actividades(proyecto_id);
CREATE INDEX IF NOT EXISTS ix_sta_proy ON stakeholders(proyecto_id);
CREATE INDEX IF NOT EXISTS ix_res_proy ON restricciones(proyecto_id);
`);

const clean = v => (v === undefined ? null : (typeof v === 'boolean' ? (v ? 1 : 0) : v));
const all = (sql, ...p) => db.prepare(sql).all(...p.map(clean));
const get = (sql, ...p) => db.prepare(sql).get(...p.map(clean));
const run = (sql, ...p) => db.prepare(sql).run(...p.map(clean));
function tx(fn) {
  db.exec('BEGIN');
  try { const r = fn(); db.exec('COMMIT'); return r; }
  catch (e) { try { db.exec('ROLLBACK'); } catch {} throw e; }
}
function insert(tabla, obj) {
  const cols = Object.keys(obj);
  const r = run(`INSERT INTO ${tabla}(${cols.join(',')}) VALUES(${cols.map(() => '?').join(',')})`, ...cols.map(c => obj[c]));
  return Number(r.lastInsertRowid);
}
function update(tabla, id, obj) {
  const cols = Object.keys(obj);
  if (!cols.length) return;
  run(`UPDATE ${tabla} SET ${cols.map(c => c + '=?').join(',')} WHERE id=?`, ...cols.map(c => obj[c]), id);
}
const getConfig = (k, d = null) => { const r = get('SELECT valor FROM config WHERE clave=?', k); return r ? r.valor : d; };
const setConfig = (k, v) => run('INSERT INTO config(clave,valor) VALUES(?,?) ON CONFLICT(clave) DO UPDATE SET valor=excluded.valor', k, String(v));

module.exports = { db, all, get, run, tx, insert, update, getConfig, setConfig, DB_FILE };
