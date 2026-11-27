import { useState, type FormEvent } from "react";
import { Aviso, Campo, Cartao, Pagina, Tabela } from "../components/ui";
import { celula, dataHora, estilo, lerForm, moeda, rotulo, useAcao, useCarregar } from "../lib/util";
import { api } from "../services/auth";

export type Peca = { id: string; codigo: string; nome: string; preco_venda: number; quantidade: number; estoque_minimo: number; ativo: boolean; abaixo_minimo: boolean };
type Movimento = { id: string; tipo: string; quantidade: number; os_id: string | null; motivo: string | null; criado_em: string; usuario_nome: string };

export function Estoque() {
  const [busca, setBusca] = useState("");
  const [soBaixo, setSoBaixo] = useState(false);
  const lista = useCarregar(() => api.get<Peca[]>(`pecas?busca=${encodeURIComponent(busca)}&abaixo_minimo=${soBaixo}`), [busca, soBaixo]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [selecionada, setSelecionada] = useState<Peca | null>(null);
  const movimentos = useCarregar(() => (selecionada ? api.get<Movimento[]>(`pecas/${selecionada.id}/movimentacoes`) : Promise.resolve([])), [selecionada?.id]);
  const acao = useAcao();

  async function criar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (await acao.executar(() => api.post("pecas", lerForm(form)))) {
      form.reset();
      setMostrarForm(false);
      lista.recarregar();
    }
  }

  async function movimentar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!selecionada) return;
    if (await acao.executar(() => api.post(`pecas/${selecionada.id}/movimentacoes`, lerForm(form)))) {
      form.reset();
      lista.recarregar();
      movimentos.recarregar();
    }
  }

  async function alternarAtivo(peca: Peca) {
    if (await acao.executar(() => api.patch(`pecas/${peca.id}`, { ativo: !peca.ativo }))) lista.recarregar();
  }

  return (
    <Pagina
      titulo="Estoque"
      descricao="Entrada, saída, saldo e reposição de peças (RF07)."
      acoes={<button className={estilo.botao} onClick={() => setMostrarForm(!mostrarForm)}>{mostrarForm ? "Fechar" : "Nova peça"}</button>}
    >
      {mostrarForm && (
        <Cartao titulo="Nova peça">
          <form onSubmit={criar} className="grid gap-4 md:grid-cols-4">
            <Campo rotulo="Código"><input name="codigo" required className={estilo.input} /></Campo>
            <Campo rotulo="Nome"><input name="nome" required className={estilo.input} /></Campo>
            <Campo rotulo="Preço de venda (R$)"><input name="preco_venda" type="number" min={0} step="0.01" required className={estilo.input} /></Campo>
            <Campo rotulo="Estoque mínimo"><input name="estoque_minimo" type="number" min={0} defaultValue={0} className={estilo.input} /></Campo>
            <p className="md:col-span-4 text-sm text-slate-500">O saldo começa em zero; registre a entrada depois de cadastrar.</p>
            <div className="md:col-span-4"><button className={estilo.botao} disabled={acao.enviando}>Cadastrar peça</button></div>
          </form>
        </Cartao>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <input className={`${estilo.input} max-w-sm`} placeholder="Buscar por nome ou código" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={soBaixo} onChange={(e) => setSoBaixo(e.target.checked)} /> Só peças para repor</label>
      </div>
      <Aviso mensagem={lista.erro || acao.erro} />

      {selecionada && (
        <Cartao titulo={`Movimentar: ${selecionada.codigo} — ${selecionada.nome}`}>
          <form onSubmit={movimentar} className="flex flex-wrap items-end gap-3">
            <Campo rotulo="Tipo">
              <select name="tipo" className={estilo.input}><option value="entrada">Entrada (compra/reposição)</option><option value="saida">Saída (perda/ajuste)</option></select>
            </Campo>
            <Campo rotulo="Quantidade"><input name="quantidade" type="number" min={1} required className={`${estilo.input} w-28`} /></Campo>
            <Campo rotulo="Motivo"><input name="motivo" className={estilo.input} placeholder="Ex.: NF 1234" /></Campo>
            <button className={estilo.botao} disabled={acao.enviando}>Registrar</button>
            <button type="button" className={estilo.botaoSecundario} onClick={() => setSelecionada(null)}>Fechar</button>
          </form>
          <ul className="mt-4 max-h-60 space-y-1 overflow-y-auto text-sm">
            {(movimentos.dados ?? []).map((m) => (
              <li key={m.id} className="flex justify-between border-b border-slate-100 py-1">
                <span>{rotulo(m.tipo)} de {m.quantidade}{m.os_id && ` (OS #${m.os_id})`}{m.motivo && ` · ${m.motivo}`}</span>
                <span className="text-slate-500">{m.usuario_nome} · {dataHora(m.criado_em)}</span>
              </li>
            ))}
          </ul>
        </Cartao>
      )}

      <Tabela colunas={["Código", "Peça", "Preço", "Saldo", "Mínimo", "Situação", "Ações"]} vazio="Nenhuma peça cadastrada.">
        {(lista.dados ?? []).map((p) => (
          <tr key={p.id} className={p.ativo ? "" : "opacity-50"}>
            <td className={celula}>{p.codigo}</td>
            <td className={celula}>{p.nome}</td>
            <td className={celula}>{moeda(p.preco_venda)}</td>
            <td className={`${celula} font-semibold`}>{p.quantidade}</td>
            <td className={celula}>{p.estoque_minimo}</td>
            <td className={celula}>{!p.ativo ? "Inativa" : p.abaixo_minimo ? <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">Repor</span> : "OK"}</td>
            <td className={`${celula} space-x-2 whitespace-nowrap`}>
              {p.ativo && <button className={estilo.botaoSecundario} onClick={() => setSelecionada(p)}>Movimentar</button>}
              <button className={estilo.botaoSecundario} disabled={acao.enviando} onClick={() => alternarAtivo(p)}>{p.ativo ? "Desativar" : "Reativar"}</button>
            </td>
          </tr>
        ))}
      </Tabela>
    </Pagina>
  );
}
