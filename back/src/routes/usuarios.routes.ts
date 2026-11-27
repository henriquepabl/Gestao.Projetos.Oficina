import { Router } from "express";
import { usuariosController as c } from "../controllers/usuarios.controller";
import { autenticar, EQUIPE, permitir } from "../middlewares/auth";

export const usuariosRoutes = Router();

usuariosRoutes.get("/me", autenticar, c.me);
usuariosRoutes.patch("/me/senha", autenticar, c.trocarSenha);

usuariosRoutes.get("/clientes", autenticar, permitir(...EQUIPE), c.listarClientes);
usuariosRoutes.post("/clientes", autenticar, permitir(...EQUIPE), c.criarCliente);
usuariosRoutes.get("/clientes/:id", autenticar, permitir(...EQUIPE), c.buscarCliente);
usuariosRoutes.patch("/clientes/:id", autenticar, permitir(...EQUIPE), c.atualizarCliente);

usuariosRoutes.get("/equipe", autenticar, permitir(...EQUIPE), c.equipe);

usuariosRoutes.get("/usuarios", autenticar, permitir("admin"), c.listarUsuarios);
usuariosRoutes.post("/usuarios", autenticar, permitir("admin"), c.criarUsuario);
usuariosRoutes.patch("/usuarios/:id", autenticar, permitir("admin"), c.atualizarUsuario);
