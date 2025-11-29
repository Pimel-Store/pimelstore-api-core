import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const data = await Promise.resolve({ message: 'This is the API for PimelStore!' });
  
  res.status(200).json(data);
}
