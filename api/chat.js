// Proxy del chat de Comboi Labs (Vercel Serverless Function).
// La API key vive en una variable de entorno de Vercel (ANTHROPIC_API_KEY): el navegador nunca la ve.
// Cuando un visitante muestra intención real de contratar, el modelo usa la
// herramienta capture_lead para que avisemos al equipo por email (ver api/_lib/leadmail.js).

var notifyLead = require('./_lib/leadmail').notifyLead;

var SYSTEM_PROMPT = "Eres el agente de IA de Comboi Labs, una empresa de desarrollo de software de Benissa (Alicante). "
  + "Estás integrado en su web para ayudar a los visitantes.\n\n"
  + "Responde siempre en español, de forma breve (máximo 2-3 frases), directa y con un tono cercano pero profesional. Sin emojis en exceso.\n\n"
  + "Puedes responder sobre:\n"
  + "- Qué hace Comboi Labs (desarrollo web a medida, apps móviles, agentes de IA)\n"
  + "- Cómo funciona un agente de IA\n"
  + "- Precios orientativos (siempre \"depende del proyecto, en una llamada lo vemos\")\n"
  + "- Cómo contactar (hola@comboilabs.com o el formulario de contacto)\n\n"
  + "Si te preguntan algo fuera de ese ámbito, redirige con gracia hacia Comboi Labs.\n"
  + "Al final de cada respuesta, si tiene sentido, añade una pregunta de seguimiento corta.\n\n"
  + "Si el visitante muestra intención real de contratar o de que el equipo le contacte (no solo curiosidad general), "
  + "pídele su nombre y un email o teléfono si todavía no los ha dado en la conversación. "
  + "En cuanto tengas nombre + contacto, usa la herramienta capture_lead para registrarlo (no la uses sin esos dos datos, ni para preguntas generales). "
  + "Después de usarla, confirma al visitante que el equipo le contactará en 24-48h laborables.";

var TOOLS = [{
  name: 'capture_lead',
  description: 'Registra a un visitante interesado en contratar a Comboi Labs para que el equipo le contacte. Usar solo cuando ya tengas su nombre y un email o teléfono.',
  input_schema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Nombre del visitante' },
      contact: { type: 'string', description: 'Email o teléfono del visitante' },
      summary: { type: 'string', description: 'Resumen breve de qué necesita' }
    },
    required: ['name', 'contact', 'summary']
  }
}];

async function callClaude(messages){
  var upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages: messages
    })
  });

  if(!upstream.ok){
    var errBody = await upstream.text().catch(function(){ return ''; });
    console.error('Anthropic upstream error', upstream.status, errBody);
    throw new Error('upstream error ' + upstream.status);
  }
  return upstream.json();
}

function extractText(data){
  var blocks = (data && data.content) || [];
  for(var i = 0; i < blocks.length; i++){
    if(blocks[i].type === 'text') return blocks[i].text;
  }
  return '';
}

module.exports = async function handler(req, res){
  if(req.method !== 'POST'){
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  var messages = Array.isArray(req.body && req.body.messages) ? req.body.messages.slice(-8) : [];
  if(!messages.length){
    res.status(400).json({ error: 'falta "messages"' });
    return;
  }

  var data;
  try {
    data = await callClaude(messages);
  } catch(e){
    res.status(502).json({ error: 'no se pudo contactar con el proveedor de IA' });
    return;
  }

  if(data.stop_reason === 'tool_use'){
    var toolUses = data.content.filter(function(b){ return b.type === 'tool_use'; });
    var toolResults = [];

    for(var i = 0; i < toolUses.length; i++){
      var tu = toolUses[i];
      var resultText = 'ok';
      if(tu.name === 'capture_lead'){
        try {
          await notifyLead({
            name: tu.input && tu.input.name,
            contact: tu.input && tu.input.contact,
            message: tu.input && tu.input.summary,
            source: 'chat web'
          });
          resultText = 'lead guardado y notificado al equipo';
        } catch(e){
          console.error('lead notify error (chat)', e.message);
          resultText = 'no se pudo notificar al equipo automáticamente; dile al visitante que escriba también a hola@comboilabs.com por si acaso';
        }
      }
      toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: resultText });
    }

    var followUp = messages.concat([
      { role: 'assistant', content: data.content },
      { role: 'user', content: toolResults }
    ]);

    try {
      data = await callClaude(followUp);
    } catch(e){
      res.status(502).json({ error: 'no se pudo contactar con el proveedor de IA' });
      return;
    }
  }

  res.status(200).json({ text: extractText(data) });
};
