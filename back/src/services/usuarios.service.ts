import bcrypt from "bcrypt";
import { database } from "../database";
import { falha } from "../http";
import type { Role } from "../middlewares/auth";

const CAMPOS = "id, nome, email, telefone, role, ativo, criado_em";

export const usuariosService = {
  async buscar(id: string) {
    const { rows } = await database.query(`SELECT ${CAMPOS} FROM usuarios WHERE id = $1`, [id]);
    if (!rows[0]) throw falha(404, "Usuário não encontrado.");
    return rows[0];
  },

  async trocarSenha(id: string, senhaAtual: string, novaSenha: string) {
    const { rows } = await database.query<{ senha_hash: string }>("SELECT senha_hash FROM usuarios WHERE id = $1", [id]);
    if (!rows[0] || !(await bcrypt.compare(senhaAtual, rows[0].senha_hash))) {
      throw falha(400, "Senha atual incorreta.");
    }
    await database.query("UPDATE usuarios SET senha_hash = $2 WHERE id = $1", [id, await bcrypt.hash(novaSenha, 12)]);
  },

  /** Lista usuários; `role` filtra (ex.: só clientes) e `busca` procura em nome, e-mail e telefone. */
  async listar({ role, busca }: { role?: Role; busca?: string }) {
    const { rows } = await database.query(
      `SELECT ${CAMPOS},
              (SELECT COUNT(*)::int FROM veiculos v WHERE v.usuario_id = u.id) AS total_veiculos
         FROM usuarios u
        WHERE ($1::text IS NULL OR role = $1)
          AND ($2::text IS NULL OR nome ILIKE '%' || $2 || '%' OR email ILIKE '%' || $2 || '%' OR telefone ILIKE '%' || $2 || '%')
        ORDER BY nome`,
      [role ?? null, busca || null],
    );
    return rows;
  },

  async atualizar(id: string, dados: { nome?: string | null; email?: string | null; telefone?: string | null; role?: Role | null; ativo?: boolean | null }, somenteRole?: Role) {
    const { rows } = await database.query(
      `UPDATE usuarios
          SET nome = COALESCE($2, nome), email = COALESCE($3, email), telefone = COALESCE($4, telefone),
              role = COALESCE($5, role), ativo = COALESCE($6, ativo)
        WHERE id = $1 AND ($7::text IS NULL OR role = $7)
        RETURNING ${CAMPOS}`,
      [id, dados.nome ?? null, dados.email ?? null, dados.telefone ?? null, dados.role ?? null, dados.ativo ?? null, somenteRole ?? null],
    );
    if (!rows[0]) throw falha(404, "Usuário não encontrado.");
    return rows[0];
  },

  /** Funcionários e admins ativos (para escolher mecânico/atendente). */
  async equipe() {
    const { rows } = await database.query(
      "SELECT id, nome, role FROM usuarios WHERE role IN ('employee', 'admin') AND ativo ORDER BY nome",
    );
    return rows;
  },
};
