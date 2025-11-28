import type { VercelRequest, VercelResponse } from '@vercel/node';
import apiResponse from '../utils/apiResponse';
import securityRules from '../utils/requestSecurity';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const securutyValidation = await securityRules(req);
    if (!securutyValidation.valid) {
      return await apiResponse(res, securutyValidation.statusCode || 401, { message: securutyValidation.message });
    }
    
    await apiResponse(res, 200,
      { 
        message: 'User logged in successfully',
        data: securutyValidation.data
      }
    );
  } catch (error: any) {
     await apiResponse(res, 500, { 
      message: 'Error logging in user', 
      error: error?.message || String(error)
    });
  }
}
