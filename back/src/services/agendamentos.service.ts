import type { PoolClient } from "pg";
import { database, transacao } from "../database";
import { falha } from "../http";
import { CAPACIDADE_OFICINA, FUSO_OFICINA, podeMudarAgendamento } from "../regras";

const SELECT = `
  SELECT a.id, a.usuario_id, u.nome AS cliente_nome, u.telefone AS cliente_telefone,
         a.veiculo_id, v.marca, v.modelo, v.placa, v.quilometragem, a.atendente_id, at.nome AS atendente_nome,
         a.inicio, a.fim, a.descricao, a.status, a.criado_em,
         d.id AS diagnostico_id, d.problemas, d.recomendacoes,
         (SELECT o.status FROM orcamentos o WHERE o.diagnostico_id = d.id ORDER BY o.id DESC LIMIT 1) AS orcamento_status
    FROM agendamentos a
    JOIN usuarios u ON u.id = a.usuario_id
    JOIN veiculos v ON v.id = a.veiculo_id
    LEFT JOIN usuarios at ON at.id = a.atendente_id
    LEFT JOIN diagnosticos d ON d.agendamento_id = a.id`;

/** Bloqueia o horário se a oficina já tem CAPACIDADE_OFICINA atendimentos confirmados no período. */
async function verificarCapacidade(db: PoolClient, inicio: string, fim: string, ignorarId: string | null) {
  // trava a tabela para dois funcionários não confirmarem o último box ao mesmo tempo
  await db.query("LOCK TABLE agendamentos IN SHARE ROW EXCLUSIVE MODE");
  const { rows } = await db.query<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM agendamentos
      WHERE status IN ('confirmado', 'em_atendimento') AND inicio < $2 AND fim > $1
        AND ($3::bigint IS NULL OR id <> $3)`,
    [inicio, fim, ignorarId],
  );
  if (rows[0].total >= CAPACIDADE_OFICINA) throw falha(409, "Horário indisponível: a oficina está lotada nesse período.");
}

export const agendamentosService = {
  async listar({ dono, data, status }: { dono: string | null; data: string | null; status: string | null }) {
    const { rows } = await database.query(
      `${SELECT}
        WHERE ($1::bigint IS NULL OR a.usuario_id = $1)
          AND ($2::date IS NULL OR (a.inicio AT TIME ZONE '${FUSO_OFICINA}')::date = $2)
          AND ($3::text IS NULL OR a.status = $3)
        ORDER BY a.inicio`,
      [dono, data, status],
    );
    return rows;
  },

  async buscar(id: string, dono: string | null) {
    const { rows } = await database.query(`${SELECT} WHERE a.id = $1 AND ($2::bigint IS NULL OR a.usuario_id = $2)`, [id, dono]);
    if (!rows[0]) throw falha(404, "Agendamento não encontrado.");
    return rows[0];
  },

  /** Períodos já ocupados no dia (sem dados de clientes), para o cliente escolher horário. */
  async ocupados(data: string) {
    const { rows } = await database.query(
      `SELECT inicio, fim FROM agendamentos
        WHERE status IN ('confirmado', 'em_atendimento') AND (inicio AT TIME ZONE '${FUSO_OFICINA}')::date = $1
        ORDER BY inicio`,
      [data],
    );
    return { capacidade: CAPACIDADE_OFICINA, ocupados: rows };
  },

  async criar(dados: { usuarioId: string; veiculoId: string; inicio: string; fim: string; descricao: string | null; atendenteId: string | null }) {
    const id = await transacao(async (db) => {
      const { rows: veiculo } = await db.query("SELECT 1 FROM veiculos WHERE id = $1 AND usuario_id = $2", [dados.veiculoId, dados.usuarioId]);
      if (!veiculo[0]) throw falha(400, "Veículo não encontrado para este cliente. Atualize a página e selecione novamente.");
      // a equipe já cria confirmado; o cliente só solicita
      if (dados.atendenteId) await verificarCapacidade(db, dados.inicio, dados.fim, null);
      const { rows } = await db.query<{ id: string }>(
        `INSERT INTO agendamentos (usuario_id, veiculo_id, atendente_id, inicio, fim, descricao, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [dados.usuarioId, dados.veiculoId, dados.atendenteId, dados.inicio, dados.fim, dados.descricao, dados.atendenteId ? "confirmado" : "solicitado"],
      );
      return rows[0].id;
    });
    return this.buscar(id, null);
  },

  async mudarStatus(id: string, novo: string, usuario: { id: string; equipe: boolean }) {
    await transacao(async (db) => {
      const { rows } = await db.query<{ status: string; usuario_id: string; inicio: string; fim: string }>(
        "SELECT status, usuario_id, inicio, fim FROM agendamentos WHERE id = $1 FOR UPDATE",
        [id],
      );
      const atual = rows[0];
      if (!atual || (!usuario.equipe && atual.usuario_id !== usuario.id)) throw falha(404, "Agendamento não encontrado.");
      if (!podeMudarAgendamento(atual.status, novo, usuario.equipe)) {
        throw falha(400, `Não é possível mudar de "${atual.status}" para "${novo}".`);
      }
      if (novo === "confirmado") await verificarCapacidade(db, atual.inicio, atual.fim, id);
      await db.query(
        "UPDATE agendamentos SET status = $2, atendente_id = COALESCE($3, atendente_id) WHERE id = $1",
        [id, novo, usuario.equipe ? usuario.id : null],
      );
    });
    return this.buscar(id, null);
  },
};
