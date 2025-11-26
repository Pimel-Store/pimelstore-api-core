import { User } from '../interfaces/user';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import apiResponse from '../utils/apiResponse';
import { getCollection } from '../utils/mongo';
import { verifyPassword } from '../utils/bcrypt';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const body = req.body as User;
  try {
    if(!body.email || !body.password) {
      return await apiResponse(res, 400, { message: 'Missing required fields - email or password' });
    }

    const usersCollection = await getCollection<User>('pimelstore', 'users');

    const user: User | null = await usersCollection.findOne({ email: body.email });
    if (!user){return await apiResponse(res, 400, { message: 'User does not exist' });}

    const isPasswordValid = await verifyPassword(body.password, user.password);
    if (!isPasswordValid) {return await apiResponse(res, 400, { message: 'Invalid password' });}
    
    await apiResponse(res, 200,
      { 
        message: 'User logged in successfully',
        data: { name: user.name, email: user.email, _uuid: user._uuid, _company_id: user._company_id }
      }
    );
  } catch (error: any) {
     await apiResponse(res, 500, { 
      message: 'Error logging in user', 
      error: error?.message || String(error)
    });
  }
}
