import type { Request, Response } from "express";
import { loginService } from "../services/login.service";

export const loginController = {
  async login(request: Request, response: Response) {
    const { email, senha } = request.body ?? {};

    if (
      typeof email !== "string" ||
      email.trim() === "" ||
      typeof senha !== "string" ||
      senha === ""
    ) {
      return response.status(400).json({
        status: "error",
        message: "Informe e-mail e senha.",
      });
    }

    try {
      const usuario = await loginService.authenticate({
        email: email.trim(),
        senha,
      });

      if (!usuario) {
        return response.status(401).json({
          status: "error",
          message: "E-mail ou senha inválidos.",
        });
      }

      return response.status(200).json({
        status: "ok",
        message: "Login realizado com sucesso.",
      });
    } catch {
      return response.status(500).json({
        status: "error",
        message: "Erro interno do servidor.",
      });
    }
  },
};
