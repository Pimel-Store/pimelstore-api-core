import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders } from '../utils/cors';

export default function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  res.status(200).json({ message: 'This is the API for PimelStore!' });
}
