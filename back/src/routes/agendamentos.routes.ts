import { Router } from "express";
import { agendamentosController as c } from "../controllers/agendamentos.controller";
import { autenticar } from "../middlewares/auth";

// Cliente e equipe; o serviço filtra pelo dono e valida quem pode mudar cada status.
export const agendamentosRoutes = Router();

agendamentosRoutes.get("/agendamentos", autenticar, c.listar);
agendamentosRoutes.get("/agendamentos/ocupados", autenticar, c.ocupados);
agendamentosRoutes.post("/agendamentos", autenticar, c.criar);
agendamentosRoutes.get("/agendamentos/:id", autenticar, c.buscar);
agendamentosRoutes.patch("/agendamentos/:id/status", autenticar, c.mudarStatus);
