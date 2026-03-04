import type { VercelRequest, VercelResponse } from '@vercel/node';
import apiResponse from '../../utils/apiResponse';
import securityRules from '../../utils/requestSecurity';
import { getCollection } from '../../utils/mongo';
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
    if (!companyId) {
      return apiResponse(res, 400, { message: 'Company ID is missing in token data' });
    }

    const saleCollection = await getCollection('sales');
    const { year } = req.query;

    const now = new Date();
    const yearNumber = Number(year) || now.getFullYear();
    const lastMonth = (yearNumber === now.getFullYear()) ? now.getMonth() + 1 : 12;

    const TZ = 'America/Sao_Paulo';

    // Agrupamento mensal
    const monthlyData = await saleCollection.aggregate([
      {
        $match: {
          _company_id: companyId,
          created_at: {
            $gte: new Date(`${yearNumber}-01-01T00:00:00.000-03:00`),
            $lte: new Date(`${yearNumber}-12-31T23:59:59.999-03:00`)
          }
        }
      },
      {
        $group: {
          _id: { $month: { date: '$created_at', timezone: TZ } },
          totalItems: { $sum: 1 },
          totalValue: { $sum: '$value' }
        }
      }
    ]).toArray();

    // Monta resultado mensal
    const monthlyResult: { [month: string]: { totalItems: number, totalValue: number, month: number, year: number } | null } = {};
    for (let m = 1; m <= lastMonth; m++) {
      const monthData = monthlyData.find(d => d._id === m);
      monthlyResult[m] = monthData
        ? { totalItems: monthData.totalItems, totalValue: monthData.totalValue, month: m, year: yearNumber }
        : null;
    }

    // Agrupamento diário
    const dailyData = await saleCollection.aggregate([
      {
        $match: {
          _company_id: companyId,
          created_at: {
            $gte: new Date(`${yearNumber}-01-01T00:00:00.000-03:00`),
            $lte: new Date(`${yearNumber}-12-31T23:59:59.999-03:00`)
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: { date: '$created_at', timezone: TZ } },
            month: { $month: { date: '$created_at', timezone: TZ } },
            day: { $dayOfMonth: { date: '$created_at', timezone: TZ } }
          },
          totalItems: { $sum: 1 },
          totalValue: { $sum: '$value' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]).toArray();

    const dailyResult = dailyData.map(d => ({
      year: d._id.year,
      month: d._id.month,
      day: d._id.day,
      totalItems: d.totalItems,
      totalValue: d.totalValue
    }));

    // Agrupamento anual (somando todos os valores)
    const annualData = await saleCollection.aggregate([
      {
        $match: {
          _company_id: companyId,
          created_at: {
            $gte: new Date(`${yearNumber}-01-01T00:00:00.000-03:00`),
            $lte: new Date(`${yearNumber}-12-31T23:59:59.999-03:00`)
          }
        }
      },
      {
        $group: {
          _id: null,
          year: { $first: yearNumber },
          totalItems: { $sum: 1 },
          totalValue: { $sum: '$value' }
        }
      }
    ]).toArray();

    const annualResult = annualData[0] || { totalItems: 0, totalValue: 0 };

    apiResponse(res, 200, {
      message: 'Dashboard retrieved successfully',
      data: {
        monthly: monthlyResult,
        daily: dailyResult,
        annual: annualResult
      }
    });
  } catch (error: any) {
    apiResponse(res, 500, {
      message: 'Error retrieving dashboard',
      error: error?.message || String(error)
    });
  }
}
