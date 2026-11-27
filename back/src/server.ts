import cors from "cors";
import express from "express";
import { database } from "./database";
import { tratarErros } from "./http";
import { loginRoutes } from "./routes/login.routes";
import { cadastroRoutes } from "./routes/cadastro.routes";
import { usuariosRoutes } from "./routes/usuarios.routes";
import { veiculosRoutes } from "./routes/veiculos.routes";
import { agendamentosRoutes } from "./routes/agendamentos.routes";
import { orcamentosRoutes } from "./routes/orcamentos.routes";
import { estoqueRoutes } from "./routes/estoque.routes";
import { ordensRoutes } from "./routes/ordens.routes";
import { relatoriosRoutes } from "./routes/relatorios.routes";

const app = express();

const port = Number(process.env.PORT ?? 3000);
const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";

app.use(cors({ origin: frontendUrl }));
app.use(express.json());

app.use("/api", loginRoutes);
app.use("/api", cadastroRoutes);
app.use("/api", usuariosRoutes);
app.use("/api", veiculosRoutes);
app.use("/api", agendamentosRoutes);
app.use("/api", orcamentosRoutes);
app.use("/api", estoqueRoutes);
app.use("/api", ordensRoutes);
app.use("/api", relatoriosRoutes);

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

app.use(tratarErros);

app.listen(port, () => {
  console.log(`API rodando em http://localhost:${port}`);
});
