import { MongoClient, Db, Collection, Document } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

let client: MongoClient | null = null;
let db: Db | null = null;

const MONGO_URI = process.env.MONGO_URI || '';

if (!MONGO_URI) throw new Error('Defina MONGO_URI');

export async function connectToDatabase(): Promise<Db> {
    try {
        if (db) return db;
        if (!client) client = new MongoClient(MONGO_URI);
        await client.connect();
        db = client.db('pimelstore');
        return db;
    } catch (error) {
        throw new Error(`Erro trying to connect with MONGO: ${error}`);
    }
}

export async function getCollection<T extends Document = Document>(collectionName: string): Promise<Collection<T>> {
  try {
    const database = await connectToDatabase();
    return database.collection<T>(collectionName);
  } catch (error: any) {
    throw new Error(`Problems to get collection: ${error.message || error}`);
  }
}
