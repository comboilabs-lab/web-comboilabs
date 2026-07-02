# Backend (Vercel Serverless Functions)

Todo lo que necesita un secreto, la base de datos o hablar con otro servicio vive aquí, nunca en el navegador. Al estar en `api/` dentro del mismo proyecto, Vercel las despliega solas junto con la web estática: no hay URL que configurar, todo se llama por ruta relativa.

`api/_lib/` no son endpoints (Vercel ignora lo que empieza por `_`): es código compartido entre funciones (`db.js` conexión a Neon, `telegram.js` avisos, `ai.js` agente, `auth.js` sesión admin, `util.js` utilidades).

> La configuración completa (Neon, variables de entorno, migración, admin) está en el
> [README raíz](../README.md). Aquí solo el detalle de cada función.

## `lead.js` — formulario de contacto (`POST /api/lead`)

Recibe `{ nombre|name, email, empresa?, telefono?, mensaje, pagina_origen?, consent, website }`.

1. **Honeypot** (`website`): si viene relleno, responde `200` sin guardar ni avisar.
2. **Consentimiento RGPD** obligatorio (`consent`).
3. **Rate limiting** en memoria por IP (5 envíos / 10 min por instancia).
4. **Validación**: email válido, mensaje no vacío, longitudes máximas.
5. **Guarda el lead** en la tabla `leads` (Neon). Si esto falla, devuelve error.
6. **Avisa por Telegram** (best-effort): si falla, el lead ya está guardado (no bloquea).

Variables: `DATABASE_URL`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.

## `chat/session.js` — crea sesión de chat (`POST /api/chat/session`)

Inserta una fila en `chat_sessions` y devuelve `{ session_id }` (uuid). Acepta `pagina_origen`.

## `chat/message.js` — mensaje del chat (`POST /api/chat/message`)

Recibe `{ session_id, message }`. Guarda el mensaje del usuario, genera la respuesta del agente con
Anthropic (`ai.js`), la guarda como mensaje `assistant` y la devuelve. El historial vive en la BD.

- **Límite: máx. 20 mensajes por sesión.** Al alcanzarlo, responde con un texto de cortesía sin llamar a la IA.
- Cuando el visitante muestra intención real de contratar y da nombre + contacto, el modelo usa la
  herramienta `capture_lead`: se registra un lead (`origen = chat`) y se avisa por Telegram.

Variables: `DATABASE_URL`, `ANTHROPIC_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.

> **Enchufar otro modelo / cambiar el prompt:** toda la lógica de IA está aislada en
> [`_lib/ai.js`](_lib/ai.js) (`SYSTEM_PROMPT`, `TOOLS`, `generateReply`). El endpoint no sabe nada
> de Anthropic; solo llama a `generateReply(history, onCaptureLead)`.

## `admin.js` — panel interno (`/admin`)

Server-rendered. Login contra `ADMIN_USER` + `ADMIN_PASSWORD_HASH` (bcrypt), sesión en cookie firmada
con `ADMIN_SESSION_SECRET`. Vistas de leads (filtro + cambio de estado) y conversaciones. Servido en
`/admin` mediante un rewrite en `vercel.json`.

Variables: `DATABASE_URL`, `ADMIN_USER`, `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET`.

## `scores.js` — ranking del Debug Runner (`/api/scores`)

Preexistente. Guarda las puntuaciones del mini-juego en **Vercel KV**. Al conectar un KV al proyecto,
Vercel inyecta `KV_REST_API_URL` y `KV_REST_API_TOKEN`. Sin KV, el juego sigue pero el ranking falla
con un mensaje de error.

## Probar en local

```
npm install
npm install -g vercel
vercel dev
```

Levanta la web y las funciones juntas en `http://localhost:3000` usando tus variables de entorno.
