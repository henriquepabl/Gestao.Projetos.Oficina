import { Router } from "express";
import { orcamentosController as c } from "../controllers/orcamentos.controller";
import { autenticar, EQUIPE, permitir } from "../middlewares/auth";

export const orcamentosRoutes = Router();

orcamentosRoutes.post("/agendamentos/:id/diagnostico", autenticar, permitir(...EQUIPE), c.registrarDiagnostico);

orcamentosRoutes.get("/orcamentos", autenticar, c.listar);
orcamentosRoutes.post("/orcamentos", autenticar, permitir(...EQUIPE), c.criar);
orcamentosRoutes.get("/orcamentos/:id", autenticar, c.buscar);
orcamentosRoutes.patch("/orcamentos/:id/resposta", autenticar, permitir("client"), c.responder);
orcamentosRoutes.patch("/orcamentos/:id/cancelar", autenticar, permitir(...EQUIPE), c.cancelar);
