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
    const expenseCollection = await getCollection('expenses');
    const { year } = req.query;

    const now = new Date();
    const yearNumber = Number(year) || now.getFullYear();
    const lastMonth = (yearNumber === now.getFullYear()) ? now.getMonth() + 1 : 12;

    const TZ = 'America/Sao_Paulo';
    const yearStart = new Date(`${yearNumber}-01-01T00:00:00.000-03:00`);
    const yearEnd   = new Date(`${yearNumber}-12-31T23:59:59.999-03:00`);

    // Pipeline base: computa saleDate = sold_at se existir, senão created_at
    const basePipeline = [
      { $match: { _company_id: companyId } },
      { $addFields: { saleDate: { $ifNull: ['$sold_at', '$created_at'] } } },
      { $match: { $expr: { $and: [{ $gte: ['$saleDate', yearStart] }, { $lte: ['$saleDate', yearEnd] }] } } }
    ];

    // Pipeline base de despesas: computa expenseDate = expensed_at se existir, senão created_at
    const expenseBasePipeline = [
      { $match: { _company_id: companyId } },
      { $addFields: { expenseDate: { $ifNull: ['$expensed_at', '$created_at'] } } },
      { $match: { $expr: { $and: [{ $gte: ['$expenseDate', yearStart] }, { $lte: ['$expenseDate', yearEnd] }] } } }
    ];

    // Agrupamento mensal - vendas
    const monthlyData = await saleCollection.aggregate([
      ...basePipeline,
      {
        $group: {
          _id: { $month: { date: '$saleDate', timezone: TZ } },
          totalItems: { $sum: 1 },
          totalValue: { $sum: '$value' }
        }
      }
    ]).toArray();

    // Agrupamento mensal - despesas
    const monthlyExpenseData = await expenseCollection.aggregate([
      ...expenseBasePipeline,
      {
        $group: {
          _id: { $month: { date: '$expenseDate', timezone: TZ } },
          totalItems: { $sum: 1 },
          totalValue: { $sum: '$value' }
        }
      }
    ]).toArray();

    // Monta resultado mensal
    const monthlyResult: { [month: string]: { totalItems: number, totalValue: number, totalExpenses: number, netValue: number, month: number, year: number } | null } = {};
    for (let m = 1; m <= lastMonth; m++) {
      const monthData = monthlyData.find(d => d._id === m);
      const monthExpenseData = monthlyExpenseData.find(d => d._id === m);
      const totalValue = monthData?.totalValue || 0;
      const totalExpenses = monthExpenseData?.totalValue || 0;
      monthlyResult[m] = (monthData || monthExpenseData)
        ? {
            totalItems: monthData?.totalItems || 0,
            totalValue,
            totalExpenses,
            netValue: totalValue - totalExpenses,
            month: m,
            year: yearNumber
          }
        : null;
    }

    // Agrupamento diário - vendas
    const dailyData = await saleCollection.aggregate([
      ...basePipeline,
      {
        $group: {
          _id: {
            year:  { $year:       { date: '$saleDate', timezone: TZ } },
            month: { $month:      { date: '$saleDate', timezone: TZ } },
            day:   { $dayOfMonth: { date: '$saleDate', timezone: TZ } }
          },
          totalItems: { $sum: 1 },
          totalValue: { $sum: '$value' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]).toArray();

    // Agrupamento diário - despesas
    const dailyExpenseData = await expenseCollection.aggregate([
      ...expenseBasePipeline,
      {
        $group: {
          _id: {
            year:  { $year:       { date: '$expenseDate', timezone: TZ } },
            month: { $month:      { date: '$expenseDate', timezone: TZ } },
            day:   { $dayOfMonth: { date: '$expenseDate', timezone: TZ } }
          },
          totalValue: { $sum: '$value' }
        }
      }
    ]).toArray();

    const dailyResult = dailyData.map(d => {
      const expenseForDay = dailyExpenseData.find(e =>
        e._id.year === d._id.year && e._id.month === d._id.month && e._id.day === d._id.day
      );
      const totalExpenses = expenseForDay?.totalValue || 0;
      return {
        year: d._id.year,
        month: d._id.month,
        day: d._id.day,
        totalItems: d.totalItems,
        totalValue: d.totalValue,
        totalExpenses,
        netValue: d.totalValue - totalExpenses
      };
    });

    // Agrupamento anual - vendas
    const annualData = await saleCollection.aggregate([
      ...basePipeline,
      {
        $group: {
          _id: null,
          year: { $first: yearNumber },
          totalItems: { $sum: 1 },
          totalValue: { $sum: '$value' }
        }
      }
    ]).toArray();

    // Agrupamento anual - despesas
    const annualExpenseData = await expenseCollection.aggregate([
      ...expenseBasePipeline,
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          totalValue: { $sum: '$value' }
        }
      }
    ]).toArray();

    const annualSales = annualData[0] || { totalItems: 0, totalValue: 0 };
    const annualExpenses = annualExpenseData[0] || { totalItems: 0, totalValue: 0 };

    const annualResult = {
      totalItems: annualSales.totalItems,
      totalValue: annualSales.totalValue,
      totalExpenseItems: annualExpenses.totalItems,
      totalExpenses: annualExpenses.totalValue,
      netValue: annualSales.totalValue - annualExpenses.totalValue
    };

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
