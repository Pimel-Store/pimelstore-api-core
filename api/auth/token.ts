import type { VercelRequest, VercelResponse } from '@vercel/node';
import apiResponse from '../../utils/apiResponse';
import securityRules from '../../utils/requestSecurity';
import { setCorsHeaders } from '../../utils/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const securutyValidation = await securityRules(req);
    if (!securutyValidation.valid) {
      return apiResponse(res, securutyValidation.statusCode || 401, { message: securutyValidation.message });
    }

    apiResponse(res, 200, {
      message: 'User logged in successfully',
      data: securutyValidation.data
    });
  } catch (error: any) {
    apiResponse(res, 500, {
      message: 'Error logging in user',
      error: error?.message || String(error)
    });
  }
}
