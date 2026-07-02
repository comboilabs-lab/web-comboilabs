// Utilidades compartidas entre funciones. Vercel ignora lo que empieza por "_".

// Recorta y limpia caracteres de control, respetando un maximo de longitud.
function sanitize(raw, max){
  var str = typeof raw === 'string' ? raw : '';
  var out = '';
  for(var i = 0; i < str.length && out.length < max; i++){
    var code = str.charCodeAt(i);
    // deja pasar saltos de linea y tabuladores, filtra el resto de control chars
    if(code === 10 || code === 9 || (code >= 32 && code !== 127)) out += str.charAt(i);
  }
  return out.trim();
}

function escapeHtml(str){
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Validacion de email sencilla y suficiente para un formulario.
function isValidEmail(email){
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

// IP del cliente detras del proxy de Vercel.
function clientIp(req){
  var fwd = req.headers['x-forwarded-for'];
  if(fwd) return String(fwd).split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || 'desconocida';
}

module.exports = { sanitize: sanitize, escapeHtml: escapeHtml, isValidEmail: isValidEmail, clientIp: clientIp };
