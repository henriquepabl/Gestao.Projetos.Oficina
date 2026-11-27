import type { Request, Response } from "express";
import { falha } from "../http";
import { relatoriosService } from "../services/relatorios.service";

const DATA = /^\d{4}-\d{2}-\d{2}$/;

export const relatoriosController = {
  async dashboard(_request: Request, response: Response) {
    return response.json(await relatoriosService.dashboard());
  },

  async relatorio(request: Request, response: Response) {
    const hoje = new Date().toISOString().slice(0, 10);
    const de = String(request.query.de ?? `${hoje.slice(0, 8)}01`);
    const ate = String(request.query.ate ?? hoje);
    if (!DATA.test(de) || !DATA.test(ate) || de > ate) throw falha(400, "Período inválido.");
    return response.json(await relatoriosService.relatorio(de, ate));
  },
};
