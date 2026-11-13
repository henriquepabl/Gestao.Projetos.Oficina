import bcrypt from "bcrypt";
import { database } from "../database";

type NovoUsuario = { nome: string; email: string; telefone: string; senha: string };

export const cadastroService = {
  async create({ nome, email, telefone, senha }: NovoUsuario): Promise<void> {
    const senhaHash = await bcrypt.hash(senha, 12);
    await database.query(
      `INSERT INTO usuarios (nome, email, telefone, senha_hash, role)
       VALUES ($1, $2, $3, $4, 'client')`,
      [nome, email, telefone, senhaHash],
    );
  },
};
