import bcrypt from "bcrypt";
import { database } from "../database";
import type { Role } from "../middlewares/auth";

type NovoUsuario = { nome: string; email: string; telefone: string; senha: string; role?: Role };

export const cadastroService = {
  async create({ nome, email, telefone, senha, role = "client" }: NovoUsuario): Promise<string> {
    const senhaHash = await bcrypt.hash(senha, 12);
    const { rows } = await database.query<{ id: string }>(
      `INSERT INTO usuarios (nome, email, telefone, senha_hash, role)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [nome, email, telefone, senhaHash, role],
    );
    return rows[0].id;
  },
};
