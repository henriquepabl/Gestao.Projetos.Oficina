import { Router } from "express";
import { relatoriosController as c } from "../controllers/relatorios.controller";
import { autenticar, EQUIPE, permitir } from "../middlewares/auth";

export const relatoriosRoutes = Router();

relatoriosRoutes.get("/dashboard", autenticar, permitir(...EQUIPE), c.dashboard);
relatoriosRoutes.get("/relatorios", autenticar, permitir("admin"), c.relatorio);
