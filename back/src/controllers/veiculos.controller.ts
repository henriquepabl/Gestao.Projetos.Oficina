import type { Request, Response } from "express";
import { falha, numero, texto } from "../http";
import { dono, ehEquipe, eu } from "../middlewares/auth";
import { veiculosService, type DadosVeiculo } from "../services/veiculos.service";

const ANO_MAXIMO = new Date().getFullYear() + 1;

function lerVeiculo(body: Record<string, unknown>, obrigatorio: boolean): DadosVeiculo {
  const ano = numero(body.ano, "o ano", { obrigatorio, inteiro: true, minimo: 1886 });
  if (ano !== null && ano > ANO_MAXIMO) throw falha(400, "ano inválido.");
  const placa = texto(body.placa, "a placa", obrigatorio)?.replace(/[\s-]/g, "").toUpperCase() ?? null;
  if (placa !== null && !/^[A-Z0-9]{5,10}$/.test(placa)) throw falha(400, "Placa inválida.");
  return {
    marca: texto(body.marca, "a marca", obrigatorio),
    modelo: texto(body.modelo, "o modelo", obrigatorio),
    ano,
    placa,
    quilometragem: numero(body.quilometragem, "a quilometragem", { obrigatorio: false, inteiro: true }),
  };
}

export const veiculosController = {
  async listar(request: Request, response: Response) {
    const usuarioId = request.query.usuario_id ? String(request.query.usuario_id) : null;
    return response.json(await veiculosService.listar(dono(request), usuarioId));
  },

  async buscar(request: Request, response: Response) {
    return response.json(await veiculosService.buscar(String(request.params.id), dono(request)));
  },

  async criar(request: Request, response: Response) {
    const body = request.body ?? {};
    // cliente sempre cadastra para si; a equipe informa de quem é o veículo
    const usuarioId = ehEquipe(request) ? texto(String(body.usuario_id ?? ""), "o cliente", true)! : eu(request).id;
    const veiculo = await veiculosService.criar(usuarioId, lerVeiculo(body, true) as Required<DadosVeiculo>);
    return response.status(201).json(veiculo);
  },

  async atualizar(request: Request, response: Response) {
    const veiculo = await veiculosService.atualizar(String(request.params.id), dono(request), lerVeiculo(request.body ?? {}, false));
    return response.json(veiculo);
  },

  async historico(request: Request, response: Response) {
    return response.json(await veiculosService.historico(String(request.params.id), dono(request)));
  },
};
