import type { VercelRequest } from '@vercel/node';
import { verifyToken } from './jwt';


export default async function securityRules(request: VercelRequest): Promise<{message: string, valid: boolean, statusCode?: number, data?: any}> {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader) {return { message: 'No authorization header provided', valid: false, statusCode: 401 };}

    const token = authHeader.split(' ')[1];
    if (!token) {return { message: 'No token provided', valid: false, statusCode: 401 };}

    const tokenValidation = await verifyToken(token);
    if (!tokenValidation) {return { message: 'Invalid or expired token', valid: false, statusCode: 401 };}
    
    return { message: 'Token is valid', valid: true, statusCode: 200, data: { token: token, tokenData: tokenValidation } };
  } catch (error) {
    throw new Error(`Error validating token: ${error}`);
  }
}