import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Simula chamada assíncrona
  const data = await Promise.resolve({ message: 'API funcionando!' });
  
  res.status(200).json(data);
}
