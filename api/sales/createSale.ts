import type { VercelRequest, VercelResponse } from '@vercel/node';
import apiResponse from '../../utils/apiResponse';
import securityRules from '../../utils/requestSecurity';
import { Sale } from '../../interfaces/sale';
import { getCollection } from '../../utils/mongo';

export default async function handler(req: VercelRequest, res: VercelResponse) {

    const securutyValidation = await securityRules(req);
    if (!securutyValidation.valid) {
      return await apiResponse(res, securutyValidation.statusCode || 401, { message: securutyValidation.message });
    }

    const companyId = securutyValidation.data.tokenData._company_id;
    if (!companyId) { return await apiResponse(res, 400, { message: 'Company ID is missing in token data' });}

  try {
    const { product, payment_method, value } = req.body as Sale;
    
    if(!product || !payment_method || value === undefined || value === null ) {
      return await apiResponse(res, 400, { message: 'Missing required fields - product, payment_method, or value' });
    }

    if (typeof value !== 'number') {
      return await apiResponse(res, 400, { message: 'Invalid value type. Value must be a number.' });
    }

    const paymentMethods = ['credit_card', 'debit_card', 'pix', 'cash', 'other'];
    if (!paymentMethods.includes(payment_method)) {
      return await apiResponse(res, 400, { message: `Invalid payment_method. Allowed values are: ${paymentMethods.join(', ')}` });
    }

    const saleCollection = await getCollection('pimelstore', 'sales');
    const sale = {
        _company_id: companyId,
        product: product,
        value: value,
        payment_method: payment_method,
        created_at: new Date(),
        updated_at: new Date()
    };
    const insertedSale = await saleCollection.insertOne(sale);

    await apiResponse(res, 201,
      { 
        message: 'Sale created successfully',
        data: { ...sale, _id: insertedSale.insertedId  }
      }
    );
  } catch (error: any) {
     await apiResponse(res, 500, { 
      message: 'Error creating sale', 
      error: error?.message || String(error)
    });
  }
}