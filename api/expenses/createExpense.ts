import type { VercelRequest, VercelResponse } from '@vercel/node';
import apiResponse from '../../utils/apiResponse';
import securityRules from '../../utils/requestSecurity';
import { Expense } from '../../interfaces/expense';
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
    if (!companyId) { return apiResponse(res, 400, { message: 'Company ID is missing in token data' }); }

    const { description, category, payment_method, value, expensed_at } = req.body as Expense;

    if (!description || !category || !payment_method || value === undefined || value === null || !expensed_at) {
      return apiResponse(res, 400, { message: 'Missing required fields - description, category, payment_method, value, or expensed_at' });
    }

    if (typeof value !== 'number') {
      return apiResponse(res, 400, { message: 'Invalid value type. Value must be a number.' });
    }

    const categories = ['rent', 'payroll', 'supplier', 'tax', 'utilities', 'other'];
    if (!categories.includes(category)) {
      return apiResponse(res, 400, { message: `Invalid category. Allowed values are: ${categories.join(', ')}` });
    }

    const paymentMethods = ['credit_card', 'debit_card', 'pix', 'cash', 'other'];
    if (!paymentMethods.includes(payment_method)) {
      return apiResponse(res, 400, { message: `Invalid payment_method. Allowed values are: ${paymentMethods.join(', ')}` });
    }

    const expenseCollection = await getCollection('expenses');
    const expense = {
      _company_id: companyId,
      description: description,
      category: category,
      value: value,
      payment_method: payment_method,
      expensed_at: new Date(expensed_at),
      created_at: new Date(),
      updated_at: new Date()
    };
    const insertedExpense = await expenseCollection.insertOne(expense);

    apiResponse(res, 201, {
      message: 'Expense created successfully',
      data: { ...expense, _id: insertedExpense.insertedId }
    });
  } catch (error: any) {
    apiResponse(res, 500, {
      message: 'Error creating expense',
      error: error?.message || String(error)
    });
  }
}
