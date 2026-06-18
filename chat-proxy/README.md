# Proxy del chat de Comboi Labs

Backend mínimo (Cloudflare Worker) para que la web pueda usar la API de Claude sin exponer la API key en el navegador. El chat flotante y el demo del bento llaman a este proxy; el proxy es el único que habla con `api.anthropic.com`.

## Desplegar

1. `npm install -g wrangler`
2. `wrangler login`
3. Desde esta carpeta (`chat-proxy/`):
   ```
   wrangler secret put ANTHROPIC_API_KEY
   ```
   Pega tu API key real de Anthropic cuando te la pida (no se guarda en el código ni en git).
4. `wrangler deploy`
5. Wrangler te dará una URL del tipo `https://comboi-chat-proxy.<tu-cuenta>.workers.dev`. Cópiala y pégala en [assets/app.js](../assets/app.js), en la constante `CHAT_API_ENDPOINT` (al principio del archivo).

## Dominios permitidos

El Worker solo acepta peticiones desde los orígenes listados en `ALLOWED_ORIGINS` dentro de `worker.js` (por defecto `comboilabs.com`, `www.comboilabs.com` y `localhost:8731` para desarrollo). Actualiza esa lista si cambias de dominio.

## Coste

El plan gratuito de Cloudflare Workers incluye 100.000 peticiones/día, de sobra para el chat de una web corporativa. El coste real vendrá del consumo de la API de Anthropic, no del Worker.
