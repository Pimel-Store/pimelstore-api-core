import { v4 as uuidv4 } from 'uuid';

export default async function generateUUID(): Promise<string> {
  try {
    return uuidv4();
  } catch (error) {
    throw new Error(`Error generating UUID: ${error}`);
  }
}