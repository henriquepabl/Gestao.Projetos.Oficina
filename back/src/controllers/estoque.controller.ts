import type { Request, Response } from "express";
import { falha, numero, texto, umDe } from "../http";
import { eu } from "../middlewares/auth";
import { estoqueService, type DadosPeca } from "../services/estoque.service";

function lerPeca(body: Record<string, unknown>, obrigatorio: boolean): DadosPeca {
  if (body.ativo !== undefined && typeof body.ativo !== "boolean") throw falha(400, "Ativo inválido.");
  return {
    codigo: texto(body.codigo, "o código", obrigatorio),
    nome: texto(body.nome, "o nome", obrigatorio),
    preco_venda: numero(body.preco_venda, "o preço de venda", { obrigatorio }),
    estoque_minimo: numero(body.estoque_minimo, "o estoque mínimo", { obrigatorio: false, inteiro: true }),
    ativo: (body.ativo as boolean | undefined) ?? null,
  };
}

export const estoqueController = {
  async listar(request: Request, response: Response) {
    return response.json(
      await estoqueService.listar({ busca: request.query.busca ? String(request.query.busca) : null, abaixoMinimo: request.query.abaixo_minimo === "true" }),
    );
  },

  async criar(request: Request, response: Response) {
    const { ativo: _ativo, ...dados } = lerPeca(request.body ?? {}, true);
    return response.status(201).json(await estoqueService.criar(dados as Required<typeof dados>));
  },

  async atualizar(request: Request, response: Response) {
    return response.json(await estoqueService.atualizar(String(request.params.id), lerPeca(request.body ?? {}, false)));
  },

  async movimentar(request: Request, response: Response) {
    const body = request.body ?? {};
    const peca = await estoqueService.movimentar({
      pecaId: String(request.params.id),
      tipo: umDe(body.tipo, ["entrada", "saida"] as const, "Tipo"),
      quantidade: numero(body.quantidade, "a quantidade", { inteiro: true, minimo: 1 })!,
      osId: null,
      motivo: texto(body.motivo, "o motivo", false),
      usuarioId: eu(request).id,
    });
    return response.status(201).json(peca);
  },

  async movimentacoes(request: Request, response: Response) {
    return response.json(await estoqueService.movimentacoes(String(request.params.id)));
  },
};
