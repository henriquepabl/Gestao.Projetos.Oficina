import { database, transacao } from "../database";
import { falha } from "../http";

export type ItemOrcamento = { tipo: "peca" | "mao_de_obra"; peca_id: string | null; descricao: string; quantidade: number; valor_unitario: number };

const SELECT = `
  SELECT o.id, o.status, o.validade, o.observacoes, o.respondido_em, o.criado_em,
         o.diagnostico_id, d.problemas, d.recomendacoes, d.km_registrado, mec.nome AS mecanico_nome,
         a.id AS agendamento_id, a.usuario_id, u.nome AS cliente_nome,
         v.id AS veiculo_id, v.marca, v.modelo, v.placa,
         (SELECT COALESCE(SUM(i.quantidade * i.valor_unitario), 0)::float8 FROM orcamento_itens i WHERE i.orcamento_id = o.id) AS total,
         (SELECT os.id FROM ordens_servico os WHERE os.orcamento_id = o.id) AS os_id
    FROM orcamentos o
    JOIN diagnosticos d ON d.id = o.diagnostico_id
    JOIN usuarios mec ON mec.id = d.mecanico_id
    JOIN agendamentos a ON a.id = d.agendamento_id
    JOIN usuarios u ON u.id = a.usuario_id
    JOIN veiculos v ON v.id = a.veiculo_id`;

export const orcamentosService = {
  /** RF04: o diagnóstico é registrado sobre um agendamento confirmado/em atendimento. */
  async registrarDiagnostico(agendamentoId: string, mecanicoId: string, dados: { problemas: string; recomendacoes: string | null; km: number | null }) {
    return transacao(async (db) => {
      const { rows } = await db.query<{ status: string; veiculo_id: string }>(
        "SELECT status, veiculo_id FROM agendamentos WHERE id = $1 FOR UPDATE",
        [agendamentoId],
      );
      if (!rows[0]) throw falha(404, "Agendamento não encontrado.");
      if (!["confirmado", "em_atendimento"].includes(rows[0].status)) {
        throw falha(400, "Só é possível diagnosticar agendamentos confirmados ou em atendimento.");
      }
      const { rows: diag } = await db.query(
        `INSERT INTO diagnosticos (agendamento_id, mecanico_id, problemas, recomendacoes, km_registrado)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [agendamentoId, mecanicoId, dados.problemas, dados.recomendacoes, dados.km],
      );
      await db.query("UPDATE agendamentos SET status = 'em_atendimento' WHERE id = $1 AND status = 'confirmado'", [agendamentoId]);
      if (dados.km !== null) {
        await db.query("UPDATE veiculos SET quilometragem = GREATEST(quilometragem, $2) WHERE id = $1", [rows[0].veiculo_id, dados.km]);
      }
      return diag[0];
    });
  },

  async criar(dados: { diagnosticoId: string; criadoPor: string; validade: string | null; observacoes: string | null; itens: ItemOrcamento[] }) {
    const id = await transacao(async (db) => {
      const { rows: aberto } = await db.query(
        "SELECT 1 FROM orcamentos WHERE diagnostico_id = $1 AND status IN ('pendente', 'aprovado')",
        [dados.diagnosticoId],
      );
      if (aberto[0]) throw falha(409, "Este diagnóstico já tem um orçamento pendente ou aprovado.");
      const { rows } = await db.query<{ id: string }>(
        `INSERT INTO orcamentos (diagnostico_id, criado_por, validade, observacoes) VALUES ($1, $2, $3, $4) RETURNING id`,
        [dados.diagnosticoId, dados.criadoPor, dados.validade, dados.observacoes],
      );
      for (const item of dados.itens) {
        await db.query(
          `INSERT INTO orcamento_itens (orcamento_id, tipo, peca_id, descricao, quantidade, valor_unitario)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [rows[0].id, item.tipo, item.peca_id, item.descricao, item.quantidade, item.valor_unitario],
        );
      }
      return rows[0].id;
    });
    return this.buscar(id, null);
  },

  async listar({ dono, status }: { dono: string | null; status: string | null }) {
    const { rows } = await database.query(
      `${SELECT} WHERE ($1::bigint IS NULL OR a.usuario_id = $1) AND ($2::text IS NULL OR o.status = $2) ORDER BY o.criado_em DESC`,
      [dono, status],
    );
    return rows;
  },

  async buscar(id: string, dono: string | null) {
    const { rows } = await database.query(`${SELECT} WHERE o.id = $1 AND ($2::bigint IS NULL OR a.usuario_id = $2)`, [id, dono]);
    if (!rows[0]) throw falha(404, "Orçamento não encontrado.");
    const { rows: itens } = await database.query(
      `SELECT id, tipo, peca_id, descricao, quantidade::float8, valor_unitario::float8,
              (quantidade * valor_unitario)::float8 AS subtotal
         FROM orcamento_itens WHERE orcamento_id = $1 ORDER BY id`,
      [id],
    );
    return { ...rows[0], itens };
  },

  /** O cliente aprova/recusa o próprio orçamento pendente; aprovar já abre a OS (fluxo aceite → OS). */
  async responder(id: string, clienteId: string, resposta: "aprovado" | "recusado") {
    await transacao(async (db) => {
      const { rows } = await db.query<{ veiculo_id: string; vencido: boolean }>(
        `UPDATE orcamentos o SET status = $3, respondido_em = NOW()
           FROM diagnosticos d JOIN agendamentos a ON a.id = d.agendamento_id
          WHERE o.id = $1 AND d.id = o.diagnostico_id AND a.usuario_id = $2 AND o.status = 'pendente'
          RETURNING a.veiculo_id, (o.validade IS NOT NULL AND o.validade < CURRENT_DATE) AS vencido`,
        [id, clienteId, resposta],
      );
      if (!rows[0]) throw falha(404, "Orçamento pendente não encontrado.");
      if (rows[0].vencido && resposta === "aprovado") throw falha(400, "Orçamento vencido. Peça um novo orçamento à oficina.");
      if (resposta === "aprovado") {
        await db.query("INSERT INTO ordens_servico (orcamento_id, veiculo_id) VALUES ($1, $2)", [id, rows[0].veiculo_id]);
      }
    });
    return this.buscar(id, clienteId);
  },

  async cancelar(id: string) {
    const { rowCount } = await database.query("UPDATE orcamentos SET status = 'cancelado' WHERE id = $1 AND status = 'pendente'", [id]);
    if (!rowCount) throw falha(404, "Orçamento pendente não encontrado.");
    return this.buscar(id, null);
  },
};
