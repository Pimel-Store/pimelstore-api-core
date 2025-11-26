import { MongoClient, Db, Collection, Document } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

let client: MongoClient;
let db: Db;

const MONGO_URI = process.env.MONGO_URI || '';

if (!MONGO_URI) throw new Error('Defina MONGO_URI');

export async function connectToDatabase(DB_NAME: string): Promise<Db> {
    try {
        if (db) return db;
        client = client ?? new MongoClient(MONGO_URI);
        await client.connect();
        db = client.db(DB_NAME);
        return db;
    } catch (error) {
        throw new Error(`Erro trying to connect with MONGO: ${error}`);
    }
}

export async function getCollection<T extends Document = Document>( DB_NAME: string, collectionName: string ): Promise<Collection<T>> {
  try {
    const database: Db = await connectToDatabase(DB_NAME);
    return database.collection<T>(collectionName);
  } catch (error: any) {
    throw new Error(`Problems to get collection: ${error.message || error}`);
  }
}

