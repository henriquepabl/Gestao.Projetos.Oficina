import { database } from "../database";
import { falha } from "../http";

export type DadosVeiculo = { marca?: string | null; modelo?: string | null; ano?: number | null; placa?: string | null; quilometragem?: number | null };

const SELECT = `
  SELECT v.id, v.usuario_id, u.nome AS cliente_nome, v.marca, v.modelo, v.ano, v.placa, v.quilometragem, v.criado_em
    FROM veiculos v JOIN usuarios u ON u.id = v.usuario_id`;

export const veiculosService = {
  /** `dono` = id do cliente (só os dele) ou null (equipe vê todos). */
  async listar(dono: string | null, usuarioId: string | null) {
    const { rows } = await database.query(
      `${SELECT} WHERE ($1::bigint IS NULL OR v.usuario_id = $1) AND ($2::bigint IS NULL OR v.usuario_id = $2)
       ORDER BY u.nome, v.modelo`,
      [dono, usuarioId],
    );
    return rows;
  },

  async buscar(id: string, dono: string | null) {
    const { rows } = await database.query(`${SELECT} WHERE v.id = $1 AND ($2::bigint IS NULL OR v.usuario_id = $2)`, [id, dono]);
    if (!rows[0]) throw falha(404, "Veículo não encontrado.");
    return rows[0];
  },

  async criar(usuarioId: string, dados: Required<DadosVeiculo>) {
    const { rows } = await database.query<{ id: string }>(
      `INSERT INTO veiculos (usuario_id, marca, modelo, ano, placa, quilometragem)
       SELECT $1, $2, $3, $4, $5, $6 FROM usuarios WHERE id = $1 AND role = 'client'
       RETURNING id`,
      [usuarioId, dados.marca, dados.modelo, dados.ano, dados.placa, dados.quilometragem ?? 0],
    );
    if (!rows[0]) throw falha(400, "Cliente não encontrado.");
    return this.buscar(rows[0].id, null);
  },

  async atualizar(id: string, dono: string | null, dados: DadosVeiculo) {
    const { rowCount } = await database.query(
      `UPDATE veiculos SET marca = COALESCE($3, marca), modelo = COALESCE($4, modelo), ano = COALESCE($5, ano),
              placa = COALESCE($6, placa), quilometragem = COALESCE($7, quilometragem)
        WHERE id = $1 AND ($2::bigint IS NULL OR usuario_id = $2)`,
      [id, dono, dados.marca ?? null, dados.modelo ?? null, dados.ano ?? null, dados.placa ?? null, dados.quilometragem ?? null],
    );
    if (!rowCount) throw falha(404, "Veículo não encontrado.");
    return this.buscar(id, dono);
  },

  /** RF09: serviços concluídos/entregues do veículo, com diagnóstico, itens e total. */
  async historico(id: string, dono: string | null) {
    const veiculo = await this.buscar(id, dono);
    const { rows } = await database.query(
      `SELECT os.id, os.status, os.aberta_em, os.concluida_em, m.nome AS mecanico_nome,
              d.problemas, d.recomendacoes, d.km_registrado,
              (SELECT COALESCE(json_agg(json_build_object('descricao', i.descricao, 'tipo', i.tipo,
                        'quantidade', i.quantidade::float8, 'valor_unitario', i.valor_unitario::float8) ORDER BY i.id), '[]')
                 FROM orcamento_itens i WHERE i.orcamento_id = o.id) AS itens,
              (SELECT COALESCE(SUM(i.quantidade * i.valor_unitario), 0)::float8 FROM orcamento_itens i WHERE i.orcamento_id = o.id) AS total
         FROM ordens_servico os
         JOIN orcamentos o ON o.id = os.orcamento_id
         JOIN diagnosticos d ON d.id = o.diagnostico_id
         LEFT JOIN usuarios m ON m.id = os.mecanico_id
        WHERE os.veiculo_id = $1 AND os.status IN ('concluida', 'entregue')
        ORDER BY os.concluida_em DESC`,
      [id],
    );
    return { veiculo, servicos: rows };
  },
};
