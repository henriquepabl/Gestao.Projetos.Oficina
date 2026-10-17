import cors from "cors";
import dotenv from "dotenv";
import express from "express";

dotenv.config();

const app = express();

const port = Number(process.env.PORT ?? 3000);
const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";

app.use(cors({ origin: frontendUrl }));
app.use(express.json());

app.get("/api/health", (_request, response) => {
  return response.json({
    status: "ok",
    service: "oficina-api",
  });
});
app.get("/", (_request, response) => {
  return response.json({
    message: "Bem-vindo à API da oficina!",
  });
});

app.listen(port, () => {
  console.log(`API rodando em http://localhost:${port}`);
});