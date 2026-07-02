// Logica del agente de IA (Anthropic). La usa /api/chat/message.
// La API key vive en ANTHROPIC_API_KEY (entorno de Vercel): el navegador nunca la ve.
// Cuando un visitante muestra intencion real de contratar y da nombre + contacto,
// el modelo usa la herramienta capture_lead; el endpoint decide que hacer con ella
// (guardar lead + avisar por Telegram).

var MODEL = 'claude-sonnet-4-6';

var SYSTEM_PROMPT = "Eres el agente de IA de Comboi Labs, una empresa de desarrollo de software de Benissa (Alicante). "
  + "Estas integrado en su web para ayudar a los visitantes.\n\n"
  + "Responde siempre en español, de forma breve (maximo 2-3 frases), directa y con un tono cercano pero profesional. Sin emojis en exceso.\n\n"
  + "Puedes responder sobre:\n"
  + "- Que hace Comboi Labs (desarrollo web a medida, apps moviles, agentes de IA)\n"
  + "- Como funciona un agente de IA\n"
  + "- Precios orientativos (siempre \"depende del proyecto, en una llamada lo vemos\")\n"
  + "- Como contactar (hola@comboilabs.com o el formulario de contacto)\n\n"
  + "Si te preguntan algo fuera de ese ambito, redirige con gracia hacia Comboi Labs.\n"
  + "Al final de cada respuesta, si tiene sentido, añade una pregunta de seguimiento corta.\n\n"
  + "Si el visitante muestra intencion real de contratar o de que el equipo le contacte (no solo curiosidad general), "
  + "pidele su nombre y un email o telefono si todavia no los ha dado en la conversacion. "
  + "En cuanto tengas nombre + contacto, usa la herramienta capture_lead para registrarlo (no la uses sin esos dos datos, ni para preguntas generales). "
  + "Despues de usarla, confirma al visitante que el equipo le contactara en 24-48h laborables.";

var TOOLS = [{
  name: 'capture_lead',
  description: 'Registra a un visitante interesado en contratar a Comboi Labs para que el equipo le contacte. Usar solo cuando ya tengas su nombre y un email o telefono.',
  input_schema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Nombre del visitante' },
      contact: { type: 'string', description: 'Email o telefono del visitante' },
      summary: { type: 'string', description: 'Resumen breve de que necesita' }
    },
    required: ['name', 'contact', 'summary']
  }
}];

async function callClaude(messages){
  if(!process.env.ANTHROPIC_API_KEY){
    throw new Error('falta ANTHROPIC_API_KEY');
  }
  var upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: MODEL,
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

// Genera la respuesta del agente para un historial de mensajes.
// onCaptureLead(input) -> Promise<string> se invoca si el modelo captura un lead;
// debe devolver el texto de resultado para la herramienta.
async function generateReply(messages, onCaptureLead){
  var data = await callClaude(messages);

  if(data.stop_reason === 'tool_use'){
    var toolUses = data.content.filter(function(b){ return b.type === 'tool_use'; });
    var toolResults = [];

    for(var i = 0; i < toolUses.length; i++){
      var tu = toolUses[i];
      var resultText = 'ok';
      if(tu.name === 'capture_lead' && typeof onCaptureLead === 'function'){
        try {
          resultText = await onCaptureLead(tu.input || {});
        } catch(e){
          console.error('capture_lead handler error', e.message);
          resultText = 'no se pudo registrar el lead automaticamente; dile al visitante que escriba tambien a hola@comboilabs.com por si acaso';
        }
      }
      toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: resultText });
    }

    var followUp = messages.concat([
      { role: 'assistant', content: data.content },
      { role: 'user', content: toolResults }
    ]);
    data = await callClaude(followUp);
  }

  return extractText(data);
}

module.exports = { generateReply: generateReply };
