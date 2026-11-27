import type { PoolClient } from "pg";
import { database, transacao } from "../database";
import { falha } from "../http";

export type DadosPeca = { codigo?: string | null; nome?: string | null; preco_venda?: number | null; estoque_minimo?: number | null; ativo?: boolean | null };
export type Movimentacao = { pecaId: string; tipo: "entrada" | "saida"; quantidade: number; osId: string | null; motivo: string | null; usuarioId: string };

const CAMPOS = "id, codigo, nome, preco_venda::float8, quantidade, estoque_minimo, ativo, (quantidade <= estoque_minimo) AS abaixo_minimo";

/**
 * Grava a movimentação e ajusta o saldo na MESMA transação (risco R10).
 * O CHECK (quantidade >= 0) da tabela impede saldo negativo.
 */
export async function movimentar(db: PoolClient, mov: Movimentacao) {
  const delta = mov.tipo === "entrada" ? mov.quantidade : -mov.quantidade;
  try {
    const { rows } = await db.query(
      `UPDATE pecas SET quantidade = quantidade + $2 WHERE id = $1 AND ativo RETURNING ${CAMPOS}`,
      [mov.pecaId, delta],
    );
    if (!rows[0]) throw falha(404, "Peça não encontrada ou inativa.");
    await db.query(
      `INSERT INTO movimentacoes_estoque (peca_id, tipo, quantidade, os_id, motivo, usuario_id) VALUES ($1, $2, $3, $4, $5, $6)`,
      [mov.pecaId, mov.tipo, mov.quantidade, mov.osId, mov.motivo, mov.usuarioId],
    );
    return rows[0];
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23514") {
      throw falha(400, "Estoque insuficiente para esta saída.");
    }
    throw error;
  }
}

export const estoqueService = {
  async listar({ busca, abaixoMinimo }: { busca: string | null; abaixoMinimo: boolean }) {
    const { rows } = await database.query(
      `SELECT ${CAMPOS} FROM pecas
        WHERE ($1::text IS NULL OR nome ILIKE '%' || $1 || '%' OR codigo ILIKE '%' || $1 || '%')
          AND (NOT $2 OR (ativo AND quantidade <= estoque_minimo))
        ORDER BY ativo DESC, nome`,
      [busca, abaixoMinimo],
    );
    return rows;
  },

  async criar(dados: Required<Omit<DadosPeca, "ativo">>) {
    const { rows } = await database.query(
      `INSERT INTO pecas (codigo, nome, preco_venda, estoque_minimo) VALUES ($1, $2, $3, $4) RETURNING ${CAMPOS}`,
      [dados.codigo, dados.nome, dados.preco_venda, dados.estoque_minimo ?? 0],
    );
    return rows[0];
  },

  async atualizar(id: string, dados: DadosPeca) {
    const { rows } = await database.query(
      `UPDATE pecas SET codigo = COALESCE($2, codigo), nome = COALESCE($3, nome), preco_venda = COALESCE($4, preco_venda),
              estoque_minimo = COALESCE($5, estoque_minimo), ativo = COALESCE($6, ativo)
        WHERE id = $1 RETURNING ${CAMPOS}`,
      [id, dados.codigo ?? null, dados.nome ?? null, dados.preco_venda ?? null, dados.estoque_minimo ?? null, dados.ativo ?? null],
    );
    if (!rows[0]) throw falha(404, "Peça não encontrada.");
    return rows[0];
  },

  movimentar(mov: Movimentacao) {
    return transacao((db) => movimentar(db, mov));
  },

  async movimentacoes(pecaId: string) {
    const { rows } = await database.query(
      `SELECT m.id, m.tipo, m.quantidade, m.os_id, m.motivo, m.criado_em, u.nome AS usuario_nome
         FROM movimentacoes_estoque m JOIN usuarios u ON u.id = m.usuario_id
        WHERE m.peca_id = $1 ORDER BY m.criado_em DESC LIMIT 100`,
      [pecaId],
    );
    return rows;
  },
};
