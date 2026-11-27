import type { Request, Response } from "express";
import { falha, numero, texto, umDe } from "../http";
import { dono, eu } from "../middlewares/auth";
import { orcamentosService, type ItemOrcamento } from "../services/orcamentos.service";

function lerItens(valor: unknown): ItemOrcamento[] {
  if (!Array.isArray(valor) || valor.length === 0) throw falha(400, "Inclua ao menos um item no orçamento.");
  return valor.map((item: Record<string, unknown>) => {
    const tipo = umDe(item?.tipo, ["peca", "mao_de_obra"] as const, "Tipo do item");
    return {
      tipo,
      peca_id: tipo === "peca" ? texto(String(item.peca_id ?? ""), "a peça do item")! : null,
      descricao: texto(item.descricao, "a descrição do item")!,
      quantidade: numero(item.quantidade, "a quantidade do item", { minimo: 0.01 })!,
      valor_unitario: numero(item.valor_unitario, "o valor do item")!,
    };
  });
}

export const orcamentosController = {
  async registrarDiagnostico(request: Request, response: Response) {
    const body = request.body ?? {};
    const diagnostico = await orcamentosService.registrarDiagnostico(String(request.params.id), eu(request).id, {
      problemas: texto(body.problemas, "os problemas encontrados")!,
      recomendacoes: texto(body.recomendacoes, "as recomendações", false),
      km: numero(body.km_registrado, "a quilometragem", { obrigatorio: false, inteiro: true }),
    });
    return response.status(201).json(diagnostico);
  },

  async criar(request: Request, response: Response) {
    const body = request.body ?? {};
    const validade = texto(body.validade, "a validade", false);
    if (validade && !/^\d{4}-\d{2}-\d{2}$/.test(validade)) throw falha(400, "Validade inválida.");
    const orcamento = await orcamentosService.criar({
      diagnosticoId: texto(String(body.diagnostico_id ?? ""), "o diagnóstico")!,
      criadoPor: eu(request).id,
      validade,
      observacoes: texto(body.observacoes, "as observações", false),
      itens: lerItens(body.itens),
    });
    return response.status(201).json(orcamento);
  },

  async listar(request: Request, response: Response) {
    const status = request.query.status ? umDe(request.query.status, ["pendente", "aprovado", "recusado", "cancelado"] as const, "Status") : null;
    return response.json(await orcamentosService.listar({ dono: dono(request), status }));
  },

  async buscar(request: Request, response: Response) {
    return response.json(await orcamentosService.buscar(String(request.params.id), dono(request)));
  },

  async responder(request: Request, response: Response) {
    const resposta = umDe(request.body?.resposta, ["aprovado", "recusado"] as const, "Resposta");
    return response.json(await orcamentosService.responder(String(request.params.id), eu(request).id, resposta));
  },

  async cancelar(request: Request, response: Response) {
    return response.json(await orcamentosService.cancelar(String(request.params.id)));
  },
};
