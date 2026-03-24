import jwt, { SignOptions } from 'jsonwebtoken';

const ONE_WEEK = 86400 * 7;
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_key';

export function generateToken(payload: object): string {
  const options: SignOptions = { expiresIn: ONE_WEEK };
  return jwt.sign(payload, JWT_SECRET, options);
}

export function verifyToken<T = any>(token: string): T | null {
  try {
    return jwt.verify(token, JWT_SECRET) as T;
  } catch (error) {
    return null;
  }
}

export function decodeToken<T = any>(token: string): T | null {
  try {
    return jwt.decode(token) as T;
  } catch {
    return null;
  }
}
