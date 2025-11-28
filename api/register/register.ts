import { Company } from '../../interfaces/company';
import { User } from '../../interfaces/user';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import apiResponse from '../../utils/apiResponse';
import { getCollection } from '../../utils/mongo';
import { hashPassword } from '../../utils/bcrypt';
import { validatePassword } from '../../utils/passwordHelpers';
import generateUUID from '../../utils/uuid';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const body = req.body as User;
  try {
    if(!body.name || !body.email || !body.password) {
      return await apiResponse(res, 400, { message: 'Missing required fields - name, email, or password' });
    }

    const passwordValidation = await validatePassword(body.password);
    if (!passwordValidation.valid) {
      return await apiResponse(res, 400, { message: passwordValidation.message });
    }

    const hashedPassword = await hashPassword(body.password);
    const companyCollection = await getCollection<Company>('pimelstore', 'companies');
    let company = await companyCollection.findOne({ name: "PimelStore" } as Company);

    if (!company){
      const company_id = await generateUUID();
      await companyCollection.insertOne({
        _company_id: company_id,
        name: "PimelStore",
        created_at: new Date(),
        updated_at: new Date()
      } as Company);
    }

    company = await companyCollection.findOne({ name: "PimelStore" } as Company);
    if (!company){
      return await apiResponse(res, 500, { message: 'Error creating default company' });
    }

    const usersCollection = await getCollection<User>('pimelstore', 'users');

    const user = await usersCollection.findOne({ email: body.email });
    if (user){return await apiResponse(res, 400, { message: 'User already exists' });}
    const userId = await generateUUID();

    await usersCollection.insertOne({
      _uuid: userId,
      name: body.name,
      email: body.email,
      password: hashedPassword,
      _company_id: company._company_id,
      created_at: new Date(),
      updated_at: new Date()
    } as User);
    
    await apiResponse(res, 200,
      { 
        message: 'User registered successfully',
        data: { name: body.name, email: body.email }
      }
    );
  } catch (error: any) {
     await apiResponse(res, 500, { 
      message: 'Error registering user', 
      error: error?.message || String(error)
    });
  }
}
