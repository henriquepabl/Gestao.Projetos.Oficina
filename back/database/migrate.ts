// Executa, em ordem, todos os .sql de database/migrations (são idempotentes). Uso: npm run migrate
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { database } from "../src/database";

async function main() {
  const pasta = join(__dirname, "migrations");
  for (const arquivo of readdirSync(pasta).filter((nome) => nome.endsWith(".sql")).sort()) {
    await database.query(readFileSync(join(pasta, arquivo), "utf8"));
    console.log(`ok  ${arquivo}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => database.end());
