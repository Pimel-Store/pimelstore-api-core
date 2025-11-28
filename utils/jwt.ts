import jwt, { SignOptions  } from 'jsonwebtoken';

// Tempo de expiração padrão
const ONE_MINUTE = 60;
const ONE_HOUR = 3600;
const ONE_DAY = 86400;
const SEVEN_DAYS = 7 * 86400; 
const THIRTY_DAYS = 30 * 86400; 

// Chave secreta — ideal pegar do .env
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_key';
type JWTPossibleExpiresIn = number;

/**
 * Gera um token JWT
 * @param payload - Dados que irão dentro do token
 * @param expiresIn - Tempo de expiração (ex: '1h', '7d')
 * @returns token JWT assinado
 */
export function generateToken(payload: object): string {
  const options: SignOptions = { expiresIn: ONE_DAY };
  return jwt.sign(payload, JWT_SECRET, options);
}

/**
 * Verifica e decodifica um token JWT
 * @param token - token JWT recebido
 * @returns payload decodificado se for válido
 */
export function verifyToken<T = any>(token: string): T | null {
  try {
    return jwt.verify(token, JWT_SECRET) as T;
  } catch (error) {
    return null;
  }
}

/**
 * Decodifica o token sem verificar assinatura (⚠️ use com cuidado)
 * @param token - token JWT
 * @returns payload decodificado ou null
 */
export function decodeToken<T = any>(token: string): T | null {
  try {
    return jwt.decode(token) as T;
  } catch {
    return null;
  }
}
