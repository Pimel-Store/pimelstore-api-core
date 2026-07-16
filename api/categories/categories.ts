import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ObjectId } from 'mongodb';
import apiResponse from '../../utils/apiResponse';
import securityRules from '../../utils/requestSecurity';
import { Category } from '../../interfaces/category';
import { getCollection } from '../../utils/mongo';
import { setCorsHeaders } from '../../utils/cors';

const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/;

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
        return await createCategory(req, res, companyId);
      case 'GET':
        return await getCategories(req, res, companyId);
      case 'PUT':
        return await updateCategory(req, res, companyId, id);
      case 'DELETE':
        return await deleteCategory(req, res, companyId, id);
      default:
        return apiResponse(res, 405, { message: 'Method not allowed' });
    }
  } catch (error: any) {
    apiResponse(res, 500, {
      message: 'Error processing category request',
      error: error?.message || String(error)
    });
  }
}

async function createCategory(req: VercelRequest, res: VercelResponse, companyId: string) {
  const { title, color } = req.body as Category;

  if (!title || !color) {
    return apiResponse(res, 400, { message: 'Missing required fields - title or color' });
  }

  if (!HEX_COLOR_REGEX.test(color)) {
    return apiResponse(res, 400, { message: 'Invalid color. Must be a hex color, e.g. #FF5733' });
  }

  const categoryCollection = await getCollection('categories');
  const category = {
    _company_id: companyId,
    title: title,
    color: color,
    created_at: new Date(),
    updated_at: new Date()
  };
  const insertedCategory = await categoryCollection.insertOne(category);

  apiResponse(res, 201, {
    message: 'Category created successfully',
    data: { ...category, _id: insertedCategory.insertedId }
  });
}

async function getCategories(req: VercelRequest, res: VercelResponse, companyId: string) {
  const categoryCollection = await getCollection('categories');
  const categories = await categoryCollection
    .find({ _company_id: companyId })
    .sort({ title: 1 })
    .toArray();

  apiResponse(res, 200, {
    message: 'Categories retrieved successfully',
    data: categories
  });
}

async function updateCategory(req: VercelRequest, res: VercelResponse, companyId: string, id: string | undefined) {
  if (!id) {
    return apiResponse(res, 400, { message: 'Invalid or missing category ID' });
  }

  if (!ObjectId.isValid(id)) {
    return apiResponse(res, 400, { message: 'Invalid category ID format' });
  }

  const { title, color } = req.body as Category;

  if (color !== undefined && !HEX_COLOR_REGEX.test(color)) {
    return apiResponse(res, 400, { message: 'Invalid color. Must be a hex color, e.g. #FF5733' });
  }

  const categoryCollection = await getCollection('categories');
  const category = await categoryCollection.findOne({ _company_id: companyId, _id: new ObjectId(id) });
  if (!category) {
    return apiResponse(res, 404, { message: 'Category not found' });
  }

  const updatedCategory = {
    ...category,
    title: title || category.title,
    color: color || category.color,
    updated_at: new Date()
  };

  await categoryCollection.updateOne(
    { _company_id: companyId, _id: new ObjectId(id) },
    { $set: updatedCategory }
  );

  apiResponse(res, 200, {
    message: 'Category updated successfully',
    data: updatedCategory
  });
}

async function deleteCategory(req: VercelRequest, res: VercelResponse, companyId: string, id: string | undefined) {
  if (!id) {
    return apiResponse(res, 400, { message: 'Invalid or missing category ID' });
  }

  if (!ObjectId.isValid(id)) {
    return apiResponse(res, 400, { message: 'Invalid category ID format' });
  }

  const categoryCollection = await getCollection('categories');
  const category = await categoryCollection.findOne({ _company_id: companyId, _id: new ObjectId(id) });
  if (!category) {
    return apiResponse(res, 404, { message: 'Category not found' });
  }

  await categoryCollection.deleteOne({ _id: new ObjectId(id) });

  apiResponse(res, 200, {
    message: 'Category deleted successfully',
    data: { deletedCategoryId: id }
  });
}
