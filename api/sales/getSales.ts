import { Pagination } from './../../interfaces/pagination';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import apiResponse from '../../utils/apiResponse';
import securityRules from '../../utils/requestSecurity';
import { getCollection } from '../../utils/mongo';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');

    const securutyValidation = await securityRules(req);
    if (!securutyValidation.valid) {
      return await apiResponse(res, securutyValidation.statusCode || 401, { message: securutyValidation.message });
    }

    const companyId = securutyValidation.data.tokenData._company_id;
    if (!companyId) { return await apiResponse(res, 400, { message: 'Company ID is missing in token data' });}

  try {
    const { initial_date, final_date, page = "1", limit = "10" } = req.query;
    const saleCollection = await getCollection('pimelstore', 'sales');

    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * limitNumber;

    let filter: any = { _company_id: companyId };
    if (initial_date && final_date) {
      filter.created_at = {};
      if (initial_date) filter.created_at.$gte = new Date(initial_date as string);
      if (final_date) filter.created_at.$lte = new Date(final_date as string);
    }


    const sales = await saleCollection
    .find(filter)
    .skip(skip)
    .limit(limitNumber)
    .toArray();

    const total = await saleCollection.countDocuments(filter);

    const pagination: Pagination = {
      page: pageNumber,
      limit: limitNumber,
      totalItems: total,
      totalPages: Math.ceil(total / limitNumber)
    }

    await apiResponse(res, 200,
      { 
        message: 'Sales retrieved successfully',
        data: sales,
        pagination: pagination
      }
    );
  } catch (error: any) {
     await apiResponse(res, 500, { 
      message: 'Error retrieving sales', 
      error: error?.message || String(error)
    });
  }
}