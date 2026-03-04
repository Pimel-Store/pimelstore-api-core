import type { VercelResponse } from '@vercel/node';

export default function apiResponse(res: VercelResponse, status: number, data: any) {
    res.status(status).json(data);
}