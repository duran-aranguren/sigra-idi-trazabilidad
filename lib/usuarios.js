'use strict';
// Usuarios y sesiones para el modo público (hosting). Sin dependencias: scrypt + HMAC de node:crypto.
const crypto = require('crypto');
const { db, all, get, run, insert, getConfig, setConfig } = require('./db');

db.exec(`CREATE TABLE IF NOT EXISTS usuarios(
  id INTEGER PRIMARY KEY AUTOINCREMENT, usuario TEXT NOT NULL UNIQUE COLLATE NOCASE, nombre TEXT,
  rol TEXT NOT NULL DEFAULT 'lector', salt TEXT NOT NULL, hash TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1, activo INTEGER NOT NULL DEFAULT 1, creado TEXT, ultimo_acceso TEXT)`);

const ROLES = ['admin', 'editor', 'lector'];
const NIVEL = { lector: 1, editor: 2, admin: 3 };
const DIAS_SESION = 7;

const hashear = (pw, salt) => crypto.scryptSync(String(pw), Buffer.from(salt, 'hex'), 64).toString('hex');
function validarPassword(pw) {
  pw = String(pw || '');
  if (pw.length < 10) throw Object.assign(new Error('La contraseña debe tener al menos 10 caracteres'), { status: 400 });
  if (pw.length > 200) throw Object.assign(new Error('Contraseña demasiado larga'), { status: 400 });
  return pw;
}
function validarUsuario(u) {
  u = String(u || '').trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,40}$/.test(u)) throw Object.assign(new Error('Usuario: 3 a 40 caracteres (letras, números, punto, guion)'), { status: 400 });
  return u;
}
function crear({ usuario, nombre, rol, password }) {
  usuario = validarUsuario(usuario); validarPassword(password);
  if (!ROLES.includes(rol)) throw Object.assign(new Error('Rol inválido'), { status: 400 });
  if (get('SELECT id FROM usuarios WHERE usuario=?', usuario)) throw Object.assign(new Error('Ese usuario ya existe'), { status: 409 });
  const salt = crypto.randomBytes(16).toString('hex');
  return insert('usuarios', { usuario, nombre: String(nombre || usuario).slice(0, 80), rol, salt, hash: hashear(password, salt), creado: new Date().toISOString() });
}
function cambiar(id, { nombre, rol, password, activo }) {
  const u = get('SELECT * FROM usuarios WHERE id=?', id); if (!u) throw Object.assign(new Error('Usuario no encontrado'), { status: 404 });
  const o = {};
  if (nombre !== undefined) o.nombre = String(nombre).slice(0, 80);
  if (rol !== undefined) { if (!ROLES.includes(rol)) throw Object.assign(new Error('Rol inválido'), { status: 400 }); o.rol = rol; }
  if (activo !== undefined) o.activo = activo ? 1 : 0;
  if (password) { validarPassword(password); const salt = crypto.randomBytes(16).toString('hex'); o.salt = salt; o.hash = hashear(password, salt); o.version = u.version + 1; }
  const quedaAdmin = (o.rol ?? u.rol) === 'admin' && (o.activo ?? u.activo) === 1;
  if (u.rol === 'admin' && !quedaAdmin && get("SELECT COUNT(*) c FROM usuarios WHERE rol='admin' AND activo=1 AND id<>?", id).c === 0) throw Object.assign(new Error('Debe quedar al menos un administrador activo'), { status: 400 });
  if (Object.keys(o).length) run(`UPDATE usuarios SET ${Object.keys(o).map(k => k + '=?').join(',')} WHERE id=?`, ...Object.values(o), id);
}
function borrar(id) {
  const u = get('SELECT * FROM usuarios WHERE id=?', id); if (!u) throw Object.assign(new Error('Usuario no encontrado'), { status: 404 });
  if (u.rol === 'admin' && get("SELECT COUNT(*) c FROM usuarios WHERE rol='admin' AND activo=1 AND id<>?", id).c === 0) throw Object.assign(new Error('Debe quedar al menos un administrador activo'), { status: 400 });
  run('DELETE FROM usuarios WHERE id=?', id);
}
const listar = () => all('SELECT id,usuario,nombre,rol,activo,creado,ultimo_acceso FROM usuarios ORDER BY id');

// Dummy para igualar tiempos cuando el usuario no existe
const DUMMY_SALT = crypto.randomBytes(16).toString('hex'); const DUMMY_HASH = hashear('x', DUMMY_SALT);
function verificar(usuario, password) {
  const u = get('SELECT * FROM usuarios WHERE usuario=?', String(usuario || '').trim().toLowerCase());
  const h = hashear(String(password || '').slice(0, 200), u ? u.salt : DUMMY_SALT);
  const ref = Buffer.from(u ? u.hash : DUMMY_HASH, 'hex'); const cand = Buffer.from(h, 'hex');
  if (!u || !u.activo || !crypto.timingSafeEqual(ref, cand)) return null;
  run('UPDATE usuarios SET ultimo_acceso=? WHERE id=?', new Date().toISOString(), u.id);
  return u;
}

function secreto() {
  if (process.env.IDI_SECRET && process.env.IDI_SECRET.length >= 16) return process.env.IDI_SECRET;
  let s = getConfig('sesion_secreto'); if (!s) { s = crypto.randomBytes(32).toString('hex'); setConfig('sesion_secreto', s); } return s;
}
const firma = txt => crypto.createHmac('sha256', secreto()).update(txt).digest('hex');
function emitir(u) { const exp = Date.now() + DIAS_SESION * 864e5; const p = `${u.id}.${u.version}.${exp}`; return `${p}.${firma(p)}`; }
function desdeToken(t) {
  const [id, ver, exp, sig] = String(t || '').split('.');
  if (!sig) return null;
  const p = `${id}.${ver}.${exp}`; const esp = firma(p);
  if (sig.length !== esp.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(esp))) return null;
  if (Number(exp) < Date.now()) return null;
  const u = get('SELECT * FROM usuarios WHERE id=?', Number(id));
  return u && u.activo && u.version === Number(ver) ? u : null;
}
// Administrador inicial desde variables de entorno (o contraseña aleatoria que se imprime una sola vez en el log)
function iniciarAdmin() {
  if (get('SELECT COUNT(*) c FROM usuarios').c) return null;
  const usuario = process.env.IDI_ADMIN_USER || 'admin';
  let pw = process.env.IDI_ADMIN_PASS, generada = false;
  if (!pw || pw.length < 10) { pw = crypto.randomBytes(9).toString('base64url'); generada = true; }
  crear({ usuario, nombre: 'Administrador', rol: 'admin', password: pw });
  return { usuario, password: generada ? pw : null };
}
// Usuarios adicionales desde IDI_USUARIOS="usuario:rol:clave;usuario2:rol:clave2" (útil en hosting sin disco,
// donde la base se recrea en cada reinicio). Solo crea los que no existen; no cambia los existentes.
function iniciarUsuariosEnv() {
  const out = [];
  for (const item of String(process.env.IDI_USUARIOS || '').split(';').map(x => x.trim()).filter(Boolean)) {
    const [usuario, rol, ...resto] = item.split(':'); const password = resto.join(':');
    try { if (!get('SELECT id FROM usuarios WHERE usuario=?', String(usuario || '').trim().toLowerCase())) { crear({ usuario, nombre: usuario, rol: (rol || 'lector').trim(), password }); out.push(usuario); } }
    catch (e) { console.error(`  IDI_USUARIOS: no se creó «${usuario}»: ${e.message}`); }
  }
  return out;
}
const puede = (u, nivel) => !!u && NIVEL[u.rol] >= NIVEL[nivel];
module.exports = { iniciarUsuariosEnv, crear, cambiar, borrar, listar, verificar, emitir, desdeToken, iniciarAdmin, puede, ROLES };
