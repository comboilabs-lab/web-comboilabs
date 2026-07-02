// Conexion a Neon Postgres via el driver HTTP serverless.
// DATABASE_URL la inyecta Vercel al conectar Neon (Marketplace); en local va en .env.
// No hay credenciales hardcodeadas: todo sale del entorno.

var neon = require('@neondatabase/serverless').neon;

var _sql = null;

// Devuelve la funcion tagged-template `sql` de Neon (perezosa: solo se crea
// cuando algun endpoint la necesita, para no fallar en el arranque si falta la var).
function getSql(){
  if(_sql) return _sql;
  if(!process.env.DATABASE_URL){
    throw new Error('falta DATABASE_URL');
  }
  _sql = neon(process.env.DATABASE_URL);
  return _sql;
}

module.exports = { getSql: getSql };
