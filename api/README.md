# Backend (Vercel Serverless Functions)

Todo lo que necesita guardar un secreto o hablar con otro servicio vive aquí, nunca en el navegador. Al estar en `api/` dentro del mismo proyecto, Vercel las despliega solas junto con la web estática: no hay URL que configurar, todo se llama por ruta relativa (`/api/chat`, `/api/scores`, `/api/lead`).

`api/_lib/` no son endpoints (Vercel ignora lo que empieza por `_`): es código compartido entre funciones.

## `chat.js` — agente de IA (chat flotante + demo del bento)

Necesita una variable de entorno en el proyecto de Vercel:

- `ANTHROPIC_API_KEY` — tu API key de Anthropic.

Se configura en **Vercel → tu proyecto → Settings → Environment Variables**. Sin ella, el chat responde con un error de conexión (no rompe la web).

Cuando un visitante muestra intención real de contratar y da su nombre + contacto, el modelo usa la herramienta `capture_lead`, que dispara el mismo aviso por email que el formulario de contacto (ver más abajo).

## `lead.js` — avisos de lead nuevo (formulario de contacto + chat)

Envía un email al equipo (vía [Resend](https://resend.com)) cada vez que alguien rellena el formulario de `contacto.html` o el chat detecta un lead. Pasos, una sola vez:

1. Crea una cuenta en [resend.com](https://resend.com), idealmente con el email `hola@comboilabs.com` (así no hace falta verificar dominio para recibir tus propios avisos).
2. **API Keys → Create API Key** → cópiala.
3. En Vercel → Settings → Environment Variables, añade:
   - `RESEND_API_KEY` — la key de Resend.
   - `LEAD_NOTIFY_TO` (opcional) — a qué email llegan los avisos. Por defecto `hola@comboilabs.com`.
   - `LEAD_FROM` (opcional) — remitente. Por defecto `Comboi Labs <onboarding@resend.dev>`, que funciona sin verificar dominio mientras el destinatario sea el email de tu cuenta de Resend.
4. Redeploy.

Para que el remitente sea `algo@comboilabs.com` en vez de `onboarding@resend.dev`, verifica el dominio en Resend (Domains → Add Domain, añadiendo los registros DNS que te indique) y cambia `LEAD_FROM`.

Sin `RESEND_API_KEY`, el formulario y el chat siguen funcionando pero el aviso por email falla en silencio (queda en los logs de Vercel) — no rompe la web.

## `scores.js` — ranking global del Debug Runner (mini-juego de la home)

Guarda las puntuaciones en **Vercel KV** (un Redis gestionado). Pasos, una sola vez:

1. En el dashboard de Vercel: **Storage → Create Database → KV**.
2. Conéctalo a este proyecto (botón "Connect Project"). Vercel inyecta automáticamente `KV_REST_API_URL` y `KV_REST_API_TOKEN` como variables de entorno: no hay que copiar nada a mano.
3. Vuelve a desplegar (un nuevo push a `main` ya lo dispara si el repo está conectado a Vercel).

Sin el KV conectado, el botón "🏆 ranking" y el aviso de guardar puntuación siguen ahí, pero fallan con un mensaje de error en vez de romper el juego.

## Probar en local

Estas funciones no las sirve el servidor estático de desarrollo (`python -m http.server`, etc.) porque no son archivos, son código que ejecuta Vercel. Para probarlas en local:

```
npm install -g vercel
vercel dev
```

`vercel dev` levanta la web y las funciones de `api/` juntas en `http://localhost:3000`, usando las variables de entorno que tengas en tu cuenta de Vercel (te las pedirá la primera vez con `vercel env pull`).
