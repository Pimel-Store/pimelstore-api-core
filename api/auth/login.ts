import { User } from '../../interfaces/user';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import apiResponse from '../../utils/apiResponse';
import { getCollection } from '../../utils/mongo';
import { verifyPassword } from '../../utils/bcrypt';
import { generateToken } from '../../utils/jwt';
import { setCorsHeaders } from '../../utils/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { email, password } = req.body as User;

  try {
    if (!email || !password) {
      return apiResponse(res, 400, { message: 'Missing required fields - email or password' });
    }

    const usersCollection = await getCollection<User>('users');

    const user: User | null = await usersCollection.findOne({ email: email });
    if (!user) { return apiResponse(res, 400, { message: 'User does not exist' }); }

    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) { return apiResponse(res, 400, { message: 'Invalid password' }); }

    const dataAboutUser = {
      _uuid: user._uuid,
      _company_id: user._company_id,
      name: user.name,
      email: user.email
    };

    const token = generateToken(dataAboutUser);

    apiResponse(res, 200, {
      message: 'User logged in successfully',
      data: {
        ...dataAboutUser,
        token
      }
    });
  } catch (error: any) {
    apiResponse(res, 500, {
      message: 'Error logging in user',
      error: error?.message || String(error)
    });
  }
}
