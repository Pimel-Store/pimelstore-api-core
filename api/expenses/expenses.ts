import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ObjectId } from 'mongodb';
import apiResponse from '../../utils/apiResponse';
import securityRules from '../../utils/requestSecurity';
import { Expense } from '../../interfaces/expense';
import { Pagination } from '../../interfaces/pagination';
import { getCollection } from '../../utils/mongo';
import { setCorsHeaders } from '../../utils/cors';

const PAYMENT_METHODS = ['credit_card', 'debit_card', 'pix', 'cash', 'other'];

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

    const id = req.query.id as string | undefined;

    switch (req.method) {
      case 'POST':
        return await createExpense(req, res, companyId);
      case 'GET':
        return id
          ? await getExpenseById(req, res, companyId, id)
          : await getExpenses(req, res, companyId);
      case 'PUT':
        return await updateExpense(req, res, companyId, id);
      case 'DELETE':
        return await deleteExpense(req, res, companyId, id);
      default:
        return apiResponse(res, 405, { message: 'Method not allowed' });
    }
  } catch (error: any) {
    apiResponse(res, 500, {
      message: 'Error processing expense request',
      error: error?.message || String(error)
    });
  }
}

async function createExpense(req: VercelRequest, res: VercelResponse, companyId: string) {
  const { description, category_id, payment_method, value, expensed_at } = req.body as Expense;

  if (!description || !category_id || !payment_method || value === undefined || value === null || !expensed_at) {
    return apiResponse(res, 400, { message: 'Missing required fields - description, category_id, payment_method, value, or expensed_at' });
  }

  if (typeof value !== 'number') {
    return apiResponse(res, 400, { message: 'Invalid value type. Value must be a number.' });
  }

  if (!ObjectId.isValid(category_id)) {
    return apiResponse(res, 400, { message: 'Invalid category_id format' });
  }

  if (!PAYMENT_METHODS.includes(payment_method)) {
    return apiResponse(res, 400, { message: `Invalid payment_method. Allowed values are: ${PAYMENT_METHODS.join(', ')}` });
  }

  const categoryCollection = await getCollection('categories');
  const category = await categoryCollection.findOne({ _company_id: companyId, _id: new ObjectId(category_id) });
  if (!category) {
    return apiResponse(res, 400, { message: 'Category not found' });
  }

  const expenseCollection = await getCollection('expenses');
  const expense = {
    _company_id: companyId,
    description: description,
    category_id: category_id,
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
}

async function getExpenses(req: VercelRequest, res: VercelResponse, companyId: string) {
  const { initial_date, final_date, page = "1", limit = "10" } = req.query;
  const expenseCollection = await getCollection('expenses');

  const pageNumber = parseInt(page as string, 10);
  const limitNumber = parseInt(limit as string, 10);
  const skip = (pageNumber - 1) * limitNumber;

  let filter: any = { _company_id: companyId };
  if (initial_date || final_date) {
    filter.expensed_at = {};
    if (initial_date) filter.expensed_at.$gte = new Date(`${initial_date}T00:00:00.000-03:00`);
    if (final_date) filter.expensed_at.$lte = new Date(`${final_date}T23:59:59.999-03:00`);
  }

  const expenses = await expenseCollection
    .find(filter)
    .sort({ expensed_at: -1, _id: -1 })
    .skip(skip)
    .limit(limitNumber)
    .toArray();

  const total = await expenseCollection.countDocuments(filter);

  const pagination: Pagination = {
    page: pageNumber,
    limit: limitNumber,
    totalItems: total,
    totalPages: Math.ceil(total / limitNumber)
  };

  apiResponse(res, 200, {
    message: 'Expenses retrieved successfully',
    data: expenses,
    pagination: pagination
  });
}

async function getExpenseById(req: VercelRequest, res: VercelResponse, companyId: string, id: string) {
  if (!ObjectId.isValid(id)) {
    return apiResponse(res, 400, { message: 'Invalid expense ID format' });
  }

  const expenseCollection = await getCollection('expenses');
  const expense = await expenseCollection.findOne({ _company_id: companyId, _id: new ObjectId(id) });
  if (!expense) {
    return apiResponse(res, 404, { message: 'Expense not found' });
  }

  apiResponse(res, 200, {
    message: 'Expense retrieved successfully',
    data: expense
  });
}

async function updateExpense(req: VercelRequest, res: VercelResponse, companyId: string, id: string | undefined) {
  if (!id) {
    return apiResponse(res, 400, { message: 'Invalid or missing expense ID' });
  }

  if (!ObjectId.isValid(id)) {
    return apiResponse(res, 400, { message: 'Invalid expense ID format' });
  }

  const { description, category_id, payment_method, value, expensed_at } = req.body as Expense;

  if (category_id !== undefined) {
    if (!ObjectId.isValid(category_id)) {
      return apiResponse(res, 400, { message: 'Invalid category_id format' });
    }
    const categoryCollection = await getCollection('categories');
    const category = await categoryCollection.findOne({ _company_id: companyId, _id: new ObjectId(category_id) });
    if (!category) {
      return apiResponse(res, 400, { message: 'Category not found' });
    }
  }

  if (payment_method !== undefined) {
    if (!PAYMENT_METHODS.includes(payment_method)) {
      return apiResponse(res, 400, { message: `Invalid payment_method. Allowed values are: ${PAYMENT_METHODS.join(', ')}` });
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
    category_id: category_id || expense.category_id,
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
}

async function deleteExpense(req: VercelRequest, res: VercelResponse, companyId: string, id: string | undefined) {
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
}
