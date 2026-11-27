import type { NextFunction, Request, Response } from "express";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const falha = (status: number, message: string) => new HttpError(status, message);

/** Lê um texto obrigatório (ou opcional) do corpo, já sem espaços nas pontas. */
export function texto(valor: unknown, campo: string, obrigatorio = true): string | null {
  if (valor === undefined || valor === null || valor === "") {
    if (obrigatorio) throw falha(400, `Informe ${campo}.`);
    return null;
  }
  if (typeof valor !== "string" || valor.trim() === "") throw falha(400, `${campo} inválido.`);
  return valor.trim();
}

/** Lê um número (aceita "12,5" ou 12.5); `inteiro` rejeita casas decimais. */
export function numero(valor: unknown, campo: string, { obrigatorio = true, inteiro = false, minimo = 0 } = {}): number | null {
  if (valor === undefined || valor === null || valor === "") {
    if (obrigatorio) throw falha(400, `Informe ${campo}.`);
    return null;
  }
  const n = typeof valor === "string" ? Number(valor.replace(",", ".")) : Number(valor);
  if (!Number.isFinite(n) || n < minimo || (inteiro && !Number.isInteger(n))) throw falha(400, `${campo} inválido.`);
  return n;
}

export function umDe<T extends string>(valor: unknown, opcoes: readonly T[], campo: string): T {
  if (!opcoes.includes(valor as T)) throw falha(400, `${campo} inválido.`);
  return valor as T;
}

/** Tratamento central de erros (Express 5 já encaminha rejeições de handlers async). */
export function tratarErros(error: unknown, _request: Request, response: Response, _next: NextFunction) {
  if (error instanceof HttpError) {
    return response.status(error.status).json({ status: "error", message: error.message });
  }
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  if (code === "23505") return response.status(409).json({ status: "error", message: "Registro já cadastrado (valor repetido)." });
  if (code === "23503") return response.status(400).json({ status: "error", message: "Referência inválida: verifique os dados selecionados." });
  if (code === "23514") return response.status(400).json({ status: "error", message: "Valor fora das regras permitidas." });
  if (code === "22P02" || code === "22007" || code === "22008") return response.status(400).json({ status: "error", message: "Formato de dado inválido." });
  console.error(error);
  return response.status(500).json({ status: "error", message: "Erro interno do servidor." });
}
