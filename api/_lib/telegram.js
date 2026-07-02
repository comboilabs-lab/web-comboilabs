// Avisa al equipo por Telegram cuando llega un lead nuevo
// (formulario de contacto o chat de IA).
// Usa TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID del entorno.
// Si algo falla, lanza; quien llama decide si lo ignora (nunca debe bloquear el lead).

var sanitize = require('./util').sanitize;

function escapeMd(str){
  // Escapa lo necesario para modo HTML de Telegram.
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function notifyLead(lead){
  var token = process.env.TELEGRAM_BOT_TOKEN;
  var chatId = process.env.TELEGRAM_CHAT_ID;
  if(!token || !chatId){
    throw new Error('faltan TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID');
  }

  var nombre = sanitize(lead.nombre, 80) || 'Sin nombre';
  var contacto = sanitize(lead.contacto, 160) || 'Sin contacto';
  var mensaje = sanitize(lead.mensaje, 2000) || '(sin mensaje)';
  var origen = sanitize(lead.origen, 60) || 'web';
  var pagina = sanitize(lead.pagina, 120) || '';

  var text = '<b>\u{1F4E9} Nuevo lead</b> (' + escapeMd(origen) + ')\n\n'
    + '<b>Nombre:</b> ' + escapeMd(nombre) + '\n'
    + '<b>Contacto:</b> ' + escapeMd(contacto) + '\n'
    + (pagina ? ('<b>Pagina:</b> ' + escapeMd(pagina) + '\n') : '')
    + '\n' + escapeMd(mensaje);

  var res = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    })
  });

  if(!res.ok){
    var body = await res.text().catch(function(){ return ''; });
    throw new Error('Telegram error ' + res.status + ': ' + body);
  }
}

module.exports = { notifyLead: notifyLead };
