import type { Request, Response } from "express";
import { cadastroService } from "../services/cadastro.service";

type DadosCadastro = { nome: string; email: string; telefone: string; senha: string };

/** Valida o corpo de um novo usuário; devolve a mensagem de erro ou os dados normalizados. */
export function validarNovoUsuario(body: unknown): DadosCadastro | string {
  const { nome, email, telefone, senha } = (body ?? {}) as Record<string, unknown>;
  if ([nome, email, telefone, senha].some((value) => typeof value !== "string" || value.trim() === "")) {
    return "Preencha todos os campos.";
  }
  const normalizedEmail = (email as string).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return "Informe um e-mail válido.";
  if ((senha as string).length < 8) return "A senha deve ter pelo menos 8 caracteres.";
  return {
    nome: (nome as string).trim(),
    email: normalizedEmail,
    telefone: (telefone as string).trim(),
    senha: senha as string,
  };
}

export const cadastroController = {
  async create(request: Request, response: Response) {
    const dados = validarNovoUsuario(request.body);
    if (typeof dados === "string") {
      return response.status(400).json({ status: "error", message: dados });
    }
    try {
      await cadastroService.create(dados);
      return response.status(201).json({ status: "ok", message: "Conta criada com sucesso." });
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
        return response.status(409).json({ status: "error", message: "Este e-mail já está cadastrado." });
      }
      return response.status(500).json({ status: "error", message: "Não foi possível criar a conta agora." });
    }
  },
};
