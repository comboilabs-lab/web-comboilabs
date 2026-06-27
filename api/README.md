# Backend (Vercel Serverless Functions)

Todo lo que necesita guardar un secreto o hablar con otro servicio vive aquí, nunca en el navegador. Al estar en `api/` dentro del mismo proyecto, Vercel las despliega solas junto con la web estática: no hay URL que configurar, todo se llama por ruta relativa (`/api/chat`, `/api/scores`).

## `chat.js` — agente de IA (chat flotante + demo del bento)

Necesita una variable de entorno en el proyecto de Vercel:

- `ANTHROPIC_API_KEY` — tu API key de Anthropic.

Se configura en **Vercel → tu proyecto → Settings → Environment Variables**. Sin ella, el chat responde con un error de conexión (no rompe la web).

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
