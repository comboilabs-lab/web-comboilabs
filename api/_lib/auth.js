// Autenticacion del panel /admin: login usuario/contrasena contra variables
// de entorno (ADMIN_USER + ADMIN_PASSWORD_HASH bcrypt) y sesion en cookie
// firmada con HMAC (ADMIN_SESSION_SECRET). Sin librerias de auth pesadas.

var crypto = require('crypto');
var bcrypt = require('bcryptjs');

var COOKIE_NAME = 'comboi_admin';
var SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8 horas

function getSecret(){
  var s = process.env.ADMIN_SESSION_SECRET;
  if(!s) throw new Error('falta ADMIN_SESSION_SECRET');
  return s;
}

// Compara la contrasena con el hash bcrypt de ADMIN_PASSWORD_HASH.
function checkCredentials(user, password){
  var expectedUser = process.env.ADMIN_USER || '';
  var hash = process.env.ADMIN_PASSWORD_HASH || '';
  if(!expectedUser || !hash) return false;
  if(typeof user !== 'string' || typeof password !== 'string') return false;
  // comparacion de usuario en tiempo (casi) constante
  var a = Buffer.from(user);
  var b = Buffer.from(expectedUser);
  var userOk = a.length === b.length && crypto.timingSafeEqual(a, b);
  if(!userOk) return false;
  try {
    return bcrypt.compareSync(password, hash);
  } catch(e){
    return false;
  }
}

// --- Token de sesion firmado: "<expiraMs>.<hmac>" ---
function signToken(){
  var exp = Date.now() + SESSION_TTL_MS;
  var payload = String(exp);
  var sig = crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
  return payload + '.' + sig;
}

function verifyToken(token){
  if(!token || typeof token !== 'string') return false;
  var parts = token.split('.');
  if(parts.length !== 2) return false;
  var payload = parts[0];
  var sig = parts[1];
  var expected = crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
  var a = Buffer.from(sig);
  var b = Buffer.from(expected);
  if(a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  var exp = parseInt(payload, 10);
  return Number.isFinite(exp) && Date.now() < exp;
}

function parseCookies(req){
  var header = req.headers.cookie || '';
  var out = {};
  header.split(';').forEach(function(pair){
    var idx = pair.indexOf('=');
    if(idx === -1) return;
    var k = pair.slice(0, idx).trim();
    var v = pair.slice(idx + 1).trim();
    if(k) out[k] = decodeURIComponent(v);
  });
  return out;
}

function isAuthed(req){
  var cookies = parseCookies(req);
  try {
    return verifyToken(cookies[COOKIE_NAME]);
  } catch(e){
    return false;
  }
}

function sessionCookie(){
  var maxAge = Math.floor(SESSION_TTL_MS / 1000);
  return COOKIE_NAME + '=' + encodeURIComponent(signToken())
    + '; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=' + maxAge;
}

function clearCookie(){
  return COOKIE_NAME + '=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0';
}

module.exports = {
  checkCredentials: checkCredentials,
  isAuthed: isAuthed,
  sessionCookie: sessionCookie,
  clearCookie: clearCookie
};
