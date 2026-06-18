// Proxy del chat de Comboi Labs (Cloudflare Worker).
// Guarda la API key de Anthropic en el servidor: el navegador nunca la ve.

var ALLOWED_ORIGINS = [
  'https://comboilabs.com',
  'https://www.comboilabs.com',
  'http://localhost:8731' // servidor de desarrollo local
];

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

function corsHeaders(origin){
  var allowed = ALLOWED_ORIGINS.indexOf(origin) !== -1 ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };
}

function jsonResponse(body, status, headers){
  return new Response(JSON.stringify(body), {
    status: status,
    headers: Object.assign({ 'Content-Type': 'application/json' }, headers)
  });
}

export default {
  async fetch(request, env){
    var origin = request.headers.get('Origin') || '';
    var cors = corsHeaders(origin);

    if(request.method === 'OPTIONS'){
      return new Response(null, { headers: cors });
    }
    if(request.method !== 'POST'){
      return jsonResponse({ error: 'method not allowed' }, 405, cors);
    }

    var payload;
    try {
      payload = await request.json();
    } catch(e){
      return jsonResponse({ error: 'JSON inválido' }, 400, cors);
    }

    var messages = Array.isArray(payload.messages) ? payload.messages.slice(-8) : [];
    if(!messages.length){
      return jsonResponse({ error: 'falta "messages"' }, 400, cors);
    }

    var upstream;
    try {
      upstream = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
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
      return jsonResponse({ error: 'no se pudo contactar con el proveedor de IA' }, 502, cors);
    }

    if(!upstream.ok){
      return jsonResponse({ error: 'error del proveedor de IA' }, 502, cors);
    }

    var data = await upstream.json();
    var text = (data && data.content && data.content[0] && data.content[0].text) || '';
    return jsonResponse({ text: text }, 200, cors);
  }
};
