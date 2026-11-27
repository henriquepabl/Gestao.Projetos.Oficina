import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import "dotenv/config";

export type Role = "client" | "employee" | "admin";
export type UsuarioToken = { id: string; role: Role };

declare global {
  namespace Express {
    interface Request {
      usuario?: UsuarioToken;
    }
  }
}

const secret = process.env.JWT_SECRET;
if (!secret) {
  throw new Error("JWT_SECRET is not defined in the environment variables.");
}

export const EQUIPE: Role[] = ["employee", "admin"];

export function gerarToken(usuario: UsuarioToken): string {
  // shortcut: conta desativada continua válida até o token expirar (8h); checar `ativo` no banco a cada requisição se isso virar problema.
  return jwt.sign({ role: usuario.role }, secret!, { subject: String(usuario.id), expiresIn: "8h" });
}

export function autenticar(request: Request, response: Response, next: NextFunction) {
  const [tipo, token] = (request.headers.authorization ?? "").split(" ");
  if (tipo !== "Bearer" || !token) {
    return response.status(401).json({ status: "error", message: "Faça login para continuar." });
  }
  try {
    const payload = jwt.verify(token, secret!) as jwt.JwtPayload;
    request.usuario = { id: String(payload.sub), role: payload.role as Role };
    return next();
  } catch {
    return response.status(401).json({ status: "error", message: "Sessão expirada. Faça login novamente." });
  }
}

export function permitir(...roles: Role[]) {
  return (request: Request, response: Response, next: NextFunction) => {
    if (!request.usuario || !roles.includes(request.usuario.role)) {
      return response.status(403).json({ status: "error", message: "Você não tem permissão para esta ação." });
    }
    return next();
  };
}

/** Usuário logado (só usar depois de `autenticar`). */
export const eu = (request: Request) => request.usuario!;
export const ehEquipe = (request: Request) => EQUIPE.includes(eu(request).role);
/** Para filtrar dados: id do cliente logado, ou null para a equipe (que vê tudo). */
export const dono = (request: Request) => (ehEquipe(request) ? null : eu(request).id);
