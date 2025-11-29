import type { VercelRequest, VercelResponse } from '@vercel/node';
import apiResponse from '../../utils/apiResponse';
import securityRules from '../../utils/requestSecurity';
import { getCollection } from '../../utils/mongo';
import { ObjectId } from 'mongodb';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');

    const securutyValidation = await securityRules(req);
    if (!securutyValidation.valid) {
      return await apiResponse(res, securutyValidation.statusCode || 401, { message: securutyValidation.message });
    }

    const companyId = securutyValidation.data.tokenData._company_id;
    if (!companyId) { return await apiResponse(res, 400, { message: 'Company ID is missing in token data' });}

    const match = req.url?.match(/^\/sales\/([^/]+)$/);
    const id = match?.[1];
    
    if (!id || typeof id !== 'string') {
      return await apiResponse(res, 400, { message: 'Invalid or missing sale ID' });
    }

    if (!ObjectId.isValid(id)) {
      return await apiResponse(res, 400, { message: 'Invalid sale ID format' });
    }

  try {
  
    const saleCollection = await getCollection('pimelstore', 'sales');
    const sales = await saleCollection.findOne({ _company_id: companyId, _id: new ObjectId(id) });
    if (!sales) {
      return await apiResponse(res, 404, { message: 'Sale not found' });
    }
    await saleCollection.deleteOne({ _id: new ObjectId(id) });


    await apiResponse(res, 200,
      { 
        message: 'Sale deleted successfully',
        data: { deletedSaleId: id }
      }
    );
  } catch (error: any) {
     await apiResponse(res, 500, { 
      message: 'Error deleting sale', 
      error: error?.message || String(error)
    });
  }
}