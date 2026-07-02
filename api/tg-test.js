// DIAGNOSTICO TEMPORAL de Telegram — BORRAR tras depurar.
// Protegido con ?key=<ADMIN_SESSION_SECRET>. No expone el token: solo su longitud
// y los ultimos 4 caracteres, mas el resultado real de la llamada a Telegram.

module.exports = async function handler(req, res){
  var key = (req.query && req.query.key) || '';
  if(!process.env.ADMIN_SESSION_SECRET || key !== process.env.ADMIN_SESSION_SECRET){
    res.status(403).json({ error: 'forbidden' });
    return;
  }

  var token = process.env.TELEGRAM_BOT_TOKEN || '';
  var chat = process.env.TELEGRAM_CHAT_ID || '';

  var out = {
    hasToken: !!token,
    tokenLen: token.length,          // esperado: 46
    tokenTail: token ? token.slice(-4) : null,  // esperado: "oesE"
    tokenHasSpace: /\s/.test(token), // true = hay espacio/salto de linea (mal)
    hasChat: !!chat,
    chatVal: chat,                   // el chat_id no es secreto
    chatLen: chat.length,            // esperado: 10
    chatHasSpace: /\s/.test(chat),
    // nombres (no valores) de las variables presentes en la funcion, filtrados
    // a lo relevante: sirve para detectar typos/espacios en el NOMBRE de la clave.
    envKeys: Object.keys(process.env).filter(function(k){
      return /tele|admin|databas|anthro|resend|kv_/i.test(k);
    }).sort()
  };

  if(token && chat){
    try {
      var r = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chat, text: 'diagnostico tg-test: si ves esto, el server puede enviar a Telegram.' })
      });
      out.sendStatus = r.status;
      out.sendBody = (await r.text()).slice(0, 300);
    } catch(e){
      out.sendError = e.message;
    }
  }

  res.status(200).json(out);
};
