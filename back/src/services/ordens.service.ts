import { database, transacao } from "../database";
import { falha } from "../http";
import { comSaldo, osEmAberto, podeMudarOS } from "../regras";
import { movimentar } from "./estoque.service";

const SELECT = `
  SELECT os.id, os.status, os.observacoes, os.aberta_em, os.concluida_em, os.orcamento_id,
         os.mecanico_id, m.nome AS mecanico_nome,
         v.id AS veiculo_id, v.marca, v.modelo, v.placa, v.usuario_id, u.nome AS cliente_nome, u.telefone AS cliente_telefone,
         d.problemas, d.recomendacoes,
         (SELECT COALESCE(SUM(i.quantidade * i.valor_unitario), 0)::float8 FROM orcamento_itens i WHERE i.orcamento_id = os.orcamento_id) AS total,
         (SELECT COALESCE(SUM(p.valor), 0)::float8 FROM pagamentos p WHERE p.os_id = os.id AND p.status = 'pago') AS total_pago
    FROM ordens_servico os
    JOIN veiculos v ON v.id = os.veiculo_id
    JOIN usuarios u ON u.id = v.usuario_id
    JOIN orcamentos o ON o.id = os.orcamento_id
    JOIN diagnosticos d ON d.id = o.diagnostico_id
    LEFT JOIN usuarios m ON m.id = os.mecanico_id`;

type LinhaOS = { total: number; total_pago: number; status: string; [campo: string]: unknown };

async function statusDaOS(osId: string) {
  const { rows } = await database.query<{ status: string }>("SELECT status FROM ordens_servico WHERE id = $1", [osId]);
  if (!rows[0]) throw falha(404, "Ordem de serviço não encontrada.");
  return rows[0].status;
}

export const ordensService = {
  async listar({ dono, status }: { dono: string | null; status: string | null }) {
    const { rows } = await database.query<LinhaOS>(
      `${SELECT} WHERE ($1::bigint IS NULL OR v.usuario_id = $1) AND ($2::text IS NULL OR os.status = $2) ORDER BY os.aberta_em DESC`,
      [dono, status],
    );
    return rows.map(comSaldo);
  },

  async buscar(id: string, dono: string | null) {
    const { rows } = await database.query<LinhaOS>(`${SELECT} WHERE os.id = $1 AND ($2::bigint IS NULL OR v.usuario_id = $2)`, [id, dono]);
    if (!rows[0]) throw falha(404, "Ordem de serviço não encontrada.");
    const [itens, pecas, pagamentos] = await Promise.all([
      database.query(
        `SELECT id, tipo, descricao, quantidade::float8, valor_unitario::float8, (quantidade * valor_unitario)::float8 AS subtotal
           FROM orcamento_itens WHERE orcamento_id = $1 ORDER BY id`,
        [rows[0].orcamento_id],
      ),
      database.query(
        `SELECT m.id, p.codigo, p.nome, m.quantidade, m.criado_em
           FROM movimentacoes_estoque m JOIN pecas p ON p.id = m.peca_id WHERE m.os_id = $1 ORDER BY m.id`,
        [id],
      ),
      database.query(
        `SELECT id, valor::float8, forma, status, pago_em, observacao, criado_em FROM pagamentos WHERE os_id = $1 ORDER BY id`,
        [id],
      ),
    ]);
    return { ...comSaldo(rows[0]), itens: itens.rows, pecas_usadas: pecas.rows, pagamentos: pagamentos.rows };
  },

  async atualizar(id: string, dados: { status: string | null; mecanicoId: string | null; observacoes: string | null }) {
    const atual = await statusDaOS(id);
    if (dados.status && !podeMudarOS(atual, dados.status)) {
      throw falha(400, `Não é possível mudar de "${atual}" para "${dados.status}".`);
    }
    if (dados.mecanicoId) {
      const { rows } = await database.query("SELECT 1 FROM usuarios WHERE id = $1 AND role IN ('employee', 'admin') AND ativo", [dados.mecanicoId]);
      if (!rows[0]) throw falha(400, "Mecânico inválido.");
    }
    await database.query(
      `UPDATE ordens_servico
          SET status = COALESCE($2::text, status), mecanico_id = COALESCE($3, mecanico_id), observacoes = COALESCE($4, observacoes),
              concluida_em = CASE WHEN $2::text IN ('concluida', 'entregue') THEN COALESCE(concluida_em, NOW()) ELSE concluida_em END
        WHERE id = $1 AND status = $5`,
      [id, dados.status, dados.mecanicoId, dados.observacoes, atual],
    );
    return this.buscar(id, null);
  },

  /** Peça usada na OS = saída de estoque vinculada à OS. */
  async usarPeca(osId: string, pecaId: string, quantidade: number, usuarioId: string) {
    await transacao(async (db) => {
      const { rows } = await db.query<{ status: string }>("SELECT status FROM ordens_servico WHERE id = $1 FOR UPDATE", [osId]);
      if (!rows[0]) throw falha(404, "Ordem de serviço não encontrada.");
      if (!osEmAberto(rows[0].status)) throw falha(400, "A OS não está em aberto.");
      await movimentar(db, { pecaId, tipo: "saida", quantidade, osId, motivo: `Uso na OS #${osId}`, usuarioId });
    });
    return this.buscar(osId, null);
  },

  async registrarPagamento(osId: string, dados: { valor: number; forma: string; pago: boolean; observacao: string | null; usuarioId: string }) {
    await transacao(async (db) => {
      // trava a OS para dois registros simultâneos não passarem do total
      const { rows } = await db.query<{ status: string; em_aberto: number }>(
        `SELECT os.status,
                ((SELECT COALESCE(SUM(i.quantidade * i.valor_unitario), 0) FROM orcamento_itens i WHERE i.orcamento_id = os.orcamento_id)
               - (SELECT COALESCE(SUM(p.valor), 0) FROM pagamentos p WHERE p.os_id = os.id AND p.status IN ('pago', 'pendente')))::float8 AS em_aberto
           FROM ordens_servico os WHERE os.id = $1 FOR UPDATE`,
        [osId],
      );
      if (!rows[0]) throw falha(404, "Ordem de serviço não encontrada.");
      if (rows[0].status === "cancelada") throw falha(400, "OS cancelada não recebe pagamentos.");
      if (dados.valor > rows[0].em_aberto + 0.001) {
        throw falha(400, rows[0].em_aberto > 0
          ? `Valor maior que o saldo em aberto (R$ ${rows[0].em_aberto.toFixed(2).replace(".", ",")}).`
          : "Esta OS já está totalmente paga (ou com pagamento pendente lançado).");
      }
      await db.query(
        `INSERT INTO pagamentos (os_id, valor, forma, status, pago_em, registrado_por, observacao)
         VALUES ($1, $2, $3, $4::text, CASE WHEN $4::text = 'pago' THEN NOW() END, $5, $6)`,
        [osId, dados.valor, dados.forma, dados.pago ? "pago" : "pendente", dados.usuarioId, dados.observacao],
      );
    });
    return this.buscar(osId, null);
  },

  /** Pendente → pago ou cancelado; pago → cancelado (estorno de lançamento errado). O registro fica no histórico. */
  async atualizarPagamento(id: string, status: "pago" | "cancelado") {
    const { rows } = await database.query<{ os_id: string }>(
      `UPDATE pagamentos SET status = $2::text, pago_em = CASE WHEN $2::text = 'pago' THEN NOW() END
        WHERE id = $1 AND (status = 'pendente' OR ($2::text = 'cancelado' AND status = 'pago')) RETURNING os_id`,
      [id, status],
    );
    if (!rows[0]) throw falha(404, "Pagamento não encontrado ou já cancelado.");
    return this.buscar(rows[0].os_id, null);
  },
};
