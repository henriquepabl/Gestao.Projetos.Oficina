import type { Request, Response } from "express";
import { falha, texto, umDe } from "../http";
import { dono, ehEquipe, eu } from "../middlewares/auth";
import { STATUS_AGENDAMENTO } from "../regras";
import { agendamentosService } from "../services/agendamentos.service";

function dataHora(valor: unknown, campo: string): string {
  const data = new Date(String(valor ?? ""));
  if (Number.isNaN(data.getTime())) throw falha(400, `Informe ${campo} válido.`);
  return data.toISOString();
}

const dataDoFiltro = (valor: unknown) => {
  if (!valor) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(valor))) throw falha(400, "Data inválida (use AAAA-MM-DD).");
  return String(valor);
};

export const agendamentosController = {
  async listar(request: Request, response: Response) {
    const status = request.query.status ? umDe(request.query.status, STATUS_AGENDAMENTO, "Status") : null;
    return response.json(await agendamentosService.listar({ dono: dono(request), data: dataDoFiltro(request.query.data), status }));
  },

  async buscar(request: Request, response: Response) {
    return response.json(await agendamentosService.buscar(String(request.params.id), dono(request)));
  },

  async ocupados(request: Request, response: Response) {
    const data = dataDoFiltro(request.query.data);
    if (!data) throw falha(400, "Informe a data.");
    return response.json(await agendamentosService.ocupados(data));
  },

  async criar(request: Request, response: Response) {
    const body = request.body ?? {};
    const equipe = ehEquipe(request);
    const inicio = dataHora(body.inicio, "o início");
    const fim = dataHora(body.fim, "o fim");
    if (fim <= inicio) throw falha(400, "O fim deve ser depois do início.");
    if (!equipe && new Date(inicio) < new Date()) throw falha(400, "Escolha um horário futuro.");
    const agendamento = await agendamentosService.criar({
      // o banco garante (FK composta) que o veículo é deste cliente
      usuarioId: equipe ? texto(String(body.usuario_id ?? ""), "o cliente")! : eu(request).id,
      veiculoId: texto(String(body.veiculo_id ?? ""), "o veículo")!,
      inicio,
      fim,
      descricao: texto(body.descricao, "a descrição", false),
      atendenteId: equipe ? eu(request).id : null,
    });
    return response.status(201).json(agendamento);
  },

  async mudarStatus(request: Request, response: Response) {
    const status = umDe(request.body?.status, STATUS_AGENDAMENTO, "Status");
    const agendamento = await agendamentosService.mudarStatus(String(request.params.id), status, {
      id: eu(request).id,
      equipe: ehEquipe(request),
    });
    return response.json(agendamento);
  },
};
