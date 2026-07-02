-- ------------------------------------------------------------------
-- Esquema de la base de datos de Comboi Labs (Neon Postgres)
-- Idempotente: se puede ejecutar varias veces sin romper nada.
-- Ejecutar con:  npm run migrate     (usa DATABASE_URL)
-- o pegando este archivo en el SQL Editor de Neon.
-- ------------------------------------------------------------------

-- gen_random_uuid() es nativo en Postgres 13+ (Neon lo es), pero
-- aseguramos la extension por si el proyecto se mueve a otra instancia.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- --- Leads (formulario de contacto + chat) ---
CREATE TABLE IF NOT EXISTS leads (
  id            BIGSERIAL PRIMARY KEY,
  nombre        TEXT NOT NULL,
  email         TEXT NOT NULL,
  telefono      TEXT,
  empresa       TEXT,
  mensaje       TEXT NOT NULL,
  pagina_origen TEXT,
  estado        TEXT NOT NULL DEFAULT 'nuevo'
                CHECK (estado IN ('nuevo', 'contactado', 'cerrado')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads (created_at DESC);
CREATE INDEX IF NOT EXISTS leads_estado_idx     ON leads (estado);

-- --- Sesiones de chat ---
CREATE TABLE IF NOT EXISTS chat_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pagina_origen TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_sessions_created_at_idx ON chat_sessions (created_at DESC);

-- --- Mensajes de chat ---
CREATE TABLE IF NOT EXISTS chat_messages (
  id         BIGSERIAL PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_messages_session_idx ON chat_messages (session_id, created_at);
