import { useCallback, useEffect, useState } from "react";

export const estilo = {
  input: "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100",
  botao: "rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50",
  botaoSecundario: "rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50",
  botaoPerigo: "rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50",
  link: "font-medium text-blue-600 hover:underline",
};

const ROTULOS: Record<string, string> = {
  solicitado: "Solicitado", confirmado: "Confirmado", em_atendimento: "Em atendimento", concluido: "Concluído",
  cancelado: "Cancelado", recusado: "Recusado", pendente: "Pendente", aprovado: "Aprovado", pago: "Pago",
  aberta: "Aberta", em_execucao: "Em execução", aguardando_peca: "Aguardando peça", concluida: "Concluída",
  entregue: "Entregue", cancelada: "Cancelada", peca: "Peça", mao_de_obra: "Mão de obra",
  dinheiro: "Dinheiro", pix: "Pix", cartao_debito: "Cartão de débito", cartao_credito: "Cartão de crédito",
  boleto: "Boleto", transferencia: "Transferência", client: "Cliente", employee: "Funcionário", admin: "Administrador",
  entrada: "Entrada", saida: "Saída",
};
export const rotulo = (valor: string | null | undefined) => (valor ? (ROTULOS[valor] ?? valor) : "—");

export const moeda = (valor: number | string) => Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const dataHora = (valor: string | null | undefined) => (valor ? new Date(valor).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—");
export const data = (valor: string | null | undefined) => (valor ? new Date(valor).toLocaleDateString("pt-BR", { timeZone: valor.length === 10 ? "UTC" : undefined }) : "—");
export const hojeISO = () => new Date().toLocaleDateString("sv-SE"); // AAAA-MM-DD no fuso local

export const celula = "px-4 py-3 align-top";

/** Busca dados da API; `recarregar()` repete a busca depois de uma alteração. */
export function useCarregar<T>(buscar: () => Promise<T>, deps: unknown[]) {
  const [dados, setDados] = useState<T | null>(null);
  const [erro, setErro] = useState("");
  const [versao, setVersao] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const buscarMemo = useCallback(buscar, deps);
  useEffect(() => {
    let ativo = true;
    setErro("");
    buscarMemo()
      .then((resultado) => ativo && setDados(resultado))
      .catch((error: Error) => ativo && setErro(error.message));
    return () => {
      ativo = false;
    };
  }, [buscarMemo, versao]);
  return { dados, erro, recarregar: () => setVersao((v) => v + 1) };
}

/** Executa uma ação (POST/PATCH) controlando "enviando" e a mensagem de erro. */
export function useAcao() {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  async function executar(acao: () => Promise<unknown>) {
    setEnviando(true);
    setErro("");
    try {
      await acao();
      return true;
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro inesperado.");
      return false;
    } finally {
      setEnviando(false);
    }
  }
  return { enviando, erro, setErro, executar };
}

/** Lê um <form> como objeto de strings (campos vazios viram undefined). */
export function lerForm(form: HTMLFormElement): Record<string, string | undefined> {
  return Object.fromEntries([...new FormData(form).entries()].map(([chave, valor]) => [chave, String(valor).trim() || undefined]));
}
