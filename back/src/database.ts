import { Pool } from "pg";
import "dotenv/config";

const connectionString: string | undefined = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined in the environment variables.");
}

export const database = new Pool({
  connectionString,
});