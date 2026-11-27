import { useEffect, useRef } from "react";
import type { Pedido } from "../lib/confirmar";

export function Dialogo({ pedido, fechar }: { pedido: Pedido; fechar: (ok: boolean) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const voltar = useRef<HTMLButtonElement>(null);
  const ok = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    // foco depois de abrir: Enter confirma; em ação perigosa, Enter volta
    (pedido.perigo ? voltar : ok).current?.focus();
  }, [pedido.perigo]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirmar-titulo"
      onCancel={(e) => { e.preventDefault(); fechar(false); }} // Esc
      onClick={(e) => e.target === ref.current && fechar(false)} // clique fora
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-white p-0 shadow-2xl backdrop:bg-slate-900/50 backdrop:backdrop-blur-sm"
    >
      <div className="p-6">
        <div className="flex gap-4">
          <span aria-hidden="true" className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-bold ${pedido.perigo ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"}`}>
            {pedido.perigo ? "!" : "✓"}
          </span>
          <div>
            <h2 id="confirmar-titulo" className="text-lg font-semibold text-slate-900">{pedido.titulo}</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">{pedido.mensagem}</p>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-3 rounded-b-2xl bg-slate-50 px-6 py-4">
        <button ref={voltar} type="button" onClick={() => fechar(false)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
          Voltar
        </button>
        <button ref={ok} type="button" onClick={() => fechar(true)} className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition ${pedido.perigo ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}`}>
          {pedido.confirmar ?? "Confirmar"}
        </button>
      </div>
    </dialog>
  );
}
