// Ranking global del Debug Runner (Vercel Serverless Function + Vercel KV).
// Al conectar un almacén Vercel KV al proyecto, Vercel inyecta solo
// KV_REST_API_URL y KV_REST_API_TOKEN: no hay credenciales en el código.

var LEADERBOARD_KEY = 'comboi:leaderboard';
var LEADERBOARD_MAX_STORED = 50;
var LEADERBOARD_MAX_RETURNED = 10;

function sanitizeName(raw){
  var str = typeof raw === 'string' ? raw : '';
  var out = '';
  for(var i = 0; i < str.length && out.length < 20; i++){
    var code = str.charCodeAt(i);
    if(code >= 32 && code !== 127) out += str.charAt(i);
  }
  out = out.trim();
  return out || 'Anónimo';
}

async function kv(command){
  var res = await fetch(process.env.KV_REST_API_URL, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + process.env.KV_REST_API_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify([command])
  });
  if(!res.ok) throw new Error('kv error ' + res.status);
  var data = await res.json();
  return data[0] && data[0].result;
}

async function getLeaderboard(){
  var raw = await kv(['GET', LEADERBOARD_KEY]);
  if(!raw) return [];
  try {
    var list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch(e){
    return [];
  }
}

module.exports = async function handler(req, res){
  if(req.method === 'GET'){
    var requested = parseInt(req.query.limit, 10) || LEADERBOARD_MAX_RETURNED;
    var limit = Math.min(LEADERBOARD_MAX_RETURNED * 2, Math.max(1, requested));
    try {
      var list = await getLeaderboard();
      res.status(200).json({ scores: list.slice(0, limit) });
    } catch(e){
      res.status(502).json({ error: 'no se pudo leer el ranking' });
    }
    return;
  }

  if(req.method === 'POST'){
    var body = req.body || {};
    var score = Math.floor(Number(body.score));
    if(!Number.isFinite(score) || score < 0 || score > 100000){
      res.status(400).json({ error: 'puntuación inválida' });
      return;
    }
    var entry = { name: sanitizeName(body.name), score: score, date: new Date().toISOString() };
    try {
      var current = await getLeaderboard();
      current.push(entry);
      current.sort(function(a, b){ return b.score - a.score; });
      current = current.slice(0, LEADERBOARD_MAX_STORED);
      await kv(['SET', LEADERBOARD_KEY, JSON.stringify(current)]);
      var rank = current.indexOf(entry);
      res.status(200).json({ ok: true, rank: rank === -1 ? null : rank + 1, top: current.slice(0, LEADERBOARD_MAX_RETURNED) });
    } catch(e){
      res.status(502).json({ error: 'no se pudo guardar la puntuación' });
    }
    return;
  }

  res.status(405).json({ error: 'method not allowed' });
};
