// Recibe el formulario de contacto (contacto.html): valida, guarda el lead en
// Neon Postgres y avisa al equipo por Telegram. El aviso nunca bloquea el guardado.
//
// Cumple el rol de "POST /api/contact" del brief; el formulario ya apunta aqui.

var getSql = require('./_lib/db').getSql;
var notifyLead = require('./_lib/telegram').notifyLead;
var util = require('./_lib/util');

var MAX = { nombre: 120, email: 254, telefono: 40, empresa: 120, mensaje: 5000, pagina: 200 };

// --- Rate limiting basico en memoria (por instancia; suficiente como primer filtro) ---
var RATE_WINDOW_MS = 10 * 60 * 1000; // 10 min
var RATE_MAX = 5;                    // 5 envios por IP en la ventana
var hits = new Map();                // ip -> [timestamps]

function rateLimited(ip){
  var now = Date.now();
  var arr = (hits.get(ip) || []).filter(function(t){ return now - t < RATE_WINDOW_MS; });
  arr.push(now);
  hits.set(ip, arr);
  // limpieza oportunista para que el Map no crezca sin fin
  if(hits.size > 5000) hits.clear();
  return arr.length > RATE_MAX;
}

module.exports = async function handler(req, res){
  if(req.method !== 'POST'){
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  var body = req.body || {};

  // Honeypot: si viene relleno, respondemos 200 pero NO guardamos ni avisamos.
  if(body.website){
    res.status(200).json({ ok: true });
    return;
  }

  // Consentimiento RGPD obligatorio.
  if(body.consent !== true && body.consent !== 'true' && body.consent !== 'on'){
    res.status(400).json({ error: 'Debes aceptar la politica de privacidad para continuar.' });
    return;
  }

  var ip = util.clientIp(req);
  if(rateLimited(ip)){
    res.status(429).json({ error: 'Demasiados envios. Prueba de nuevo en unos minutos.' });
    return;
  }

  // Acepta tanto "nombre" (brief) como "name" (formulario actual).
  var nombre = util.sanitize(body.nombre != null ? body.nombre : body.name, MAX.nombre);
  var email = util.sanitize(body.email, MAX.email);
  var telefono = util.sanitize(body.telefono, MAX.telefono);
  var empresa = util.sanitize(body.empresa, MAX.empresa);
  var mensaje = util.sanitize(body.mensaje, MAX.mensaje);
  var pagina = util.sanitize(body.pagina_origen, MAX.pagina);

  // Validacion.
  var errores = [];
  if(!nombre) errores.push('nombre');
  if(!util.isValidEmail(email)) errores.push('email');
  if(!mensaje) errores.push('mensaje');
  if(errores.length){
    res.status(400).json({ error: 'Revisa estos campos: ' + errores.join(', ') + '.' });
    return;
  }

  // 1) Guardar el lead (lo prioritario: si esto falla, devolvemos error).
  try {
    var sql = getSql();
    await sql`
      INSERT INTO leads (nombre, email, telefono, empresa, mensaje, pagina_origen)
      VALUES (${nombre}, ${email}, ${telefono || null}, ${empresa || null}, ${mensaje}, ${pagina || null})
    `;
  } catch(e){
    console.error('lead insert error', e.message);
    res.status(500).json({ error: 'No se pudo registrar el mensaje. Escribenos a hola@comboilabs.com' });
    return;
  }

  // 2) Avisar por Telegram (best-effort: si falla, el lead ya esta guardado).
  try {
    var contacto = email + (telefono ? (' · ' + telefono) : '') + (empresa ? (' · ' + empresa) : '');
    await notifyLead({
      nombre: nombre,
      contacto: contacto,
      mensaje: mensaje,
      origen: 'formulario de contacto',
      pagina: pagina
    });
  } catch(e){
    console.error('telegram notify error (formulario)', e.message);
  }

  res.status(200).json({ ok: true });
};
