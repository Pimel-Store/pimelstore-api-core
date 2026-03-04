import type { VercelRequest, VercelResponse } from '@vercel/node';
import apiResponse from '../../utils/apiResponse';
import securityRules from '../../utils/requestSecurity';
import { getCollection } from '../../utils/mongo';
import { ObjectId } from 'mongodb';
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

    const companyId = securutyValidation.data._company_id;
    if (!companyId) { return apiResponse(res, 400, { message: 'Company ID is missing in token data' }); }

    const id = req.query.id as string;

    if (!id) {
      return apiResponse(res, 400, { message: 'Invalid or missing sale ID' });
    }

    if (!ObjectId.isValid(id)) {
      return apiResponse(res, 400, { message: 'Invalid sale ID format' });
    }

    const saleCollection = await getCollection('sales');
    const sale = await saleCollection.findOne({ _company_id: companyId, _id: new ObjectId(id) });
    if (!sale) {
      return apiResponse(res, 404, { message: 'Sale not found' });
    }

    await saleCollection.deleteOne({ _id: new ObjectId(id) });

    apiResponse(res, 200, {
      message: 'Sale deleted successfully',
      data: { deletedSaleId: id }
    });
  } catch (error: any) {
    apiResponse(res, 500, {
      message: 'Error deleting sale',
      error: error?.message || String(error)
    });
  }
}
