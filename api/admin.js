// Panel de administracion server-rendered, servido en /admin (via rewrite en vercel.json).
// Login usuario/contrasena (ADMIN_USER + ADMIN_PASSWORD_HASH bcrypt), sesion en cookie
// firmada (httpOnly, Secure). Vistas: Leads (con filtro y cambio de estado) y Conversaciones.
// Estilo: mismo sistema de diseno que la web publica (assets/styles.css).

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
var CSS = ''
  + ':root{--bg:#F5F4ED;--surface:#FFFFFF;--surface-2:#FAF9F4;--ink:#221F1C;--ink-2:#6E6860;--ink-3:#A9A299;'
  + '--accent:#D97757;--accent-deep:#B35A3D;--accent-soft:#F4E3DA;--line:#E8E2D6;--ok:#3D8A5F;--ok-soft:#E2F0E7;'
  + '--warn:#B07C1F;--warn-soft:#F6ECD4;--radius:14px}'
  + '*{margin:0;padding:0;box-sizing:border-box}'
  + 'body{background:var(--bg);color:var(--ink);font-family:"Archivo",sans-serif;font-size:14.5px;line-height:1.55;-webkit-font-smoothing:antialiased}'
  + '.mono{font-family:"Space Mono",monospace}'
  + 'a{color:var(--accent-deep);text-decoration:none}a:hover{text-decoration:underline}'
  + '.wrap{max-width:1180px;margin:0 auto;padding:0 24px}'

  // header
  + 'header{background:var(--surface);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:10}'
  + '.bar{display:flex;align-items:center;justify-content:space-between;gap:16px;height:62px;flex-wrap:wrap}'
  + '.brand{display:flex;align-items:baseline;gap:10px;font-weight:700;font-size:17px;letter-spacing:.3px;white-space:nowrap}'
  + '.brand em{font-style:normal;color:var(--accent)}'
  + '.brand .sub{font-family:"Space Mono",monospace;font-weight:400;font-size:11px;color:var(--ink-3);letter-spacing:.06em;text-transform:uppercase}'
  + '.nav{display:flex;align-items:center;gap:8px}'
  + '.nav a{padding:7px 14px;border-radius:8px;color:var(--ink-2);font-weight:600;font-size:13.5px}'
  + '.nav a:hover{background:var(--surface-2);text-decoration:none;color:var(--ink)}'
  + '.nav a.on{background:var(--ink);color:var(--surface)}'
  + '.logout button{cursor:pointer;font:inherit;font-weight:600;font-size:13px;color:var(--ink-2);background:none;'
  + 'border:1.5px solid var(--line);border-radius:8px;padding:6px 13px}'
  + '.logout button:hover{border-color:var(--ink-3);color:var(--ink)}'

  + 'main{padding:28px 0 70px}'
  + '.pagehead{display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:18px}'
  + 'h1{font-size:22px;font-weight:700;letter-spacing:-.01em}'
  + '.count{color:var(--ink-3);font-size:13px}'

  // tarjetas de resumen
  + '.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:22px}'
  + '.stat{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:14px 16px}'
  + '.stat .k{font-family:"Space Mono",monospace;font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--ink-3)}'
  + '.stat .v{font-size:26px;font-weight:700;margin-top:2px;letter-spacing:-.02em}'
  + '.stat.hl .v{color:var(--accent-deep)}'

  // filtros
  + '.filters{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap}'
  + '.filters a{padding:6px 14px;border:1.5px solid var(--line);border-radius:20px;color:var(--ink-2);font-size:13px;font-weight:600;background:var(--surface)}'
  + '.filters a:hover{text-decoration:none;border-color:var(--ink-3);color:var(--ink)}'
  + '.filters a.on{background:var(--ink);color:var(--surface);border-color:var(--ink)}'

  // tabla en tarjeta
  + '.tablecard{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);overflow:auto;box-shadow:0 1px 3px rgba(34,31,28,.04)}'
  + 'table{width:100%;border-collapse:collapse;min-width:820px}'
  + 'th,td{text-align:left;padding:12px 14px;border-bottom:1px solid var(--line);vertical-align:top}'
  + 'tbody tr:last-child td{border-bottom:none}'
  + 'tbody tr:hover{background:var(--surface-2)}'
  + 'th{font-family:"Space Mono",monospace;color:var(--ink-3);font-weight:400;font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;background:var(--surface-2)}'
  + 'td.msg{max-width:380px;white-space:pre-wrap;word-break:break-word;color:var(--ink-2);font-size:13.5px}'
  + 'td .name{font-weight:600}'
  + '.dim{color:var(--ink-3);font-size:13px}.muted{color:var(--ink-2)}'

  // pills de estado
  + '.pill{display:inline-block;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600}'
  + '.pill.nuevo{background:var(--accent-soft);color:var(--accent-deep)}'
  + '.pill.contactado{background:var(--warn-soft);color:var(--warn)}'
  + '.pill.cerrado{background:var(--surface-2);color:var(--ink-3);border:1px solid var(--line)}'
  + 'select{background:var(--surface);color:var(--ink);border:1.5px solid var(--line);border-radius:8px;padding:6px 8px;font:inherit;font-size:13px;cursor:pointer}'
  + 'select:hover{border-color:var(--ink-3)}'
  + 'select:focus-visible{outline:2px solid var(--accent);outline-offset:1px}'

  // login
  + '.login-shell{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}'
  + '.card{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:30px 28px;width:100%;max-width:380px;box-shadow:0 12px 40px rgba(34,31,28,.08)}'
  + '.card .brand{margin-bottom:6px;font-size:19px}'
  + '.card h1{font-size:15px;font-weight:600;color:var(--ink-2);margin-bottom:14px}'
  + '.card label{display:block;color:var(--ink-2);font-size:12.5px;font-weight:600;margin:14px 0 5px}'
  + '.card input{width:100%;background:var(--bg);color:var(--ink);border:1.5px solid var(--line);border-radius:9px;padding:10px 12px;font:inherit}'
  + '.card input:focus-visible{outline:2px solid var(--accent);outline-offset:1px;border-color:var(--accent)}'
  + '.btn{cursor:pointer;font:inherit;width:100%;background:var(--accent);color:#fff;border:none;border-radius:9px;'
  + 'padding:11px 16px;font-weight:700;margin-top:20px;font-size:14.5px}'
  + '.btn:hover{background:var(--accent-deep)}'
  + '.err{background:#FBEAE7;color:#A33D2A;border-radius:8px;padding:9px 12px;font-size:13px;margin-top:14px}'

  // conversaciones
  + '.chat-list{display:flex;flex-direction:column;gap:10px}'
  + '.chat-row{display:flex;gap:12px;justify-content:space-between;align-items:center;padding:14px 16px;'
  + 'background:var(--surface);border:1px solid var(--line);border-radius:var(--radius)}'
  + '.chat-row:hover{border-color:var(--ink-3)}'
  + '.chat-row a{font-weight:600;color:var(--ink)}'
  + '.badge{font-family:"Space Mono",monospace;font-size:11.5px;color:var(--ink-2);background:var(--surface-2);'
  + 'border:1px solid var(--line);border-radius:20px;padding:3px 10px;white-space:nowrap}'
  + '.back{display:inline-block;margin-bottom:14px;font-weight:600}'
  + '.thread{max-width:760px;display:flex;flex-direction:column}'
  + '.bubble{max-width:80%;padding:10px 14px;border-radius:14px;margin:5px 0;white-space:pre-wrap;word-break:break-word;font-size:13.5px}'
  + '.bubble.user{background:var(--accent);color:#fff;margin-left:auto;border-bottom-right-radius:4px}'
  + '.bubble.assistant{background:var(--surface);border:1px solid var(--line);border-bottom-left-radius:4px}'

  + '.empty{color:var(--ink-3);padding:56px 20px;text-align:center;background:var(--surface);border:1px dashed var(--line);border-radius:var(--radius)}'
  + '@media (max-width:640px){.bar{height:auto;padding:10px 0}main{padding-top:18px}}';

function head(title){
  return '<!DOCTYPE html><html lang="es"><head>'
    + '<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">'
    + '<meta name="robots" content="noindex, nofollow">'
    + '<title>' + esc(title) + ' — Admin · Comboi Labs</title>'
    + '<link rel="icon" href="/favicon.ico" sizes="any">'
    + '<link rel="preconnect" href="https://fonts.googleapis.com">'
    + '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
    + '<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">'
    + '<style>' + CSS + '</style></head>';
}

function brandHtml(){
  return '<div class="brand">Comboi <em>Labs</em> <span class="sub">admin</span></div>';
}

function layout(title, view, bodyHtml){
  if(view === 'login'){
    return head(title) + '<body><div class="login-shell">' + bodyHtml + '</div></body></html>';
  }
  var nav = '<div class="nav">'
    + '<a class="' + (view === 'leads' ? 'on' : '') + '" href="/admin?view=leads">Leads</a>'
    + '<a class="' + (view === 'chats' || view === 'chat' ? 'on' : '') + '" href="/admin?view=chats">Conversaciones</a>'
    + '<form method="post" action="/admin" class="logout"><input type="hidden" name="action" value="logout"><button type="submit">Salir</button></form>'
    + '</div>';
  return head(title)
    + '<body><header><div class="wrap bar">' + brandHtml() + nav + '</div></header>'
    + '<main><div class="wrap">' + bodyHtml + '</div></main></body></html>';
}

// --- vistas ---
function loginView(error){
  return layout('Acceso', 'login',
    '<div class="card">' + brandHtml() + '<h1>Accede al panel interno</h1>'
    + '<form method="post" action="/admin">'
    + '<input type="hidden" name="action" value="login">'
    + '<label for="u">Usuario</label><input id="u" name="user" autocomplete="username" autofocus>'
    + '<label for="p">Contraseña</label><input id="p" name="password" type="password" autocomplete="current-password">'
    + (error ? '<div class="err">' + esc(error) + '</div>' : '')
    + '<button class="btn" type="submit">Entrar</button>'
    + '</form></div>');
}

async function leadsView(sql, estado){
  var rows, counts;
  if(estado && ESTADOS.indexOf(estado) !== -1){
    rows = await sql`SELECT * FROM leads WHERE estado = ${estado} ORDER BY created_at DESC LIMIT 500`;
  } else {
    estado = '';
    rows = await sql`SELECT * FROM leads ORDER BY created_at DESC LIMIT 500`;
  }
  counts = await sql`SELECT estado, count(*)::int AS n FROM leads GROUP BY estado`;

  var byEstado = { nuevo: 0, contactado: 0, cerrado: 0 };
  var total = 0;
  counts.forEach(function(c){ byEstado[c.estado] = c.n; total += c.n; });

  var stats = '<div class="stats">'
    + '<div class="stat"><div class="k">Total</div><div class="v">' + total + '</div></div>'
    + '<div class="stat hl"><div class="k">Nuevos</div><div class="v">' + byEstado.nuevo + '</div></div>'
    + '<div class="stat"><div class="k">Contactados</div><div class="v">' + byEstado.contactado + '</div></div>'
    + '<div class="stat"><div class="k">Cerrados</div><div class="v">' + byEstado.cerrado + '</div></div>'
    + '</div>';

  var filters = ['', 'nuevo', 'contactado', 'cerrado'].map(function(f){
    var label = f ? (f.charAt(0).toUpperCase() + f.slice(1) + 's') : 'Todos';
    var on = (estado === f) ? ' class="on"' : '';
    var href = f ? ('/admin?view=leads&estado=' + f) : '/admin?view=leads';
    return '<a' + on + ' href="' + href + '">' + label + '</a>';
  }).join('');

  var body = '<div class="pagehead"><h1>Leads</h1>'
    + '<span class="count">' + rows.length + (estado ? ' con estado "' + esc(estado) + '"' : ' en total') + '</span></div>'
    + stats
    + '<div class="filters">' + filters + '</div>';

  if(!rows.length){
    return layout('Leads', 'leads', body + '<div class="empty">No hay leads' + (estado ? ' con estado "' + esc(estado) + '"' : ' todavía') + '.</div>');
  }

  var trs = rows.map(function(r){
    var estadoSel = ESTADOS.map(function(e){
      return '<option value="' + e + '"' + (e === r.estado ? ' selected' : '') + '>' + e + '</option>';
    }).join('');
    var contacto = '<a href="mailto:' + esc(r.email) + '">' + esc(r.email) + '</a>'
      + (r.telefono ? '<br><span class="dim">' + esc(r.telefono) + '</span>' : '')
      + (r.empresa ? '<br><span class="dim">' + esc(r.empresa) + '</span>' : '');
    return '<tr>'
      + '<td class="dim" style="white-space:nowrap">' + fmtDate(r.created_at) + '</td>'
      + '<td><span class="name">' + esc(r.nombre) + '</span></td>'
      + '<td>' + contacto + '</td>'
      + '<td class="dim">' + esc(r.pagina_origen || '—') + '</td>'
      + '<td class="msg">' + esc(r.mensaje) + '</td>'
      + '<td><span class="pill ' + esc(r.estado) + '">' + esc(r.estado) + '</span></td>'
      + '<td><form method="post" action="/admin">'
        + '<input type="hidden" name="action" value="set-estado">'
        + '<input type="hidden" name="lead_id" value="' + r.id + '">'
        + '<input type="hidden" name="back" value="' + esc(estado) + '">'
        + '<select name="estado" onchange="this.form.submit()">' + estadoSel + '</select>'
      + '</form></td>'
      + '</tr>';
  }).join('');

  return layout('Leads', 'leads', body
    + '<div class="tablecard"><table><thead><tr>'
    + '<th>Fecha</th><th>Nombre</th><th>Contacto</th><th>Página</th><th>Mensaje</th><th>Estado</th><th>Cambiar</th>'
    + '</tr></thead><tbody>' + trs + '</tbody></table></div>');
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
  var body = '<div class="pagehead"><h1>Conversaciones</h1>'
    + '<span class="count">' + rows.length + ' sesión(es)</span></div>';
  if(!rows.length){
    return layout('Conversaciones', 'chats', body + '<div class="empty">Aún no hay conversaciones del chat.</div>');
  }
  var items = rows.map(function(r){
    return '<div class="chat-row">'
      + '<div><a href="/admin?view=chat&id=' + esc(r.id) + '">' + fmtDate(r.created_at) + '</a>'
      + ' <span class="dim">· ' + esc(r.pagina_origen || '—') + '</span></div>'
      + '<span class="badge">' + r.n + ' mensaje(s)</span>'
      + '</div>';
  }).join('');
  return layout('Conversaciones', 'chats', body + '<div class="chat-list">' + items + '</div>');
}

async function chatDetailView(sql, id){
  var sessions = await sql`SELECT * FROM chat_sessions WHERE id = ${id}`;
  if(!sessions.length){
    return layout('Conversación', 'chat',
      '<a class="back" href="/admin?view=chats">← Volver a conversaciones</a>'
      + '<div class="empty">Sesión no encontrada.</div>');
  }
  var s = sessions[0];
  var msgs = await sql`SELECT role, content, created_at FROM chat_messages WHERE session_id = ${id} ORDER BY created_at ASC`;
  var bubbles = msgs.length ? msgs.map(function(m){
    return '<div class="bubble ' + (m.role === 'user' ? 'user' : 'assistant') + '">' + esc(m.content) + '</div>';
  }).join('') : '<div class="empty">Sesión sin mensajes.</div>';

  return layout('Conversación', 'chat',
    '<a class="back" href="/admin?view=chats">← Volver a conversaciones</a>'
    + '<div class="pagehead"><h1>Conversación</h1>'
    + '<span class="count">' + fmtDate(s.created_at) + ' · ' + esc(s.pagina_origen || '—') + ' · <span class="mono" style="user-select:all">' + esc(s.id) + '</span></span></div>'
    + '<div class="thread">' + bubbles + '</div>');
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

    sendHtml(res, 400, layout('Error', 'leads', '<div class="empty">Acción no válida.</div>'));
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
    sendHtml(res, 200, layout('Sin BD', 'leads', '<div class="empty">Falta DATABASE_URL: configura Neon en Vercel.</div>'));
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
    sendHtml(res, 500, layout('Error', view, '<div class="empty">Error al leer la base de datos.</div>'));
  }
};
