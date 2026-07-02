// POST /api/chat/message -> { session_id, message }
// Guarda el mensaje del usuario, genera la respuesta del agente (Anthropic),
// la guarda tambien y la devuelve. El historial vive en la BD (no en el navegador).
//
// Limite: maximo 20 mensajes por sesion (usuario + asistente).

var getSql = require('../_lib/db').getSql;
var generateReply = require('../_lib/ai').generateReply;
var notifyLead = require('../_lib/telegram').notifyLead;
var util = require('../_lib/util');

var MAX_MESSAGES = 20;   // por sesion
var CONTEXT_TURNS = 8;   // cuantos mensajes previos mandamos al modelo
var LIMIT_TEXT = 'Hemos llegado al limite de esta conversacion. Escribenos a hola@comboilabs.com y seguimos por ahi.';

module.exports = async function handler(req, res){
  if(req.method !== 'POST'){
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  var body = req.body || {};
  var sessionId = typeof body.session_id === 'string' ? body.session_id.trim() : '';
  var message = util.sanitize(body.message, 2000);

  if(!sessionId){ res.status(400).json({ error: 'falta session_id' }); return; }
  if(!message){ res.status(400).json({ error: 'falta message' }); return; }

  var sql;
  try {
    sql = getSql();
  } catch(e){
    res.status(500).json({ error: 'base de datos no configurada' });
    return;
  }

  // 1) Comprobar que la sesion existe y cuantos mensajes lleva.
  var prior;
  try {
    var sessions = await sql`SELECT id FROM chat_sessions WHERE id = ${sessionId}`;
    if(!sessions.length){ res.status(404).json({ error: 'sesion no encontrada' }); return; }
    prior = await sql`
      SELECT role, content FROM chat_messages
      WHERE session_id = ${sessionId}
      ORDER BY created_at ASC
    `;
  } catch(e){
    console.error('chat load error', e.message);
    res.status(500).json({ error: 'no se pudo leer la conversacion' });
    return;
  }

  // Limite de mensajes por sesion (contando el par que se anadiria ahora).
  if(prior.length >= MAX_MESSAGES){
    res.status(200).json({ text: LIMIT_TEXT, limit: true });
    return;
  }

  // 2) Guardar el mensaje del usuario.
  try {
    await sql`INSERT INTO chat_messages (session_id, role, content) VALUES (${sessionId}, 'user', ${message})`;
  } catch(e){
    console.error('chat user insert error', e.message);
    res.status(500).json({ error: 'no se pudo guardar el mensaje' });
    return;
  }

  // 3) Construir contexto para el modelo (ultimos turnos + el nuevo mensaje).
  var history = prior.slice(-CONTEXT_TURNS).map(function(m){
    return { role: m.role, content: m.content };
  });
  history.push({ role: 'user', content: message });

  // Handler de la herramienta capture_lead: guarda lead + avisa por Telegram.
  async function onCaptureLead(input){
    var nombre = util.sanitize(input.name, 120) || 'Sin nombre';
    var contacto = util.sanitize(input.contact, 160) || 'Sin contacto';
    var resumen = util.sanitize(input.summary, 2000) || '';
    try {
      await sql`
        INSERT INTO leads (nombre, email, mensaje, pagina_origen)
        VALUES (${nombre}, ${contacto}, ${resumen}, ${'chat'})
      `;
    } catch(e){
      console.error('chat lead insert error', e.message);
    }
    try {
      await notifyLead({ nombre: nombre, contacto: contacto, mensaje: resumen, origen: 'chat web' });
    } catch(e){
      console.error('chat telegram error', e.message);
      return 'lead guardado, pero no se pudo avisar al equipo; dile que escriba tambien a hola@comboilabs.com';
    }
    return 'lead guardado y notificado al equipo';
  }

  // 4) Generar respuesta del agente.
  var replyText;
  try {
    replyText = await generateReply(history, onCaptureLead);
  } catch(e){
    console.error('chat ai error', e.message);
    res.status(502).json({ error: 'no se pudo contactar con el proveedor de IA' });
    return;
  }

  // 5) Guardar la respuesta del asistente.
  try {
    await sql`INSERT INTO chat_messages (session_id, role, content) VALUES (${sessionId}, 'assistant', ${replyText})`;
  } catch(e){
    console.error('chat assistant insert error', e.message);
    // no bloqueamos: el usuario ya tiene su respuesta
  }

  res.status(200).json({ text: replyText });
};
