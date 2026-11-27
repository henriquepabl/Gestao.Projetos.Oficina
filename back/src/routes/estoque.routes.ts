import { Router } from "express";
import { estoqueController as c } from "../controllers/estoque.controller";
import { autenticar, EQUIPE, permitir } from "../middlewares/auth";

export const estoqueRoutes = Router();
const equipe = [autenticar, permitir(...EQUIPE)];

estoqueRoutes.get("/pecas", ...equipe, c.listar);
estoqueRoutes.post("/pecas", ...equipe, c.criar);
estoqueRoutes.patch("/pecas/:id", ...equipe, c.atualizar);
estoqueRoutes.get("/pecas/:id/movimentacoes", ...equipe, c.movimentacoes);
estoqueRoutes.post("/pecas/:id/movimentacoes", ...equipe, c.movimentar);
