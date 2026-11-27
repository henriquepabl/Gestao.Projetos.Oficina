// Regras de negócio puras (sem banco), cobertas por test/regras.test.ts.

/** Quantos atendimentos a oficina comporta ao mesmo tempo (boxes/elevadores). */
export const CAPACIDADE_OFICINA = 3;
export const FUSO_OFICINA = "America/Sao_Paulo";

export const STATUS_AGENDAMENTO = ["solicitado", "confirmado", "em_atendimento", "concluido", "cancelado", "recusado"] as const;
export const STATUS_OS = ["aberta", "em_execucao", "aguardando_peca", "concluida", "entregue", "cancelada"] as const;
export const FORMAS_PAGAMENTO = ["dinheiro", "pix", "cartao_debito", "cartao_credito", "boleto", "transferencia"] as const;

const TRANSICOES_AGENDAMENTO: Record<string, string[]> = {
  solicitado: ["confirmado", "recusado", "cancelado"],
  confirmado: ["em_atendimento", "cancelado"],
  em_atendimento: ["concluido"],
};

// Atalhos permitidos: de qualquer etapa em aberto dá para concluir ou já entregar (fechar) a OS.
const TRANSICOES_OS: Record<string, string[]> = {
  aberta: ["em_execucao", "concluida", "entregue", "cancelada"],
  em_execucao: ["aguardando_peca", "concluida", "entregue", "cancelada"],
  aguardando_peca: ["em_execucao", "concluida", "entregue", "cancelada"],
  concluida: ["entregue"],
};

/** O cliente só pode cancelar um pedido ainda não iniciado; a equipe segue o fluxo completo. */
export function podeMudarAgendamento(de: string, para: string, ehEquipe: boolean): boolean {
  if (!ehEquipe) return para === "cancelado" && (de === "solicitado" || de === "confirmado");
  return TRANSICOES_AGENDAMENTO[de]?.includes(para) ?? false;
}

export function podeMudarOS(de: string, para: string): boolean {
  return TRANSICOES_OS[de]?.includes(para) ?? false;
}

/** OS ainda aceita peças e alterações de execução. */
export const osEmAberto = (status: string) => ["aberta", "em_execucao", "aguardando_peca"].includes(status);

const centavos = (valor: number) => Math.round(valor * 100) / 100 + 0; // + 0 evita -0

/** Acrescenta saldo e situação de pagamento a uma OS que já traz `total` e `total_pago`. */
export function comSaldo<T extends { total: number; total_pago: number }>(os: T) {
  const saldo = centavos(os.total - os.total_pago);
  return { ...os, saldo, situacao_pagamento: os.total > 0 && saldo <= 0 ? "pago" : "pendente" };
}
