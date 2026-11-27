import { Pool, type PoolClient } from "pg";
import "dotenv/config";

const connectionString: string | undefined = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined in the environment variables.");
}

export const database = new Pool({
  connectionString,
});

/** Executa `fn` dentro de BEGIN/COMMIT; qualquer erro desfaz tudo (ROLLBACK). */
export async function transacao<T>(fn: (db: PoolClient) => Promise<T>): Promise<T> {
  const db = await database.connect();
  try {
    await db.query("BEGIN");
    const resultado = await fn(db);
    await db.query("COMMIT");
    return resultado;
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally {
    db.release();
  }
}
