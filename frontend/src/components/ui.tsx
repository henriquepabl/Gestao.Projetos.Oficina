import type { ReactNode } from "react";
import { rotulo } from "../lib/util";

// Peças visuais e utilitários compartilhados pelas telas do painel/portal.

const CORES: Record<string, string> = {
  solicitado: "bg-amber-100 text-amber-800", pendente: "bg-amber-100 text-amber-800", aguardando_peca: "bg-amber-100 text-amber-800",
  confirmado: "bg-blue-100 text-blue-800", aberta: "bg-blue-100 text-blue-800", em_atendimento: "bg-indigo-100 text-indigo-800", em_execucao: "bg-indigo-100 text-indigo-800",
  concluido: "bg-green-100 text-green-800", concluida: "bg-green-100 text-green-800", aprovado: "bg-green-100 text-green-800", pago: "bg-green-100 text-green-800", entregue: "bg-green-100 text-green-800",
  cancelado: "bg-slate-200 text-slate-700", cancelada: "bg-slate-200 text-slate-700", recusado: "bg-red-100 text-red-800",
};
export function Status({ valor }: { valor: string }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${CORES[valor] ?? "bg-slate-100 text-slate-700"}`}>{rotulo(valor)}</span>;
}

export function Pagina({ titulo, descricao, acoes, children }: { titulo: string; descricao?: string; acoes?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">{titulo}</h2>
          {descricao && <p className="mt-1 text-slate-600">{descricao}</p>}
        </div>
        {acoes}
      </header>
      {children}
    </section>
  );
}

export function Cartao({ titulo, children, className = "" }: { titulo?: string; children: ReactNode; className?: string }) {
  return (
    <article className={`rounded-xl bg-white p-5 shadow-sm ${className}`}>
      {titulo && <h3 className="mb-4 text-lg font-semibold text-slate-900">{titulo}</h3>}
      {children}
    </article>
  );
}

export function Campo({ rotulo: texto, children }: { rotulo: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
      {texto}
      {children}
    </label>
  );
}

export function Aviso({ mensagem, tipo = "erro" }: { mensagem: string; tipo?: "erro" | "ok" }) {
  if (!mensagem) return null;
  const cor = tipo === "erro" ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-800";
  return <div role={tipo === "erro" ? "alert" : "status"} className={`rounded-lg border px-4 py-3 text-sm ${cor}`}>{mensagem}</div>;
}

export function Tabela({ colunas, vazio = "Nenhum registro encontrado.", children }: { colunas: string[]; vazio?: string; children: ReactNode[] }) {
  return (
    <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>{colunas.map((coluna) => <th key={coluna} className="px-4 py-3 font-semibold">{coluna}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {children.length ? children : <tr><td colSpan={colunas.length} className="px-4 py-6 text-center text-slate-500">{vazio}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
