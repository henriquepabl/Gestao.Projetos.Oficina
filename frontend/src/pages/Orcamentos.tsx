import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Aviso, Campo, Cartao, Pagina, Status } from "../components/ui";
import { data, estilo, lerForm, moeda, rotulo, useAcao, useCarregar } from "../lib/util";
import { api, authSession } from "../services/auth";
import type { Peca } from "./Estoque";
import { useConfirmar } from "../lib/confirmar";

type Item = { id?: string; tipo: "peca" | "mao_de_obra"; peca_id?: string | null; descricao: string; quantidade: number; valor_unitario: number; subtotal?: number };
type Orcamento = {
  id: string; status: string; validade: string | null; observacoes: string | null; criado_em: string; total: number;
  problemas: string; recomendacoes: string | null; mecanico_nome: string; cliente_nome: string;
  marca: string; modelo: string; placa: string; os_id: string | null; itens?: Item[];
};

function Itens({ itens }: { itens: Item[] }) {
  return (
    <ul className="space-y-1 text-sm">
      {itens.map((item, i) => (
        <li key={item.id ?? i} className="flex justify-between gap-4 border-b border-slate-100 py-1">
          <span>{item.descricao} <span className="text-slate-500">({rotulo(item.tipo)} · {item.quantidade} × {moeda(item.valor_unitario)})</span></span>
          <span>{moeda(item.quantidade * item.valor_unitario)}</span>
        </li>
      ))}
    </ul>
  );
}

export function Orcamentos() {
  const ehCliente = authSession.usuario()?.role === "client";
  const [status, setStatus] = useState(ehCliente ? "" : "pendente");
  const lista = useCarregar(() => api.get<Orcamento[]>(`orcamentos?status=${status}`), [status]);
  const [abertos, setAbertos] = useState<Record<string, Item[]>>({});
  const acao = useAcao();
  const { confirmar, dialogo } = useConfirmar();

  async function alternar(id: string) {
    if (abertos[id]) return setAbertos((atual) => Object.fromEntries(Object.entries(atual).filter(([chave]) => chave !== id)));
    await acao.executar(async () => {
      const detalhe = await api.get<Orcamento>(`orcamentos/${id}`);
      setAbertos((atual) => ({ ...atual, [id]: detalhe.itens ?? [] }));
    });
  }

  async function responder(o: Orcamento, resposta: "aprovado" | "recusado") {
    const aprovar = resposta === "aprovado";
    const ok = await confirmar(aprovar
      ? { titulo: `Aprovar orçamento de ${moeda(o.total)}?`, mensagem: `Ao aprovar, a oficina abre a ordem de serviço para o ${o.marca} ${o.modelo} e começa o trabalho.`, confirmar: "Aprovar orçamento" }
      : { titulo: "Recusar este orçamento?", mensagem: "O serviço não será feito. Se mudar de ideia, peça um novo orçamento à oficina.", confirmar: "Recusar orçamento", perigo: true });
    if (ok && (await acao.executar(() => api.patch(`orcamentos/${o.id}/resposta`, { resposta })))) lista.recarregar();
  }

  async function cancelar(o: Orcamento) {
    const ok = await confirmar({ titulo: `Cancelar o orçamento #${o.id}?`, mensagem: `O cliente ${o.cliente_nome} não poderá mais aprová-lo. Para seguir, crie um novo orçamento.`, confirmar: "Cancelar orçamento", perigo: true });
    if (ok && (await acao.executar(() => api.patch(`orcamentos/${o.id}/cancelar`, {})))) lista.recarregar();
  }

  return (
    <Pagina titulo="Orçamentos" descricao={ehCliente ? "Consulte e aprove os orçamentos dos seus veículos." : "Orçamentos com peças, mão de obra e aprovação do cliente (RF05). Crie um a partir de um diagnóstico em Agendamentos."}>
      <Campo rotulo="Situação">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${estilo.input} max-w-xs`}>
          <option value="">Todas</option>
          {["pendente", "aprovado", "recusado", "cancelado"].map((s) => <option key={s} value={s}>{rotulo(s)}</option>)}
        </select>
      </Campo>
      {dialogo}
      <Aviso mensagem={lista.erro || acao.erro} />
      {lista.dados?.length === 0 && <Cartao>Nenhum orçamento encontrado.</Cartao>}
      {(lista.dados ?? []).map((o) => (
        <Cartao key={o.id}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-lg font-semibold">Orçamento #{o.id} · {o.marca} {o.modelo} ({o.placa})</p>
              <p className="text-sm text-slate-600">
                {!ehCliente && `${o.cliente_nome} · `}Emitido em {data(o.criado_em)}{o.validade && ` · válido até ${data(o.validade)}`}
              </p>
              <p className="mt-2 text-sm"><strong>Diagnóstico ({o.mecanico_nome}):</strong> {o.problemas}</p>
              {o.recomendacoes && <p className="text-sm"><strong>Recomendações:</strong> {o.recomendacoes}</p>}
              {o.observacoes && <p className="text-sm"><strong>Observações:</strong> {o.observacoes}</p>}
            </div>
            <div className="text-right">
              <Status valor={o.status} />
              <p className="mt-2 text-2xl font-bold text-slate-900">{moeda(o.total)}</p>
            </div>
          </div>
          {abertos[o.id] && <div className="mt-4"><Itens itens={abertos[o.id]} /></div>}
          <div className="mt-4 flex flex-wrap gap-2">
            <button className={estilo.botaoSecundario} onClick={() => alternar(o.id)}>{abertos[o.id] ? "Ocultar itens" : "Ver itens"}</button>
            {ehCliente && o.status === "pendente" && <>
              <button className={estilo.botao} disabled={acao.enviando} onClick={() => responder(o, "aprovado")}>Aprovar</button>
              <button className={estilo.botaoPerigo} disabled={acao.enviando} onClick={() => responder(o, "recusado")}>Recusar</button>
            </>}
            {!ehCliente && o.status === "pendente" && <button className={estilo.botaoPerigo} disabled={acao.enviando} onClick={() => cancelar(o)}>Cancelar</button>}
            {o.os_id && <Link className={estilo.botaoSecundario} to={`/ordens-servico/${o.os_id}`}>Ver ordem de serviço #{o.os_id}</Link>}
          </div>
        </Cartao>
      ))}
    </Pagina>
  );
}

const itemVazio = (): Item => ({ tipo: "mao_de_obra", descricao: "", quantidade: 1, valor_unitario: 0 });

export function NovoOrcamento() {
  const [params] = useSearchParams();
  const diagnosticoId = params.get("diagnostico");
  const navigate = useNavigate();
  const pecas = useCarregar(() => api.get<Peca[]>("pecas"), []);
  const [itens, setItens] = useState<Item[]>([itemVazio()]);
  const acao = useAcao();
  const total = itens.reduce((soma, item) => soma + item.quantidade * item.valor_unitario, 0);

  function alterar(indice: number, mudanca: Partial<Item>) {
    setItens((atual) => atual.map((item, i) => (i === indice ? { ...item, ...mudanca } : item)));
  }

  function escolherPeca(indice: number, pecaId: string) {
    const peca = pecas.dados?.find((p) => p.id === pecaId);
    alterar(indice, { peca_id: pecaId, descricao: peca?.nome ?? "", valor_unitario: peca?.preco_venda ?? 0 });
  }

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const campos = lerForm(event.currentTarget);
    const ok = await acao.executar(() => api.post("orcamentos", { diagnostico_id: diagnosticoId, validade: campos.validade, observacoes: campos.observacoes, itens }));
    if (ok) navigate("/orcamentos");
  }

  if (!diagnosticoId) return <Pagina titulo="Novo orçamento"><Aviso mensagem="Abra esta tela pelo botão “Criar orçamento” em Agendamentos." /></Pagina>;

  return (
    <Pagina titulo="Novo orçamento" descricao={`A partir do diagnóstico #${diagnosticoId}.`}>
      <form onSubmit={salvar} className="space-y-4">
        <Cartao titulo="Itens">
          <div className="space-y-3">
            {itens.map((item, i) => (
              <div key={i} className="grid items-end gap-3 md:grid-cols-[150px_1fr_100px_140px_auto]">
                <Campo rotulo="Tipo">
                  <select value={item.tipo} className={estilo.input} onChange={(e) => alterar(i, { tipo: e.target.value as Item["tipo"], peca_id: null })}>
                    <option value="mao_de_obra">Mão de obra</option>
                    <option value="peca">Peça</option>
                  </select>
                </Campo>
                {item.tipo === "peca" ? (
                  <Campo rotulo="Peça">
                    <select required value={item.peca_id ?? ""} className={estilo.input} onChange={(e) => escolherPeca(i, e.target.value)}>
                      <option value="">Selecione…</option>
                      {(pecas.dados ?? []).filter((p) => p.ativo).map((p) => <option key={p.id} value={p.id}>{p.codigo} — {p.nome} (estoque {p.quantidade})</option>)}
                    </select>
                  </Campo>
                ) : (
                  <Campo rotulo="Serviço"><input required value={item.descricao} className={estilo.input} onChange={(e) => alterar(i, { descricao: e.target.value })} /></Campo>
                )}
                <Campo rotulo={item.tipo === "peca" ? "Qtd." : "Horas"}>
                  <input type="number" min={0.01} step="any" required value={item.quantidade} className={estilo.input} onChange={(e) => alterar(i, { quantidade: Number(e.target.value) })} />
                </Campo>
                <Campo rotulo="Valor unitário (R$)">
                  <input type="number" min={0} step="0.01" required value={item.valor_unitario} className={estilo.input} onChange={(e) => alterar(i, { valor_unitario: Number(e.target.value) })} />
                </Campo>
                <button type="button" className={estilo.botaoPerigo} disabled={itens.length === 1} onClick={() => setItens(itens.filter((_, j) => j !== i))}>Remover</button>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between">
            <button type="button" className={estilo.botaoSecundario} onClick={() => setItens([...itens, itemVazio()])}>Adicionar item</button>
            <p className="text-xl font-bold">Total {moeda(total)}</p>
          </div>
        </Cartao>
        <Cartao>
          <div className="grid gap-4 md:grid-cols-[200px_1fr]">
            <Campo rotulo="Válido até"><input type="date" name="validade" className={estilo.input} /></Campo>
            <Campo rotulo="Observações"><input name="observacoes" className={estilo.input} /></Campo>
          </div>
        </Cartao>
        <Aviso mensagem={acao.erro || pecas.erro} />
        <button className={estilo.botao} disabled={acao.enviando}>Enviar orçamento ao cliente</button>
      </form>
    </Pagina>
  );
}
