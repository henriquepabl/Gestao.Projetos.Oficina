import cors from "cors";
import express from "express";
import { database } from "./database";

const app = express();

const port = Number(process.env.PORT ?? 3000);
const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";

app.use(cors({ origin: frontendUrl }));
app.use(express.json());

app.get("/api/health", async (_request, response) => {
  try {
    await database.query("SELECT 1");

    return response.json({
      status: "ok",
      service: "oficina-api",
      database: "connected",
    });
  } catch {
    return response.status(500).json({
      status: "error",
      database: "disconnected",
    });
  }
});
app.get("/", (_request, response) => {
  return response.json({
    message: "Bem-vindo à API da oficina!",
  });
});

app.listen(port, () => {
  console.log(`API rodando em http://localhost:${port}`);
});