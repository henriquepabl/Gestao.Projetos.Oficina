import { Router } from "express";
import { cadastroController } from "../controllers/cadastro.controller";

export const cadastroRoutes = Router();
cadastroRoutes.post("/cadastro", cadastroController.create);
