import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function apiResponse(res: VercelResponse, status:number, data: any) {
    res.status(status).json(data);
}