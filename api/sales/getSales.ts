import type { VercelRequest, VercelResponse } from '@vercel/node';
import apiResponse from '../../utils/apiResponse';
import securityRules from '../../utils/requestSecurity';
import { getCollection } from '../../utils/mongo';

export default async function handler(req: VercelRequest, res: VercelResponse) {

    const securutyValidation = await securityRules(req);
    if (!securutyValidation.valid) {
      return await apiResponse(res, securutyValidation.statusCode || 401, { message: securutyValidation.message });
    }

    const companyId = securutyValidation.data.tokenData._company_id;
    if (!companyId) { return await apiResponse(res, 400, { message: 'Company ID is missing in token data' });}

  try {
  

    const saleCollection = await getCollection('pimelstore', 'sales');
    const sales = await saleCollection.find({ _company_id: companyId }).toArray();

    await apiResponse(res, 200,
      { 
        message: 'Sales retrieved successfully',
        data: sales
      }
    );
  } catch (error: any) {
     await apiResponse(res, 500, { 
      message: 'Error retrieving sales', 
      error: error?.message || String(error)
    });
  }
}