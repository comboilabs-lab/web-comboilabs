// POST /api/chat/session -> crea una sesion de chat y devuelve su id (uuid).
var getSql = require('../_lib/db').getSql;
var util = require('../_lib/util');

module.exports = async function handler(req, res){
  if(req.method !== 'POST'){
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  var body = req.body || {};
  var pagina = util.sanitize(body.pagina_origen, 200);

  try {
    var sql = getSql();
    var rows = await sql`
      INSERT INTO chat_sessions (pagina_origen)
      VALUES (${pagina || null})
      RETURNING id
    `;
    res.status(200).json({ session_id: rows[0].id });
  } catch(e){
    console.error('chat session create error', e.message);
    res.status(500).json({ error: 'no se pudo crear la sesion de chat' });
  }
};
