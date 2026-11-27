import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { Aviso, Campo, Cartao, Pagina, Status, Tabela } from "../components/ui";
import { celula, data, dataHora, estilo, lerForm, moeda, rotulo, useAcao, useCarregar } from "../lib/util";
import { api, authSession } from "../services/auth";
import type { Peca } from "./Estoque";
import { useConfirmar } from "../lib/confirmar";

type OS = {
  id: string; status: string; observacoes: string | null; aberta_em: string; concluida_em: string | null; orcamento_id: string;
  mecanico_id: string | null; mecanico_nome: string | null; veiculo_id: string; marca: string; modelo: string; placa: string;
  cliente_nome: string; cliente_telefone: string; problemas: string; recomendacoes: string | null;
  total: number; total_pago: number; saldo: number; situacao_pagamento: string;
};
type DetalheOS = OS & {
  itens: { id: string; tipo: string; descricao: string; quantidade: number; valor_unitario: number; subtotal: number }[];
  pecas_usadas: { id: string; codigo: string; nome: string; quantidade: number; criado_em: string }[];
  pagamentos: { id: string; valor: number; forma: string; status: string; pago_em: string | null; observacao: string | null }[];
};

const STATUS_OS = ["aberta", "em_execucao", "aguardando_peca", "concluida", "entregue", "cancelada"];
type Acao = { para: string; texto: string };
// Botão principal (próximo passo natural) e atalhos de cada etapa.
const PRINCIPAL: Record<string, Acao> = {
  aberta: { para: "em_execucao", texto: "Iniciar serviço" },
  em_execucao: { para: "concluida", texto: "Concluir serviço" },
  aguardando_peca: { para: "em_execucao", texto: "Retomar serviço" },
  concluida: { para: "entregue", texto: "Entregar ao cliente" },
};
const ATALHOS: Record<string, Acao[]> = {
  aberta: [{ para: "entregue", texto: "Finalizar e entregar" }],
  em_execucao: [{ para: "aguardando_peca", texto: "Aguardando peça" }, { para: "entregue", texto: "Finalizar e entregar" }],
  aguardando_peca: [{ para: "concluida", texto: "Concluir serviço" }, { para: "entregue", texto: "Finalizar e entregar" }],
};
const ETAPAS = ["aberta", "em_execucao", "concluida", "entregue"];

function Etapas({ status }: { status: string }) {
  if (status === "cancelada") return <p className="text-sm font-medium text-slate-700">Esta OS foi cancelada.</p>;
  const atual = ETAPAS.indexOf(status === "aguardando_peca" ? "em_execucao" : status);
  const feito = (i: number) => i < atual || status === "entregue";
  return (
    <ol className="flex items-center gap-2">
      {ETAPAS.map((etapa, i) => (
        <li key={etapa} className="flex flex-1 items-center gap-2 last:flex-none">
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${feito(i) ? "bg-green-600 text-white" : i === atual ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"}`}>
            {feito(i) ? "✓" : i + 1}
          </span>
          <span className={`whitespace-nowrap text-xs font-medium ${i === atual ? "text-slate-900" : "text-slate-500"}`}>
            {i === atual && status === "aguardando_peca" ? "Aguardando peça" : rotulo(etapa)}
          </span>
          {i < ETAPAS.length - 1 && <span className={`h-0.5 flex-1 ${i < atual ? "bg-green-600" : "bg-slate-200"}`} />}
        </li>
      ))}
    </ol>
  );
}

const FORMAS = ["pix", "dinheiro", "cartao_debito", "cartao_credito", "boleto", "transferencia"];

export function OrdensServico() {
  const ehCliente = authSession.usuario()?.role === "client";
  const [status, setStatus] = useState("");
  const lista = useCarregar(() => api.get<OS[]>(`ordens-servico?status=${status}`), [status]);

  return (
    <Pagina titulo={ehCliente ? "Meus serviços" : "Ordens de serviço"} descricao={ehCliente ? "Acompanhe o andamento e a situação do pagamento." : "Abra uma OS para definir o mecânico, mudar o status, lançar peças e registrar pagamentos."}>
      <Campo rotulo="Situação">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${estilo.input} max-w-xs`}>
          <option value="">Todas</option>
          {STATUS_OS.map((s) => <option key={s} value={s}>{rotulo(s)}</option>)}
        </select>
      </Campo>
      <Aviso mensagem={lista.erro} />
      <Tabela colunas={["OS", ...(ehCliente ? [] : ["Cliente"]), "Veículo", "Mecânico", "Aberta em", "Situação", "Total", "Pagamento", ""]} vazio="Nenhuma ordem de serviço.">
        {(lista.dados ?? []).map((os) => (
          <tr key={os.id}>
            <td className={celula}><Link className={estilo.link} to={`/ordens-servico/${os.id}`}>#{os.id}</Link></td>
            {!ehCliente && <td className={celula}>{os.cliente_nome}</td>}
            <td className={celula}>{os.marca} {os.modelo}<br /><span className="text-xs text-slate-500">{os.placa}</span></td>
            <td className={celula}>{os.mecanico_nome ?? "—"}</td>
            <td className={celula}>{data(os.aberta_em)}</td>
            <td className={celula}><Status valor={os.status} /></td>
            <td className={celula}>{moeda(os.total)}</td>
            <td className={celula}><Status valor={os.situacao_pagamento} />{os.saldo > 0 && <p className="text-xs text-slate-500">falta {moeda(os.saldo)}</p>}</td>
            <td className={celula}><Link className={`${estilo.botaoSecundario} inline-block whitespace-nowrap`} to={`/ordens-servico/${os.id}`}>{ehCliente ? "Ver detalhes" : "Abrir OS"}</Link></td>
          </tr>
        ))}
      </Tabela>
    </Pagina>
  );
}

export function OrdemServico() {
  const { id } = useParams();
  const ehCliente = authSession.usuario()?.role === "client";
  const os = useCarregar(() => api.get<DetalheOS>(`ordens-servico/${id}`), [id]);
  const equipe = useCarregar(() => (ehCliente ? Promise.resolve([]) : api.get<{ id: string; nome: string }[]>("equipe")), [ehCliente]);
  const pecas = useCarregar(() => (ehCliente ? Promise.resolve([]) : api.get<Peca[]>("pecas")), [ehCliente]);
  const acao = useAcao();
  const { confirmar, dialogo } = useConfirmar();
  const d = os.dados;

  async function enviar(executar: () => Promise<unknown>, form?: HTMLFormElement) {
    if (await acao.executar(executar)) {
      form?.reset();
      os.recarregar();
      pecas.recarregar();
    }
  }
  const submeter = (caminho: string, extra: object = {}) => (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    enviar(() => api.post(caminho, { ...lerForm(form), ...extra }), form);
  };

  async function mudarStatus(para: string) {
    if (!d) return;
    const falta = Math.max(d.saldo, 0);
    if (para === "cancelada" && !(await confirmar({ titulo: `Cancelar a OS #${d.id}?`, mensagem: "A ordem de serviço será encerrada sem execução e não receberá mais peças nem pagamentos. Essa ação não pode ser desfeita.", confirmar: "Cancelar OS", perigo: true }))) return;
    if (para === "entregue" && !(await confirmar({
      titulo: `Finalizar e entregar o ${d.marca} ${d.modelo}?`,
      mensagem: falta > 0
        ? `Atenção: ainda faltam ${moeda(falta)} a receber. A OS será fechada como entregue e não poderá mais ser alterada.`
        : "O pagamento está completo. A OS será fechada como entregue e não poderá mais ser alterada.",
      confirmar: "Finalizar e entregar",
      perigo: falta > 0,
    }))) return;
    enviar(() => api.patch(`ordens-servico/${d.id}`, { status: para }));
  }

  async function cancelarPagamento(p: DetalheOS["pagamentos"][number]) {
    const ok = await confirmar({
      titulo: p.status === "pago" ? `Estornar pagamento de ${moeda(p.valor)}?` : `Cancelar pagamento pendente de ${moeda(p.valor)}?`,
      mensagem: "O lançamento fica no histórico como cancelado e deixa de contar no valor pago. Use para corrigir um registro feito por engano.",
      confirmar: p.status === "pago" ? "Estornar" : "Cancelar pagamento",
      perigo: true,
    });
    if (ok) enviar(() => api.patch(`pagamentos/${p.id}`, { status: "cancelado" }));
  }

  if (!d) return <Pagina titulo={`OS #${id}`}><Aviso mensagem={os.erro} /></Pagina>;
  const emAberto = ["aberta", "em_execucao", "aguardando_peca"].includes(d.status);
  // valor ainda sem nenhum lançamento (pago ou pendente)
  const aReceber = Math.round((d.total - d.pagamentos.filter((p) => p.status !== "cancelado").reduce((soma, p) => soma + p.valor, 0)) * 100) / 100;

  return (
    <Pagina titulo={`Ordem de serviço #${d.id}`} descricao={`${d.marca} ${d.modelo} · ${d.placa}${ehCliente ? "" : ` · ${d.cliente_nome} (${d.cliente_telefone})`}`} acoes={<Status valor={d.status} />}>
      {dialogo}
      <Cartao><Etapas status={d.status} /></Cartao>
      <Aviso mensagem={acao.erro} />
      <div className="grid gap-5 lg:grid-cols-2">
        <Cartao titulo="Serviço">
          <p className="text-sm"><strong>Problemas:</strong> {d.problemas}</p>
          {d.recomendacoes && <p className="text-sm"><strong>Recomendações:</strong> {d.recomendacoes}</p>}
          <p className="mt-2 text-sm text-slate-600">Aberta em {dataHora(d.aberta_em)}{d.concluida_em && ` · concluída em ${dataHora(d.concluida_em)}`}</p>
          <p className="text-sm text-slate-600">Mecânico responsável: {d.mecanico_nome ?? "não definido"}</p>
          {d.observacoes && <p className="mt-2 text-sm"><strong>Observações:</strong> {d.observacoes}</p>}
          <p className="mt-3 text-sm"><Link className={estilo.link} to={`/veiculos/${d.veiculo_id}`}>Histórico do veículo</Link></p>

          {!ehCliente && (
            <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
              <div className="flex flex-wrap gap-2">
                {PRINCIPAL[d.status] && (
                  <button className={estilo.botao} disabled={acao.enviando} onClick={() => mudarStatus(PRINCIPAL[d.status].para)}>{PRINCIPAL[d.status].texto}</button>
                )}
                {(ATALHOS[d.status] ?? []).map((a) => (
                  <button key={a.para} className={estilo.botaoSecundario} disabled={acao.enviando} onClick={() => mudarStatus(a.para)}>{a.texto}</button>
                ))}
                {emAberto && <button className={estilo.botaoPerigo} disabled={acao.enviando} onClick={() => mudarStatus("cancelada")}>Cancelar OS</button>}
              </div>
              <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); const f = e.currentTarget; enviar(() => api.patch(`ordens-servico/${d.id}`, lerForm(f))); }}>
                <Campo rotulo="Mecânico">
                  <select name="mecanico_id" defaultValue={d.mecanico_id ?? ""} className={estilo.input}>
                    <option value="">—</option>
                    {(equipe.dados ?? []).map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
                  </select>
                </Campo>
                <Campo rotulo="Observações"><input name="observacoes" defaultValue={d.observacoes ?? ""} className={estilo.input} /></Campo>
                <button className={estilo.botaoSecundario} disabled={acao.enviando}>Salvar</button>
              </form>
            </div>
          )}
        </Cartao>

        <Cartao titulo="Pagamento">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div><p className="text-xs text-slate-500">Total</p><p className="text-lg font-bold">{moeda(d.total)}</p></div>
            <div><p className="text-xs text-slate-500">Pago</p><p className="text-lg font-bold text-green-700">{moeda(d.total_pago)}</p></div>
            <div><p className="text-xs text-slate-500">Falta</p><p className="text-lg font-bold text-amber-700">{moeda(Math.max(d.saldo, 0))}</p></div>
          </div>
          <p className="mt-3 text-center"><Status valor={d.situacao_pagamento} /></p>
          <ul className="mt-4 space-y-2 text-sm">
            {d.pagamentos.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <span className={p.status === "cancelado" ? "text-slate-400 line-through" : ""}>{moeda(p.valor)} · {rotulo(p.forma)}{p.pago_em && ` · ${dataHora(p.pago_em)}`}{p.observacao && ` · ${p.observacao}`}</span>
                <span className="flex items-center gap-2">
                  <Status valor={p.status} />
                  {!ehCliente && p.status === "pendente" && <button className={estilo.botaoSecundario} disabled={acao.enviando} onClick={() => enviar(() => api.patch(`pagamentos/${p.id}`, { status: "pago" }))}>Marcar pago</button>}
                  {!ehCliente && p.status !== "cancelado" && <button className={estilo.botaoPerigo} disabled={acao.enviando} onClick={() => cancelarPagamento(p)}>{p.status === "pago" ? "Estornar" : "Cancelar"}</button>}
                </span>
              </li>
            ))}
          </ul>
          {!ehCliente && d.status !== "cancelada" && aReceber <= 0 && d.total > 0 && (
            <p className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-600">Todo o valor já foi lançado. Para corrigir um lançamento, use “Estornar”.</p>
          )}
          {!ehCliente && d.status !== "cancelada" && aReceber > 0 && (
            <form className="mt-4 grid gap-2 border-t border-slate-100 pt-4 md:grid-cols-2" onSubmit={(e) => {
              e.preventDefault();
              const f = e.currentTarget;
              const campos = lerForm(f);
              enviar(() => api.post(`ordens-servico/${d.id}/pagamentos`, { ...campos, pago: campos.pago === "sim" }), f);
            }}>
              <Campo rotulo="Valor (R$)"><input name="valor" type="number" step="0.01" min={0.01} required max={aReceber} defaultValue={aReceber} className={estilo.input} /></Campo>
              <Campo rotulo="Forma">
                <select name="forma" className={estilo.input}>{FORMAS.map((f) => <option key={f} value={f}>{rotulo(f)}</option>)}</select>
              </Campo>
              <Campo rotulo="Situação">
                <select name="pago" className={estilo.input}><option value="sim">Já recebido (pago)</option><option value="nao">A receber (pendente)</option></select>
              </Campo>
              <Campo rotulo="Observação"><input name="observacao" className={estilo.input} /></Campo>
              <div className="md:col-span-2"><button className={estilo.botao} disabled={acao.enviando}>Registrar pagamento</button></div>
            </form>
          )}
        </Cartao>
      </div>

      <Cartao titulo="Itens do orçamento aprovado">
        <Tabela colunas={["Item", "Tipo", "Qtd.", "Valor unit.", "Subtotal"]}>
          {d.itens.map((item) => (
            <tr key={item.id}>
              <td className={celula}>{item.descricao}</td>
              <td className={celula}>{rotulo(item.tipo)}</td>
              <td className={celula}>{item.quantidade}</td>
              <td className={celula}>{moeda(item.valor_unitario)}</td>
              <td className={celula}>{moeda(item.subtotal)}</td>
            </tr>
          ))}
        </Tabela>
      </Cartao>

      <Cartao titulo="Peças utilizadas (baixa no estoque)">
        <Tabela colunas={["Código", "Peça", "Qtd.", "Quando"]} vazio="Nenhuma peça lançada ainda.">
          {d.pecas_usadas.map((p) => (
            <tr key={p.id}>
              <td className={celula}>{p.codigo}</td>
              <td className={celula}>{p.nome}</td>
              <td className={celula}>{p.quantidade}</td>
              <td className={celula}>{dataHora(p.criado_em)}</td>
            </tr>
          ))}
        </Tabela>
        {!ehCliente && emAberto && (
          <form className="mt-4 flex flex-wrap items-end gap-2" onSubmit={submeter(`ordens-servico/${d.id}/pecas`)}>
            <Campo rotulo="Peça">
              <select name="peca_id" required className={estilo.input}>
                <option value="">Selecione…</option>
                {(pecas.dados ?? []).filter((p) => p.ativo).map((p) => <option key={p.id} value={p.id}>{p.codigo} — {p.nome} (estoque {p.quantidade})</option>)}
              </select>
            </Campo>
            <Campo rotulo="Quantidade"><input name="quantidade" type="number" min={1} defaultValue={1} required className={`${estilo.input} w-24`} /></Campo>
            <button className={estilo.botao} disabled={acao.enviando}>Lançar peça</button>
          </form>
        )}
      </Cartao>
    </Pagina>
  );
}
