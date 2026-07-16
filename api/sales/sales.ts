import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ObjectId } from 'mongodb';
import apiResponse from '../../utils/apiResponse';
import securityRules from '../../utils/requestSecurity';
import { Sale } from '../../interfaces/sale';
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
        return await createSale(req, res, companyId);
      case 'GET':
        return id
          ? await getSaleById(req, res, companyId, id)
          : await getSales(req, res, companyId);
      case 'PUT':
        return await updateSale(req, res, companyId, id);
      case 'DELETE':
        return await deleteSale(req, res, companyId, id);
      default:
        return apiResponse(res, 405, { message: 'Method not allowed' });
    }
  } catch (error: any) {
    apiResponse(res, 500, {
      message: 'Error processing sale request',
      error: error?.message || String(error)
    });
  }
}

async function createSale(req: VercelRequest, res: VercelResponse, companyId: string) {
  const { product, payment_method, value, sold_at } = req.body as Sale;

  if (!product || !payment_method || value === undefined || value === null || !sold_at) {
    return apiResponse(res, 400, { message: 'Missing required fields - product, payment_method, value, or sold_at' });
  }

  if (typeof value !== 'number') {
    return apiResponse(res, 400, { message: 'Invalid value type. Value must be a number.' });
  }

  if (!PAYMENT_METHODS.includes(payment_method)) {
    return apiResponse(res, 400, { message: `Invalid payment_method. Allowed values are: ${PAYMENT_METHODS.join(', ')}` });
  }

  const saleCollection = await getCollection('sales');
  const sale = {
    _company_id: companyId,
    product: product,
    value: value,
    payment_method: payment_method,
    sold_at: new Date(sold_at),
    created_at: new Date(),
    updated_at: new Date()
  };
  const insertedSale = await saleCollection.insertOne(sale);

  apiResponse(res, 201, {
    message: 'Sale created successfully',
    data: { ...sale, _id: insertedSale.insertedId }
  });
}

async function getSales(req: VercelRequest, res: VercelResponse, companyId: string) {
  const { initial_date, final_date, page = "1", limit = "10" } = req.query;
  const saleCollection = await getCollection('sales');

  const pageNumber = parseInt(page as string, 10);
  const limitNumber = parseInt(limit as string, 10);
  const skip = (pageNumber - 1) * limitNumber;

  let filter: any = { _company_id: companyId };
  if (initial_date || final_date) {
    filter.sold_at = {};
    if (initial_date) filter.sold_at.$gte = new Date(`${initial_date}T00:00:00.000-03:00`);
    if (final_date) filter.sold_at.$lte = new Date(`${final_date}T23:59:59.999-03:00`);
  }

  const sales = await saleCollection
    .find(filter)
    .sort({ sold_at: -1, _id: -1 })
    .skip(skip)
    .limit(limitNumber)
    .toArray();

  const total = await saleCollection.countDocuments(filter);

  const pagination: Pagination = {
    page: pageNumber,
    limit: limitNumber,
    totalItems: total,
    totalPages: Math.ceil(total / limitNumber)
  };

  apiResponse(res, 200, {
    message: 'Sales retrieved successfully',
    data: sales,
    pagination: pagination
  });
}

async function getSaleById(req: VercelRequest, res: VercelResponse, companyId: string, id: string) {
  if (!ObjectId.isValid(id)) {
    return apiResponse(res, 400, { message: 'Invalid sale ID format' });
  }

  const saleCollection = await getCollection('sales');
  const sale = await saleCollection.findOne({ _company_id: companyId, _id: new ObjectId(id) });
  if (!sale) {
    return apiResponse(res, 404, { message: 'Sale not found' });
  }

  apiResponse(res, 200, {
    message: 'Sale retrieved successfully',
    data: sale
  });
}

async function updateSale(req: VercelRequest, res: VercelResponse, companyId: string, id: string | undefined) {
  if (!id) {
    return apiResponse(res, 400, { message: 'Invalid or missing sale ID' });
  }

  if (!ObjectId.isValid(id)) {
    return apiResponse(res, 400, { message: 'Invalid sale ID format' });
  }

  const { product, payment_method, value, sold_at } = req.body as Sale;

  if (payment_method !== undefined) {
    if (!PAYMENT_METHODS.includes(payment_method)) {
      return apiResponse(res, 400, { message: `Invalid payment_method. Allowed values are: ${PAYMENT_METHODS.join(', ')}` });
    }
  }

  const saleCollection = await getCollection('sales');
  const sale = await saleCollection.findOne({ _company_id: companyId, _id: new ObjectId(id) });
  if (!sale) {
    return apiResponse(res, 404, { message: 'Sale not found' });
  }

  const updatedSale = {
    ...sale,
    product: product || sale.product,
    payment_method: payment_method || sale.payment_method,
    value: value !== undefined && value !== null ? value : sale.value,
    sold_at: sold_at ? new Date(sold_at) : sale.sold_at,
    updated_at: new Date()
  };

  await saleCollection.updateOne(
    { _company_id: companyId, _id: new ObjectId(id) },
    { $set: updatedSale }
  );

  apiResponse(res, 200, {
    message: 'Sale updated successfully',
    data: updatedSale
  });
}

async function deleteSale(req: VercelRequest, res: VercelResponse, companyId: string, id: string | undefined) {
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
}
