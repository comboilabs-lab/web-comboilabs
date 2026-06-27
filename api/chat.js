// Proxy del chat de Comboi Labs (Vercel Serverless Function).
// La API key vive en una variable de entorno de Vercel (ANTHROPIC_API_KEY): el navegador nunca la ve.

var SYSTEM_PROMPT = "Eres el agente de IA de Comboi Labs, una empresa de desarrollo de software de Benissa (Alicante). "
  + "Estás integrado en su web para ayudar a los visitantes.\n\n"
  + "Responde siempre en español, de forma breve (máximo 2-3 frases), directa y con un tono cercano pero profesional. Sin emojis en exceso.\n\n"
  + "Puedes responder sobre:\n"
  + "- Qué hace Comboi Labs (desarrollo web a medida, apps móviles, agentes de IA)\n"
  + "- Cómo funciona un agente de IA\n"
  + "- Precios orientativos (siempre \"depende del proyecto, en una llamada lo vemos\")\n"
  + "- Cómo contactar (hola@comboilabs.com o el formulario de contacto)\n\n"
  + "Si te preguntan algo fuera de ese ámbito, redirige con gracia hacia Comboi Labs.\n"
  + "Al final de cada respuesta, si tiene sentido, añade una pregunta de seguimiento corta.";

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

  var upstream;
  try {
    upstream = await fetch('https://api.anthropic.com/v1/messages', {
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
        messages: messages
      })
    });
  } catch(e){
    res.status(502).json({ error: 'no se pudo contactar con el proveedor de IA' });
    return;
  }

  if(!upstream.ok){
    res.status(502).json({ error: 'error del proveedor de IA' });
    return;
  }

  var data = await upstream.json();
  var text = (data && data.content && data.content[0] && data.content[0].text) || '';
  res.status(200).json({ text: text });
};
