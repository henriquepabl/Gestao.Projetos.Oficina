import bcrypt from "bcrypt";
import { database } from "../database";

type LoginCredentials = {
  email: string;
  senha: string;
};

type UsuarioRow = {
  id: string;
  nome: string;
  email: string;
  senha_hash: string;
  role: string;
  ativo: boolean;
};

export type AuthenticatedUser = Omit<UsuarioRow, "senha_hash">;

export const loginService = {
  async authenticate({
    email,
    senha,
  }: LoginCredentials): Promise<AuthenticatedUser | null> {
    const { rows } = await database.query<UsuarioRow>(
      `SELECT id, nome, email, senha_hash, role, ativo
         FROM usuarios
        WHERE LOWER(email) = LOWER($1)
        LIMIT 1`,
      [email],
    );

    const usuario = rows[0];

    if (!usuario || !usuario.ativo) {
      return null;
    }

    const senhaConfere = await bcrypt.compare(senha, usuario.senha_hash);

    if (!senhaConfere) {
      return null;
    }

    return {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      role: usuario.role,
      ativo: usuario.ativo,
    };
  },
};
