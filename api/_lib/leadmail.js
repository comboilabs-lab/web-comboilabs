// Utilidad compartida para avisar al equipo cuando llega un lead nuevo
// (formulario de contacto o chat de IA), via Resend.
// Vercel ignora los ficheros/carpetas que empiezan por "_": esto no es un endpoint.

function sanitize(raw, max){
  var str = typeof raw === 'string' ? raw : '';
  var out = '';
  for(var i = 0; i < str.length && out.length < max; i++){
    var code = str.charCodeAt(i);
    if(code >= 32 && code !== 127) out += str.charAt(i);
  }
  return out.trim();
}

function escapeHtml(str){
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function notifyLead(lead){
  var name = sanitize(lead.name, 80) || 'Sin nombre';
  var contact = sanitize(lead.contact, 120) || 'Sin contacto';
  var message = sanitize(lead.message, 2000) || '';
  var source = sanitize(lead.source, 40) || 'web';

  var to = process.env.LEAD_NOTIFY_TO || 'hola@comboilabs.com';
  var from = process.env.LEAD_FROM || 'Comboi Labs <onboarding@resend.dev>';

  var payload = {
    from: from,
    to: [to],
    subject: 'Nuevo lead (' + source + '): ' + name,
    html: '<p><strong>Origen:</strong> ' + escapeHtml(source) + '</p>'
      + '<p><strong>Nombre:</strong> ' + escapeHtml(name) + '</p>'
      + '<p><strong>Contacto:</strong> ' + escapeHtml(contact) + '</p>'
      + '<p><strong>Mensaje:</strong><br>' + escapeHtml(message).replace(/\n/g, '<br>') + '</p>'
  };
  if(contact.indexOf('@') !== -1) payload.reply_to = contact;

  var res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if(!res.ok){
    var body = await res.text().catch(function(){ return ''; });
    throw new Error('Resend error ' + res.status + ': ' + body);
  }
}

module.exports = { notifyLead: notifyLead };
