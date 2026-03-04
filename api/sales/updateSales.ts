import type { VercelRequest, VercelResponse } from '@vercel/node';
import apiResponse from '../../utils/apiResponse';
import securityRules from '../../utils/requestSecurity';
import { getCollection } from '../../utils/mongo';
import { ObjectId } from 'mongodb';
import { Sale } from '../../interfaces/sale';
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

    const { product, payment_method, value, sold_at } = req.body as Sale;

    if (payment_method !== undefined) {
      const paymentMethods = ['credit_card', 'debit_card', 'pix', 'cash', 'other'];
      if (!paymentMethods.includes(payment_method)) {
        return apiResponse(res, 400, { message: `Invalid payment_method. Allowed values are: ${paymentMethods.join(', ')}` });
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
  } catch (error: any) {
    apiResponse(res, 500, {
      message: 'Error updating sale',
      error: error?.message || String(error)
    });
  }
}
