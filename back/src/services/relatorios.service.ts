import { database } from "../database";
import { FUSO_OFICINA } from "../regras";

export const relatoriosService = {
  /** Os 4 cards do dashboard da equipe. */
  async dashboard() {
    const { rows } = await database.query(
      `SELECT
         (SELECT COUNT(*)::int FROM agendamentos
           WHERE status IN ('solicitado', 'confirmado', 'em_atendimento')
             AND (inicio AT TIME ZONE '${FUSO_OFICINA}')::date = (NOW() AT TIME ZONE '${FUSO_OFICINA}')::date) AS agendamentos_hoje,
         (SELECT COUNT(*)::int FROM agendamentos WHERE status = 'solicitado') AS solicitacoes_pendentes,
         (SELECT COUNT(*)::int FROM ordens_servico WHERE status IN ('aberta', 'em_execucao', 'aguardando_peca')) AS ordens_em_andamento,
         (SELECT COUNT(*)::int FROM orcamentos WHERE status = 'pendente') AS orcamentos_pendentes,
         (SELECT COUNT(*)::int FROM pecas WHERE ativo AND quantidade <= estoque_minimo) AS pecas_estoque_baixo`,
    );
    return rows[0];
  },

  /** RF10: serviços, faturamento, estoque e desempenho no período [de, ate] (datas locais da oficina). */
  async relatorio(de: string, ate: string) {
    const periodo = (coluna: string) => `(${coluna} AT TIME ZONE '${FUSO_OFICINA}')::date BETWEEN $1 AND $2`;
    const [servicos, faturamento, porForma, estoqueBaixo, saidas, desempenho] = await Promise.all([
      database.query(`SELECT status, COUNT(*)::int AS total FROM ordens_servico WHERE ${periodo("aberta_em")} GROUP BY status ORDER BY status`, [de, ate]),
      database.query(
        `SELECT to_char(pago_em AT TIME ZONE '${FUSO_OFICINA}', 'YYYY-MM') AS mes, SUM(valor)::float8 AS total, COUNT(*)::int AS pagamentos
           FROM pagamentos WHERE status = 'pago' AND ${periodo("pago_em")} GROUP BY mes ORDER BY mes`,
        [de, ate],
      ),
      database.query(
        `SELECT forma, SUM(valor)::float8 AS total FROM pagamentos WHERE status = 'pago' AND ${periodo("pago_em")} GROUP BY forma ORDER BY total DESC`,
        [de, ate],
      ),
      database.query("SELECT codigo, nome, quantidade, estoque_minimo FROM pecas WHERE ativo AND quantidade <= estoque_minimo ORDER BY nome"),
      database.query(
        `SELECT p.codigo, p.nome, SUM(m.quantidade)::int AS quantidade
           FROM movimentacoes_estoque m JOIN pecas p ON p.id = m.peca_id
          WHERE m.tipo = 'saida' AND ${periodo("m.criado_em")} GROUP BY p.id ORDER BY quantidade DESC LIMIT 20`,
        [de, ate],
      ),
      database.query(
        `SELECT u.nome AS mecanico, COUNT(*)::int AS concluidas,
                ROUND(AVG(EXTRACT(EPOCH FROM (os.concluida_em - os.aberta_em)) / 3600)::numeric, 1)::float8 AS horas_medias
           FROM ordens_servico os JOIN usuarios u ON u.id = os.mecanico_id
          WHERE os.concluida_em IS NOT NULL AND ${periodo("os.concluida_em")}
          GROUP BY u.id ORDER BY concluidas DESC`,
        [de, ate],
      ),
    ]);
    return {
      periodo: { de, ate },
      servicos: servicos.rows,
      faturamento: { por_mes: faturamento.rows, por_forma: porForma.rows },
      estoque: { abaixo_minimo: estoqueBaixo.rows, mais_usadas: saidas.rows },
      desempenho: desempenho.rows,
    };
  },
};
