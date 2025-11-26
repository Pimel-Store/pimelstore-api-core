import bcrypt from 'bcrypt';

// Número de rounds para gerar o salt
const SALT_ROUNDS = 10;

/**
 * Gera um hash seguro para a senha
 * @param password - senha em texto plano
 * @returns hash da senha
 */
export async function hashPassword(password: string): Promise<string> {
  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  return hash;
}

/**
 * Compara a senha em texto plano com o hash armazenado
 * @param password - senha em texto plano
 * @param hash - hash armazenado
 * @returns true se a senha estiver correta
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}
