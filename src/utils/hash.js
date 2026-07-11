import bcrypt from 'bcryptjs';

// Custo do bcrypt. 10 é um bom equilíbrio entre segurança e latência para o MVP.
const SALT_ROUNDS = 10;

/** Gera o hash de uma senha em claro. */
export async function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/** Compara uma senha em claro com um hash. Retorna false se o hash for nulo. */
export async function verifyPassword(plain, hash) {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}
