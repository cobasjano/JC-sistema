const crypto = require('crypto');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

console.log('Hashes SHA256 para las nuevas contraseñas:\n');
console.log('adm (adm123):', hashPassword('adm123'));
console.log('1@1 (1):', hashPassword('1'));

