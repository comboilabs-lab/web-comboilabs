// Genera el hash bcrypt para ADMIN_PASSWORD_HASH.
// Uso:  npm run hash-password -- "tuContrasenaSegura"

import bcrypt from 'bcryptjs';

const password = process.argv[2];
if (!password) {
  console.error('Uso: npm run hash-password -- "tuContrasena"');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
console.log(hash);
