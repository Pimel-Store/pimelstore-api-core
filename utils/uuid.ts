import { v4 as uuidv4 } from 'uuid';

export default function generateUUID(): string {
  return uuidv4();
}
