import { Company } from '../../interfaces/company';
import { User } from '../../interfaces/user';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import apiResponse from '../../utils/apiResponse';
import { getCollection } from '../../utils/mongo';
import { hashPassword } from '../../utils/bcrypt';
import { validatePassword } from '../../utils/passwordHelpers';
import generateUUID from '../../utils/uuid';
import { setCorsHeaders } from '../../utils/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const body = req.body as User;
  try {
    if (!body.name || !body.email || !body.password) {
      return apiResponse(res, 400, { message: 'Missing required fields - name, email, or password' });
    }

    const passwordValidation = validatePassword(body.password);
    if (!passwordValidation.valid) {
      return apiResponse(res, 400, { message: passwordValidation.message });
    }

    const hashedPassword = await hashPassword(body.password);
    const companyCollection = await getCollection<Company>('companies');
    let company = await companyCollection.findOne({ name: "PimelStore" } as Company);

    if (!company) {
      const company_id = generateUUID();
      await companyCollection.insertOne({
        _company_id: company_id,
        name: "PimelStore",
        created_at: new Date(),
        updated_at: new Date()
      } as Company);
    }

    company = await companyCollection.findOne({ name: "PimelStore" } as Company);
    if (!company) {
      return apiResponse(res, 500, { message: 'Error creating default company' });
    }

    const usersCollection = await getCollection<User>('users');

    const user = await usersCollection.findOne({ email: body.email });
    if (user) { return apiResponse(res, 400, { message: 'User already exists' }); }

    const userId = generateUUID();

    await usersCollection.insertOne({
      _uuid: userId,
      name: body.name,
      email: body.email,
      password: hashedPassword,
      _company_id: company._company_id,
      created_at: new Date(),
      updated_at: new Date()
    } as User);

    apiResponse(res, 200, {
      message: 'User registered successfully',
      data: { name: body.name, email: body.email }
    });
  } catch (error: any) {
    apiResponse(res, 500, {
      message: 'Error registering user',
      error: error?.message || String(error)
    });
  }
}
