import type { VercelRequest, VercelResponse } from '@vercel/node';
import apiResponse from '../../utils/apiResponse';
import securityRules from '../../utils/requestSecurity';
import { getCollection } from '../../utils/mongo';
import { ObjectId } from 'mongodb';
import { Expense } from '../../interfaces/expense';
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

    const { description, category, payment_method, value, expensed_at } = req.body as Expense;

    if (category !== undefined) {
      const categories = ['rent', 'payroll', 'supplier', 'tax', 'utilities', 'other'];
      if (!categories.includes(category)) {
        return apiResponse(res, 400, { message: `Invalid category. Allowed values are: ${categories.join(', ')}` });
      }
    }

    if (payment_method !== undefined) {
      const paymentMethods = ['credit_card', 'debit_card', 'pix', 'cash', 'other'];
      if (!paymentMethods.includes(payment_method)) {
        return apiResponse(res, 400, { message: `Invalid payment_method. Allowed values are: ${paymentMethods.join(', ')}` });
      }
    }

    const expenseCollection = await getCollection('expenses');
    const expense = await expenseCollection.findOne({ _company_id: companyId, _id: new ObjectId(id) });
    if (!expense) {
      return apiResponse(res, 404, { message: 'Expense not found' });
    }

    const updatedExpense = {
      ...expense,
      description: description || expense.description,
      category: category || expense.category,
      payment_method: payment_method || expense.payment_method,
      value: value !== undefined && value !== null ? value : expense.value,
      expensed_at: expensed_at ? new Date(expensed_at) : expense.expensed_at,
      updated_at: new Date()
    };

    await expenseCollection.updateOne(
      { _company_id: companyId, _id: new ObjectId(id) },
      { $set: updatedExpense }
    );

    apiResponse(res, 200, {
      message: 'Expense updated successfully',
      data: updatedExpense
    });
  } catch (error: any) {
    apiResponse(res, 500, {
      message: 'Error updating expense',
      error: error?.message || String(error)
    });
  }
}
