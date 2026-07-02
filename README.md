# Web Comboi Labs

Web corporativa de Comboi Labs. **Sitio estático** (HTML + CSS + JS en la raíz) servido por
Vercel, con un **backend ligero de funciones serverless** en [`api/`](api/) para lo que necesita
secretos o base de datos:

- **Formulario de contacto** → guarda el lead en Postgres (Neon) y avisa por Telegram.
- **Chat / agente de IA** → conversa con Anthropic y registra la conversación en la BD.
- **Panel `/admin`** → ver leads y conversaciones, cambiar el estado de cada lead.

Las páginas públicas siguen siendo 100% estáticas (se sirven tal cual, sin build). Solo
`/api/*` y `/admin` se ejecutan en el servidor. No hay framework ni paso de compilación:
`package.json` solo existe para instalar las dependencias que usan las funciones.

---

## 1. Base de datos (Neon Postgres)

1. En **Vercel → tu proyecto → Storage → Marketplace → Neon** crea la base de datos y conéctala
   al proyecto. Vercel inyecta automáticamente la variable **`DATABASE_URL`** (no hay que copiar
   nada a mano en producción).
2. Aplica el esquema (crea las tablas `leads`, `chat_sessions`, `chat_messages`). Dos opciones:

   **a) Con el script incluido** (necesita `DATABASE_URL` en tu entorno o en un `.env`):
   ```bash
   npm install
   npm run migrate
   ```

   **b) A mano:** copia el contenido de [`db/schema.sql`](db/schema.sql) y pégalo en el
   **SQL Editor** de Neon.

El esquema es idempotente (`CREATE TABLE IF NOT EXISTS`): puedes ejecutarlo varias veces sin romper nada.

### Tablas

| Tabla | Campos |
|---|---|
| `leads` | `id`, `nombre`, `email`, `telefono?`, `empresa?`, `mensaje`, `pagina_origen`, `estado` (`nuevo`\|`contactado`\|`cerrado`, def. `nuevo`), `created_at` |
| `chat_sessions` | `id` (uuid), `pagina_origen`, `created_at` |
| `chat_messages` | `id`, `session_id` (FK→`chat_sessions`, ON DELETE CASCADE), `role` (`user`\|`assistant`), `content`, `created_at` |

---

## 2. Variables de entorno

Se configuran en **Vercel → Settings → Environment Variables**. Para desarrollo local, copia
[`.env.example`](.env.example) a `.env` y rellénalas.

| Variable | Para qué | Cómo obtenerla |
|---|---|---|
| `DATABASE_URL` | Conexión a Neon Postgres | La inyecta Vercel al conectar Neon. En local, cópiala del dashboard de Neon |
| `TELEGRAM_BOT_TOKEN` | Avisos de leads por Telegram | Crea un bot con [@BotFather](https://t.me/BotFather) |
| `TELEGRAM_CHAT_ID` | A qué chat llegan los avisos | Escribe a tu bot y mira `chat.id` en `https://api.telegram.org/bot<TOKEN>/getUpdates` |
| `ANTHROPIC_API_KEY` | Chat / agente de IA | [console.anthropic.com](https://console.anthropic.com) |
| `ADMIN_USER` | Usuario del panel `/admin` | El que elijas |
| `ADMIN_PASSWORD_HASH` | Contraseña del panel (hash bcrypt) | `npm run hash-password -- "tuClave"` |
| `ADMIN_SESSION_SECRET` | Firma la cookie de sesión del admin | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

> Degradación elegante: si falta Telegram, el lead **se guarda igual** (el aviso falla en silencio,
> queda en los logs). Si falta `ANTHROPIC_API_KEY`, el chat responde con un error de conexión pero
> no rompe la web. Si falta `DATABASE_URL`, el formulario y el chat devuelven error controlado.

---

## 3. Panel de administración `/admin`

- Login usuario/contraseña contra `ADMIN_USER` + `ADMIN_PASSWORD_HASH` (bcrypt). Sesión en cookie
  firmada (`HttpOnly`, `Secure`, `SameSite=Lax`, 8 h).
- **Leads:** tabla por fecha desc, filtro por estado, cambio de estado inline, muestra `pagina_origen`.
- **Conversaciones:** lista de sesiones con fecha y nº de mensajes; clic → conversación completa.
- Marcado `noindex` y bloqueado en `robots.txt`; no aparece en el sitemap.

Genera la contraseña:
```bash
npm run hash-password -- "MiContraseñaSegura"
# copia el hash resultante en ADMIN_PASSWORD_HASH
```

---

## 4. Desarrollo local

Las funciones de `api/` no las sirve un servidor estático normal. Para probarlas en local:

```bash
npm install
npm install -g vercel   # una vez
vercel dev              # levanta web + funciones en http://localhost:3000
```

`vercel dev` usa las variables de entorno del proyecto (`vercel env pull` para traerlas a `.env`).

---

## 5. Endpoints

| Método | Ruta | Qué hace |
|---|---|---|
| POST | `/api/lead` | Recibe el formulario de contacto: valida, honeypot, rate-limit, guarda lead, avisa por Telegram |
| POST | `/api/chat/session` | Crea una sesión de chat, devuelve `session_id` |
| POST | `/api/chat/message` | `{session_id, message}`: guarda el mensaje, responde con la IA (máx. 20 msg/sesión) |
| GET/POST | `/api/scores` | Ranking del mini-juego (Vercel KV) — preexistente |

Detalles de cada función en [`api/README.md`](api/README.md).
