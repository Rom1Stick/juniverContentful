#!/usr/bin/env node
// Génère un hash bcrypt pour le mot de passe admin.
// Usage : node scripts/hash-password.js "mon-mot-de-passe"
// Coller le hash dans la variable d'env ADMIN_PASSWORD_HASH (.env local ou Netlify env).

import bcrypt from 'bcryptjs';

const pwd = process.argv[2];

if (!pwd) {
  console.error('Usage : node scripts/hash-password.js "<mot-de-passe>"');
  process.exit(1);
}

if (pwd.length < 8) {
  console.error('Mot de passe trop court (minimum 8 caractères).');
  process.exit(1);
}

const salt = bcrypt.genSaltSync(12);
const hash = bcrypt.hashSync(pwd, salt);

console.log('\nHash bcrypt généré pour le mot de passe fourni :\n');
console.log(hash);
console.log("\nColler cette valeur dans .env (local) et dans les variables d'env Netlify :");
console.log(`ADMIN_PASSWORD_HASH=${hash}\n`);
