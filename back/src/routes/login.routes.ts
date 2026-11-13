import { Router } from "express";
import { loginController } from "../controllers/login.controller";

export const loginRoutes = Router();

loginRoutes.post("/login", loginController.login);
