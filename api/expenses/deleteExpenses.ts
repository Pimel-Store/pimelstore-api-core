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
      return apiResponse(res, 400, { message: 'Invalid or missing expense ID' });
    }

    if (!ObjectId.isValid(id)) {
      return apiResponse(res, 400, { message: 'Invalid expense ID format' });
    }

    const expenseCollection = await getCollection('expenses');
    const expense = await expenseCollection.findOne({ _company_id: companyId, _id: new ObjectId(id) });
    if (!expense) {
      return apiResponse(res, 404, { message: 'Expense not found' });
    }

    await expenseCollection.deleteOne({ _id: new ObjectId(id) });

    apiResponse(res, 200, {
      message: 'Expense deleted successfully',
      data: { deletedExpenseId: id }
    });
  } catch (error: any) {
    apiResponse(res, 500, {
      message: 'Error deleting expense',
      error: error?.message || String(error)
    });
  }
}
