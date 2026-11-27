import { Router } from "express";
import { veiculosController as c } from "../controllers/veiculos.controller";
import { autenticar } from "../middlewares/auth";

// Cliente e equipe usam as mesmas rotas; o serviço filtra pelo dono quando é cliente.
export const veiculosRoutes = Router();

veiculosRoutes.get("/veiculos", autenticar, c.listar);
veiculosRoutes.post("/veiculos", autenticar, c.criar);
veiculosRoutes.get("/veiculos/:id", autenticar, c.buscar);
veiculosRoutes.patch("/veiculos/:id", autenticar, c.atualizar);
veiculosRoutes.get("/veiculos/:id/historico", autenticar, c.historico);
