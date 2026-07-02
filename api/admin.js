// Panel de administracion server-rendered, servido en /admin (via rewrite en vercel.json).
// Login usuario/contrasena (ADMIN_USER + ADMIN_PASSWORD_HASH bcrypt), sesion en cookie
// firmada (httpOnly, Secure). Vistas: Leads (con filtro y cambio de estado) y Conversaciones.

var getSql = require('./_lib/db').getSql;
var auth = require('./_lib/auth');
var esc = require('./_lib/util').escapeHtml;

var ESTADOS = ['nuevo', 'contactado', 'cerrado'];

// --- helpers de respuesta ---
function sendHtml(res, status, html){
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(html);
}
function redirect(res, location){
  res.statusCode = 302;
  res.setHeader('Location', location);
  res.end();
}

var dateFmt = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid'
});
function fmtDate(v){
  try { return dateFmt.format(new Date(v)); } catch(e){ return esc(String(v)); }
}

// --- layout ---
function layout(title, view, bodyHtml){
  var tabs = view === 'login' ? '' :
    '<nav class="tabs">'
    + '<a class="' + (view === 'leads' ? 'on' : '') + '" href="/admin?view=leads">leads</a>'
    + '<a class="' + (view === 'chats' || view === 'chat' ? 'on' : '') + '" href="/admin?view=chats">conversaciones</a>'
    + '<form method="post" action="/admin" class="logout"><input type="hidden" name="action" value="logout"><button type="submit">salir</button></form>'
    + '</nav>';

  return '<!DOCTYPE html><html lang="es"><head>'
    + '<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">'
    + '<meta name="robots" content="noindex, nofollow">'
    + '<title>' + esc(title) + ' — admin Comboi Labs</title>'
    + '<style>'
    + ':root{--bg:#0c0e12;--panel:#14171d;--line:#262b34;--ink:#e6e9ef;--ink2:#9aa3b2;--ink3:#5c6675;--mint:#4fd1a1;--cobalt:#5b8cff;--red:#ff6b5e;--amber:#ffb84d}'
    + '*{box-sizing:border-box}'
    + 'body{margin:0;background:var(--bg);color:var(--ink);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:14px;line-height:1.5}'
    + 'a{color:var(--cobalt);text-decoration:none}a:hover{text-decoration:underline}'
    + '.wrap{max-width:1100px;margin:0 auto;padding:24px 18px 60px}'
    + 'h1{font-size:18px;margin:0 0 4px}.muted{color:var(--ink2)}.dim{color:var(--ink3)}'
    + '.topbar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:18px;border-bottom:1px solid var(--line);padding-bottom:14px}'
    + '.tabs{display:flex;gap:6px;align-items:center;flex-wrap:wrap}'
    + '.tabs a{padding:6px 12px;border:1px solid var(--line);border-radius:8px;color:var(--ink2)}'
    + '.tabs a.on{color:var(--bg);background:var(--mint);border-color:var(--mint);font-weight:700}'
    + '.logout{margin-left:6px}.logout button,.filters a,.btn{cursor:pointer;font:inherit}'
    + '.logout button{background:none;border:1px solid var(--line);border-radius:8px;color:var(--ink3);padding:6px 12px}'
    + '.filters{display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap}'
    + '.filters a{padding:4px 10px;border:1px solid var(--line);border-radius:20px;color:var(--ink2);font-size:12.5px}'
    + '.filters a.on{background:var(--panel);color:var(--ink);border-color:var(--ink3)}'
    + 'table{width:100%;border-collapse:collapse}'
    + 'th,td{text-align:left;padding:10px 10px;border-bottom:1px solid var(--line);vertical-align:top}'
    + 'th{color:var(--ink3);font-weight:400;font-size:12px;text-transform:uppercase;letter-spacing:.04em}'
    + 'td.msg{max-width:360px;white-space:pre-wrap;word-break:break-word;color:var(--ink2)}'
    + '.pill{display:inline-block;padding:2px 8px;border-radius:20px;font-size:11.5px;border:1px solid var(--line)}'
    + '.pill.nuevo{color:var(--mint);border-color:var(--mint)}'
    + '.pill.contactado{color:var(--amber);border-color:var(--amber)}'
    + '.pill.cerrado{color:var(--ink3)}'
    + 'select{background:var(--bg);color:var(--ink);border:1px solid var(--line);border-radius:6px;padding:4px 6px;font:inherit}'
    + '.card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:16px;margin-bottom:20px;max-width:420px}'
    + '.card label{display:block;color:var(--ink2);font-size:12px;margin:10px 0 4px}'
    + '.card input{width:100%;background:var(--bg);color:var(--ink);border:1px solid var(--line);border-radius:8px;padding:9px 11px;font:inherit}'
    + '.btn{background:var(--mint);color:var(--bg);border:none;border-radius:8px;padding:10px 16px;font-weight:700;margin-top:16px}'
    + '.err{color:var(--red);font-size:13px;margin-top:12px}'
    + '.chat-row{display:flex;gap:10px;justify-content:space-between;padding:10px;border:1px solid var(--line);border-radius:8px;margin-bottom:8px}'
    + '.bubble{max-width:75%;padding:9px 12px;border-radius:10px;margin:8px 0;white-space:pre-wrap;word-break:break-word}'
    + '.bubble.user{background:var(--cobalt);color:#fff;margin-left:auto}'
    + '.bubble.assistant{background:var(--panel);border:1px solid var(--line)}'
    + '.empty{color:var(--ink3);padding:30px 0;text-align:center}'
    + '</style></head><body><div class="wrap">'
    + (view === 'login' ? '' : '<div class="topbar"><div><h1>~/comboi/admin</h1><span class="dim">panel interno</span></div>' + tabs + '</div>')
    + bodyHtml
    + '</div></body></html>';
}

// --- vistas ---
function loginView(error){
  return layout('login', 'login',
    '<div class="card"><h1>Acceso admin</h1><p class="muted" style="font-size:12.5px">Panel interno de Comboi Labs.</p>'
    + '<form method="post" action="/admin">'
    + '<input type="hidden" name="action" value="login">'
    + '<label for="u">usuario</label><input id="u" name="user" autocomplete="username" autofocus>'
    + '<label for="p">contraseña</label><input id="p" name="password" type="password" autocomplete="current-password">'
    + (error ? '<div class="err">' + esc(error) + '</div>' : '')
    + '<button class="btn" type="submit">entrar →</button>'
    + '</form></div>');
}

async function leadsView(sql, estado){
  var rows;
  if(estado && ESTADOS.indexOf(estado) !== -1){
    rows = await sql`SELECT * FROM leads WHERE estado = ${estado} ORDER BY created_at DESC LIMIT 500`;
  } else {
    estado = '';
    rows = await sql`SELECT * FROM leads ORDER BY created_at DESC LIMIT 500`;
  }

  var filters = ['', 'nuevo', 'contactado', 'cerrado'].map(function(f){
    var label = f || 'todos';
    var on = (estado === f) ? ' on' : '';
    var href = f ? ('/admin?view=leads&estado=' + f) : '/admin?view=leads';
    return '<a class="' + on.trim() + '" href="' + href + '">' + label + '</a>';
  }).join('');

  var body = '<div class="filters">' + filters + '</div>';

  if(!rows.length){
    return layout('leads', 'leads', body + '<div class="empty">// no hay leads' + (estado ? ' con estado "' + esc(estado) + '"' : '') + '</div>');
  }

  var trs = rows.map(function(r){
    var estadoSel = ESTADOS.map(function(e){
      return '<option value="' + e + '"' + (e === r.estado ? ' selected' : '') + '>' + e + '</option>';
    }).join('');
    var contacto = esc(r.email) + (r.telefono ? '<br><span class="dim">' + esc(r.telefono) + '</span>' : '') + (r.empresa ? '<br><span class="dim">' + esc(r.empresa) + '</span>' : '');
    return '<tr>'
      + '<td class="dim" style="white-space:nowrap">' + fmtDate(r.created_at) + '</td>'
      + '<td>' + esc(r.nombre) + '</td>'
      + '<td>' + contacto + '</td>'
      + '<td class="dim">' + esc(r.pagina_origen || '—') + '</td>'
      + '<td class="msg">' + esc(r.mensaje) + '</td>'
      + '<td><form method="post" action="/admin">'
        + '<input type="hidden" name="action" value="set-estado">'
        + '<input type="hidden" name="lead_id" value="' + r.id + '">'
        + '<input type="hidden" name="back" value="' + esc(estado) + '">'
        + '<select name="estado" onchange="this.form.submit()">' + estadoSel + '</select>'
      + '</form></td>'
      + '</tr>';
  }).join('');

  return layout('leads', 'leads', body
    + '<table><thead><tr><th>fecha</th><th>nombre</th><th>contacto</th><th>página</th><th>mensaje</th><th>estado</th></tr></thead>'
    + '<tbody>' + trs + '</tbody></table>'
    + '<p class="dim" style="margin-top:14px">' + rows.length + ' lead(s)</p>');
}

async function chatsView(sql){
  var rows = await sql`
    SELECT s.id, s.pagina_origen, s.created_at, count(m.id)::int AS n
    FROM chat_sessions s
    LEFT JOIN chat_messages m ON m.session_id = s.id
    GROUP BY s.id
    ORDER BY s.created_at DESC
    LIMIT 300
  `;
  if(!rows.length){
    return layout('conversaciones', 'chats', '<div class="empty">// aún no hay conversaciones</div>');
  }
  var items = rows.map(function(r){
    return '<div class="chat-row">'
      + '<div><a href="/admin?view=chat&id=' + esc(r.id) + '">' + fmtDate(r.created_at) + '</a>'
      + ' <span class="dim">· ' + esc(r.pagina_origen || '—') + '</span></div>'
      + '<div class="muted">' + r.n + ' mensaje(s)</div>'
      + '</div>';
  }).join('');
  return layout('conversaciones', 'chats', items + '<p class="dim" style="margin-top:14px">' + rows.length + ' sesión(es)</p>');
}

async function chatDetailView(sql, id){
  var sessions = await sql`SELECT * FROM chat_sessions WHERE id = ${id}`;
  if(!sessions.length){
    return layout('conversación', 'chat', '<p><a href="/admin?view=chats">← volver</a></p><div class="empty">// sesión no encontrada</div>');
  }
  var s = sessions[0];
  var msgs = await sql`SELECT role, content, created_at FROM chat_messages WHERE session_id = ${id} ORDER BY created_at ASC`;
  var bubbles = msgs.length ? msgs.map(function(m){
    return '<div class="bubble ' + (m.role === 'user' ? 'user' : 'assistant') + '">' + esc(m.content) + '</div>';
  }).join('') : '<div class="empty">// sesión sin mensajes</div>';

  return layout('conversación', 'chat',
    '<p><a href="/admin?view=chats">← volver a conversaciones</a></p>'
    + '<p class="dim">' + fmtDate(s.created_at) + ' · ' + esc(s.pagina_origen || '—') + ' · <span style="user-select:all">' + esc(s.id) + '</span></p>'
    + '<div style="max-width:760px">' + bubbles + '</div>');
}

// --- handler ---
module.exports = async function handler(req, res){
  var body = req.body || {};
  var query = req.query || {};

  // Acciones POST que no requieren mostrar datos primero.
  if(req.method === 'POST'){
    var action = body.action;

    if(action === 'login'){
      if(auth.checkCredentials(body.user, body.password)){
        res.setHeader('Set-Cookie', auth.sessionCookie());
        redirect(res, '/admin?view=leads');
      } else {
        sendHtml(res, 401, loginView('Usuario o contraseña incorrectos.'));
      }
      return;
    }

    if(action === 'logout'){
      res.setHeader('Set-Cookie', auth.clearCookie());
      redirect(res, '/admin');
      return;
    }

    // A partir de aqui hace falta sesion.
    if(!auth.isAuthed(req)){
      sendHtml(res, 401, loginView('Sesión caducada. Vuelve a entrar.'));
      return;
    }

    if(action === 'set-estado'){
      var id = parseInt(body.lead_id, 10);
      var estado = body.estado;
      if(Number.isFinite(id) && ESTADOS.indexOf(estado) !== -1){
        try {
          var sqlU = getSql();
          await sqlU`UPDATE leads SET estado = ${estado} WHERE id = ${id}`;
        } catch(e){
          console.error('admin set-estado error', e.message);
        }
      }
      var back = ESTADOS.indexOf(body.back) !== -1 ? ('&estado=' + body.back) : '';
      redirect(res, '/admin?view=leads' + back);
      return;
    }

    sendHtml(res, 400, layout('error', 'login', '<div class="empty">acción no válida</div>'));
    return;
  }

  // GET: requiere sesion salvo la propia pantalla de login.
  if(!auth.isAuthed(req)){
    sendHtml(res, 200, loginView(''));
    return;
  }

  var view = query.view || 'leads';
  var sql;
  try {
    sql = getSql();
  } catch(e){
    sendHtml(res, 200, layout('sin BD', 'leads', '<div class="empty">// falta DATABASE_URL: configura Neon en Vercel</div>'));
    return;
  }

  try {
    var html;
    if(view === 'chats'){
      html = await chatsView(sql);
    } else if(view === 'chat'){
      html = await chatDetailView(sql, String(query.id || ''));
    } else {
      html = await leadsView(sql, query.estado || '');
    }
    sendHtml(res, 200, html);
  } catch(e){
    console.error('admin render error', e.message);
    sendHtml(res, 500, layout('error', view, '<div class="empty">// error al leer la base de datos</div>'));
  }
};
