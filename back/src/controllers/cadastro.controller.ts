import type { Request, Response } from "express";
import { cadastroService } from "../services/cadastro.service";

export const cadastroController = {
  async create(request: Request, response: Response) {
    const { nome, email, telefone, senha } = request.body ?? {};
    if ([nome, email, telefone, senha].some((value) => typeof value !== "string" || value.trim() === "")) {
      return response.status(400).json({ status: "error", message: "Preencha todos os campos." });
    }
    const normalizedEmail = (email as string).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return response.status(400).json({ status: "error", message: "Informe um e-mail válido." });
    }
    if ((senha as string).length < 8) {
      return response.status(400).json({ status: "error", message: "A senha deve ter pelo menos 8 caracteres." });
    }
    try {
      await cadastroService.create({
        nome: (nome as string).trim(),
        email: normalizedEmail,
        telefone: (telefone as string).trim(),
        senha: senha as string,
      });
      return response.status(201).json({ status: "ok", message: "Conta criada com sucesso." });
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
        return response.status(409).json({ status: "error", message: "Este e-mail já está cadastrado." });
      }
      return response.status(500).json({ status: "error", message: "Não foi possível criar a conta agora." });
    }
  },
};
