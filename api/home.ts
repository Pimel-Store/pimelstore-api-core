import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const data = await Promise.resolve({ message: 'THis is the API for PimelStore!' });
  
  res.status(200).json(data);
}
