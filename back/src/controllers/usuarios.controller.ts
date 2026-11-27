import type { Request, Response } from "express";
import { falha, texto, umDe } from "../http";
import { eu, type Role } from "../middlewares/auth";
import { cadastroService } from "../services/cadastro.service";
import { usuariosService } from "../services/usuarios.service";
import { validarNovoUsuario } from "./cadastro.controller";

const ROLES: Role[] = ["client", "employee", "admin"];

function novoUsuario(body: unknown) {
  const dados = validarNovoUsuario(body);
  if (typeof dados === "string") throw falha(400, dados);
  return dados;
}

function emailOpcional(valor: unknown) {
  const email = texto(valor, "o e-mail", false)?.toLowerCase() ?? null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw falha(400, "Informe um e-mail válido.");
  return email;
}

export const usuariosController = {
  async me(request: Request, response: Response) {
    return response.json(await usuariosService.buscar(eu(request).id));
  },

  async trocarSenha(request: Request, response: Response) {
    const senhaAtual = texto(request.body?.senhaAtual, "a senha atual")!;
    const novaSenha = request.body?.novaSenha;
    if (typeof novaSenha !== "string" || novaSenha.length < 8) throw falha(400, "A nova senha deve ter pelo menos 8 caracteres.");
    await usuariosService.trocarSenha(eu(request).id, senhaAtual, novaSenha);
    return response.json({ status: "ok", message: "Senha alterada." });
  },

  // --- clientes (equipe) ---
  async listarClientes(request: Request, response: Response) {
    return response.json(await usuariosService.listar({ role: "client", busca: String(request.query.busca ?? "") }));
  },

  async buscarCliente(request: Request, response: Response) {
    const cliente = await usuariosService.buscar(String(request.params.id));
    if (cliente.role !== "client") throw falha(404, "Cliente não encontrado.");
    return response.json(cliente);
  },

  async criarCliente(request: Request, response: Response) {
    const id = await cadastroService.create({ ...novoUsuario(request.body), role: "client" });
    return response.status(201).json(await usuariosService.buscar(id));
  },

  async atualizarCliente(request: Request, response: Response) {
    const { nome, telefone, email } = request.body ?? {};
    const cliente = await usuariosService.atualizar(
      String(request.params.id),
      { nome: texto(nome, "o nome", false), telefone: texto(telefone, "o telefone", false), email: emailOpcional(email) },
      "client",
    );
    return response.json(cliente);
  },

  // --- usuários (admin) ---
  async listarUsuarios(request: Request, response: Response) {
    return response.json(await usuariosService.listar({ busca: String(request.query.busca ?? "") }));
  },

  async equipe(_request: Request, response: Response) {
    return response.json(await usuariosService.equipe());
  },

  async criarUsuario(request: Request, response: Response) {
    const role = umDe(request.body?.role ?? "employee", ROLES, "Perfil");
    const id = await cadastroService.create({ ...novoUsuario(request.body), role });
    return response.status(201).json(await usuariosService.buscar(id));
  },

  async atualizarUsuario(request: Request, response: Response) {
    const id = String(request.params.id);
    const { role, ativo, nome, telefone, email } = request.body ?? {};
    if (id === eu(request).id && (role !== undefined || ativo !== undefined)) {
      throw falha(400, "Você não pode alterar o próprio perfil ou desativar a própria conta.");
    }
    if (ativo !== undefined && typeof ativo !== "boolean") throw falha(400, "Ativo inválido.");
    const usuario = await usuariosService.atualizar(id, {
      nome: texto(nome, "o nome", false),
      telefone: texto(telefone, "o telefone", false),
      email: emailOpcional(email),
      role: role === undefined ? null : umDe(role, ROLES, "Perfil"),
      ativo: ativo ?? null,
    });
    return response.json(usuario);
  },
};
