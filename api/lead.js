// Recibe el formulario de contacto (contacto.html) y avisa al equipo por email.
var notifyLead = require('./_lib/leadmail').notifyLead;

module.exports = async function handler(req, res){
  if(req.method !== 'POST'){
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  var body = req.body || {};
  if(body.website){
    // honeypot anti-spam: lo ignoramos en silencio, sin avisar de que es spam
    res.status(200).json({ ok: true });
    return;
  }

  var name = typeof body.name === 'string' ? body.name.trim() : '';
  var email = typeof body.email === 'string' ? body.email.trim() : '';
  var mensaje = typeof body.mensaje === 'string' ? body.mensaje.trim() : '';
  var empresa = typeof body.empresa === 'string' ? body.empresa.trim() : '';

  if(!name || !email || !mensaje){
    res.status(400).json({ error: 'faltan campos obligatorios' });
    return;
  }

  try {
    await notifyLead({
      name: name,
      contact: empresa ? (email + ' · ' + empresa) : email,
      message: mensaje,
      source: 'formulario de contacto'
    });
    res.status(200).json({ ok: true });
  } catch(e){
    console.error('lead notify error (formulario)', e.message);
    res.status(502).json({ error: 'no se pudo enviar el mensaje' });
  }
};
