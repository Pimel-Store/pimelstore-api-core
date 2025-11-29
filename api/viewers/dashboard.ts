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
  if (!companyId) { 
    return await apiResponse(res, 400, { message: 'Company ID is missing in token data' });
  }

  try {
    const saleCollection = await getCollection('pimelstore', 'sales');
    const { year } = req.query;

    const now = new Date();
    const yearNumber = Number(year) || now.getFullYear(); 
    const lastMonth = (yearNumber === now.getFullYear()) ? now.getMonth() + 1 : 12;

    // Agrupamento mensal
    const monthlyData = await saleCollection.aggregate([
      { 
        $match: {
          _company_id: companyId,
          created_at: {
            $gte: new Date(`${yearNumber}-01-01T00:00:00.000Z`),
            $lte: new Date(`${yearNumber}-12-31T23:59:59.999Z`)
          }
        }
      },
      {
        $group: {
          _id: { $month: '$created_at' },
          totalItems: { $sum: 1 },
          totalValue: { $sum: '$value' }
        }
      }
    ]).toArray();

    // Monta resultado mensal
    const monthlyResult: { [month: string]: { totalItems: number, totalValue: number, month:number, year:number } | null } = {};
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
            $gte: new Date(`${yearNumber}-01-01T00:00:00.000Z`),
            $lte: new Date(`${yearNumber}-12-31T23:59:59.999Z`)
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$created_at' },
            month: { $month: '$created_at' },
            day: { $dayOfMonth: '$created_at' }
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
            $gte: new Date(`${yearNumber}-01-01T00:00:00.000Z`),
            $lte: new Date(`${yearNumber}-12-31T23:59:59.999Z`)
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

    const annualResult = annualData[0] || { totalItems: 0, totalValue: 0};

    // Retorna os três resultados juntos
    await apiResponse(res, 200, { 
      message: 'Dashboard retrieved successfully',
      data: {
        monthly: monthlyResult,
        daily: dailyResult,
        annual: annualResult
      }
    });

  } catch (error: any) {
    await apiResponse(res, 500, { 
      message: 'Error retrieving dashboard', 
      error: error?.message || String(error)
    });
  }
}
