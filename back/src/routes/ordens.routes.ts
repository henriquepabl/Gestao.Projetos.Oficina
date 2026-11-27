import { Router } from "express";
import { ordensController as c } from "../controllers/ordens.controller";
import { autenticar, EQUIPE, permitir } from "../middlewares/auth";

export const ordensRoutes = Router();
const equipe = [autenticar, permitir(...EQUIPE)];

// Cliente consulta as próprias OS (com situação do pagamento); só a equipe altera.
ordensRoutes.get("/ordens-servico", autenticar, c.listar);
ordensRoutes.get("/ordens-servico/:id", autenticar, c.buscar);
ordensRoutes.patch("/ordens-servico/:id", ...equipe, c.atualizar);
ordensRoutes.post("/ordens-servico/:id/pecas", ...equipe, c.usarPeca);
ordensRoutes.post("/ordens-servico/:id/pagamentos", ...equipe, c.registrarPagamento);
ordensRoutes.patch("/pagamentos/:id", ...equipe, c.atualizarPagamento);
