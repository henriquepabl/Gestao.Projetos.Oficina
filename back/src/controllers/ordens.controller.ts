import type { Request, Response } from "express";
import { numero, texto, umDe } from "../http";
import { dono, eu } from "../middlewares/auth";
import { FORMAS_PAGAMENTO, STATUS_OS } from "../regras";
import { ordensService } from "../services/ordens.service";

export const ordensController = {
  async listar(request: Request, response: Response) {
    const status = request.query.status ? umDe(request.query.status, STATUS_OS, "Status") : null;
    return response.json(await ordensService.listar({ dono: dono(request), status }));
  },

  async buscar(request: Request, response: Response) {
    return response.json(await ordensService.buscar(String(request.params.id), dono(request)));
  },

  async atualizar(request: Request, response: Response) {
    const body = request.body ?? {};
    const os = await ordensService.atualizar(String(request.params.id), {
      status: body.status === undefined ? null : umDe(body.status, STATUS_OS, "Status"),
      mecanicoId: body.mecanico_id ? String(body.mecanico_id) : null,
      observacoes: texto(body.observacoes, "as observações", false),
    });
    return response.json(os);
  },

  async usarPeca(request: Request, response: Response) {
    const body = request.body ?? {};
    const os = await ordensService.usarPeca(
      String(request.params.id),
      texto(String(body.peca_id ?? ""), "a peça")!,
      numero(body.quantidade, "a quantidade", { inteiro: true, minimo: 1 })!,
      eu(request).id,
    );
    return response.status(201).json(os);
  },

  async registrarPagamento(request: Request, response: Response) {
    const body = request.body ?? {};
    const os = await ordensService.registrarPagamento(String(request.params.id), {
      valor: numero(body.valor, "o valor", { minimo: 0.01 })!,
      forma: umDe(body.forma, FORMAS_PAGAMENTO, "Forma de pagamento"),
      pago: body.pago === true,
      observacao: texto(body.observacao, "a observação", false),
      usuarioId: eu(request).id,
    });
    return response.status(201).json(os);
  },

  async atualizarPagamento(request: Request, response: Response) {
    const status = umDe(request.body?.status, ["pago", "cancelado"] as const, "Status");
    return response.json(await ordensService.atualizarPagamento(String(request.params.id), status));
  },
};
