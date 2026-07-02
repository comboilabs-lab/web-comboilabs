// DIAGNOSTICO TEMPORAL de Telegram — BORRAR tras depurar.
// Protegido con ?key=<ADMIN_SESSION_SECRET>. Solo nombres de variables (no valores)
// y el resultado real de la llamada a Telegram.

module.exports = async function handler(req, res){
  var key = (req.query && req.query.key) || '';
  if(!process.env.ADMIN_SESSION_SECRET || key !== process.env.ADMIN_SESSION_SECRET){
    res.status(403).json({ error: 'forbidden' });
    return;
  }

  var allKeys = Object.keys(process.env).sort();
  // cualquier clave que "suene" a telegram/bot/chat, para cazar typos en el nombre
  var suspicious = allKeys.filter(function(k){
    return /gram|chat|\bbot\b|tele/i.test(k);
  });

  var token = process.env.TELEGRAM_BOT_TOKEN || '';
  var chat = process.env.TELEGRAM_CHAT_ID || '';

  var out = {
    totalKeys: allKeys.length,
    allKeys: allKeys,                 // solo nombres, no valores
    suspiciousKeys: suspicious,
    tokenPresent: 'TELEGRAM_BOT_TOKEN' in process.env,
    tokenLen: token.length,
    chatPresent: 'TELEGRAM_CHAT_ID' in process.env,
    chatVal: chat
  };

  if(token && chat){
    try {
      var r = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chat, text: 'diagnostico tg-test v3: envio OK desde el servidor.' })
      });
      out.sendStatus = r.status;
      out.sendBody = (await r.text()).slice(0, 300);
    } catch(e){
      out.sendError = e.message;
    }
  }

  res.status(200).json(out);
};
