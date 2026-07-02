// Ejecuta db/schema.sql contra la base de datos apuntada por DATABASE_URL.
// Uso:  npm run migrate      (con DATABASE_URL en el entorno o en .env)
//
// El driver HTTP de Neon ejecuta una sentencia por llamada, asi que
// partimos el fichero por ";" y las lanzamos en orden. El esquema es
// idempotente (IF NOT EXISTS), asi que se puede repetir sin problema.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('ERROR: falta DATABASE_URL. Expórtala o crea un .env con la connection string de Neon.');
  process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(__dirname, '..', 'db', 'schema.sql');
const raw = readFileSync(schemaPath, 'utf8');

// Quita comentarios de línea y parte en sentencias.
const statements = raw
  .split('\n')
  .filter((line) => !line.trim().startsWith('--'))
  .join('\n')
  .split(';')
  .map((s) => s.trim())
  .filter(Boolean);

const sql = neon(url);

console.log(`Aplicando ${statements.length} sentencias desde db/schema.sql ...`);
for (const stmt of statements) {
  const label = stmt.replace(/\s+/g, ' ').slice(0, 60);
  try {
    await sql.query(stmt);
    console.log('  ok  ·', label);
  } catch (e) {
    console.error('  FALLO ·', label, '\n       ', e.message);
    process.exit(1);
  }
}
console.log('Migración completada ✓');
