import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Aviso, Campo, Cartao, Pagina, Status, Tabela } from "../components/ui";
import { celula, dataHora, estilo, hojeISO, lerForm, rotulo, useAcao, useCarregar } from "../lib/util";
import { api, authSession } from "../services/auth";
import type { Veiculo } from "./Veiculos";

type Agendamento = {
  id: string; cliente_nome: string; cliente_telefone: string; marca: string; modelo: string; placa: string; quilometragem: number;
  inicio: string; fim: string; descricao: string | null; status: string; atendente_nome: string | null;
  diagnostico_id: string | null; problemas: string | null; orcamento_status: string | null;
};
type Ocupacao = { capacidade: number; ocupados: { inicio: string; fim: string }[] };

const ACOES_EQUIPE: Record<string, { status: string; texto: string; perigo?: boolean }[]> = {
  solicitado: [{ status: "confirmado", texto: "Confirmar" }, { status: "recusado", texto: "Recusar", perigo: true }],
  confirmado: [{ status: "em_atendimento", texto: "Iniciar atendimento" }, { status: "cancelado", texto: "Cancelar", perigo: true }],
  em_atendimento: [{ status: "concluido", texto: "Concluir" }],
};

export function Agendamentos() {
  const ehCliente = authSession.usuario()?.role === "client";
  const [dia, setDia] = useState(ehCliente ? "" : hojeISO());
  const [status, setStatus] = useState("");
  const lista = useCarregar(() => api.get<Agendamento[]>(`agendamentos?data=${dia}&status=${status}`), [dia, status]);
  const veiculos = useCarregar(() => api.get<Veiculo[]>("veiculos"), []);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [diaForm, setDiaForm] = useState("");
  const ocupacao = useCarregar(() => (diaForm ? api.get<Ocupacao>(`agendamentos/ocupados?data=${diaForm}`) : Promise.resolve(null)), [diaForm]);
  const [diagnosticando, setDiagnosticando] = useState<string | null>(null);
  const acao = useAcao();

  async function criar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const campos = lerForm(form);
    const veiculo = veiculos.dados?.find((v) => v.id === campos.veiculo_id);
    const inicio = new Date(campos.inicio ?? "");
    const fim = new Date(inicio.getTime() + Number(campos.duracao ?? 1) * 3600_000);
    const ok = await acao.executar(() =>
      api.post("agendamentos", { veiculo_id: campos.veiculo_id, usuario_id: veiculo?.usuario_id, inicio: inicio.toISOString(), fim: fim.toISOString(), descricao: campos.descricao }),
    );
    if (ok) {
      form.reset();
      setMostrarForm(false);
      lista.recarregar();
    }
  }

  async function mudarStatus(id: string, novo: string) {
    if (await acao.executar(() => api.patch(`agendamentos/${id}/status`, { status: novo }))) lista.recarregar();
  }

  async function diagnosticar(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    if (await acao.executar(() => api.post(`agendamentos/${id}/diagnostico`, lerForm(event.currentTarget)))) {
      setDiagnosticando(null);
      lista.recarregar();
    }
  }

  return (
    <Pagina
      titulo={ehCliente ? "Meus agendamentos" : "Agendamentos"}
      descricao={ehCliente ? "Solicite um horário e acompanhe seus pedidos." : "Agenda de atendimentos e solicitações (RF03)."}
      acoes={<button className={estilo.botao} onClick={() => setMostrarForm(!mostrarForm)}>{mostrarForm ? "Fechar" : ehCliente ? "Solicitar agendamento" : "Novo agendamento"}</button>}
    >
      {mostrarForm && (
        <Cartao titulo={ehCliente ? "Solicitar agendamento" : "Novo agendamento (já confirmado)"}>
          {veiculos.dados?.length === 0 && <Aviso mensagem="Cadastre um veículo antes de agendar." />}
          <form onSubmit={criar} className="grid gap-4 md:grid-cols-3">
            <Campo rotulo="Veículo">
              <select name="veiculo_id" required className={estilo.input}>
                <option value="">Selecione…</option>
                {(veiculos.dados ?? []).map((v) => <option key={v.id} value={v.id}>{ehCliente ? "" : `${v.cliente_nome} — `}{v.marca} {v.modelo} ({v.placa})</option>)}
              </select>
            </Campo>
            <Campo rotulo="Data e hora">
              <input name="inicio" type="datetime-local" required className={estilo.input} onChange={(e) => setDiaForm(e.target.value.slice(0, 10))} />
            </Campo>
            <Campo rotulo="Duração estimada">
              <select name="duracao" className={estilo.input} defaultValue="1">
                {[1, 2, 3, 4, 8].map((h) => <option key={h} value={h}>{h} hora(s)</option>)}
              </select>
            </Campo>
            <div className="md:col-span-3">
              <Campo rotulo="O que está acontecendo com o veículo?"><textarea name="descricao" rows={2} className={estilo.input} /></Campo>
            </div>
            {ocupacao.dados && (
              <div className="md:col-span-3 text-sm text-slate-600">
                {ocupacao.dados.ocupados.length === 0
                  ? "Nenhum horário ocupado neste dia."
                  : <>Horários já reservados neste dia (a oficina atende até {ocupacao.dados.capacidade} veículos ao mesmo tempo):{" "}
                    {ocupacao.dados.ocupados.map((o) => `${dataHora(o.inicio).slice(-5)}–${dataHora(o.fim).slice(-5)}`).join(", ")}</>}
              </div>
            )}
            <div className="md:col-span-3 space-y-3">
              <Aviso mensagem={acao.erro} />
              <button className={estilo.botao} disabled={acao.enviando}>{ehCliente ? "Enviar solicitação" : "Agendar"}</button>
            </div>
          </form>
        </Cartao>
      )}

      <div className="flex flex-wrap gap-3">
        <Campo rotulo="Dia"><input type="date" value={dia} onChange={(e) => setDia(e.target.value)} className={estilo.input} /></Campo>
        <Campo rotulo="Situação">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={estilo.input}>
            <option value="">Todas</option>
            {["solicitado", "confirmado", "em_atendimento", "concluido", "cancelado", "recusado"].map((s) => <option key={s} value={s}>{rotulo(s)}</option>)}
          </select>
        </Campo>
        {dia && <button className={`${estilo.botaoSecundario} self-end`} onClick={() => setDia("")}>Ver todos os dias</button>}
      </div>
      <Aviso mensagem={lista.erro || (mostrarForm ? "" : acao.erro)} />

      <Tabela colunas={["Horário", ...(ehCliente ? [] : ["Cliente"]), "Veículo", "Descrição", "Situação", "Ações"]} vazio="Nenhum agendamento.">
        {(lista.dados ?? []).flatMap((a) => {
          const linhas = [
            <tr key={a.id}>
              <td className={celula}>{dataHora(a.inicio)}<br /><span className="text-xs text-slate-500">até {dataHora(a.fim).slice(-5)}</span></td>
              {!ehCliente && <td className={celula}>{a.cliente_nome}<br /><span className="text-xs text-slate-500">{a.cliente_telefone}</span></td>}
              <td className={celula}>{a.marca} {a.modelo}<br /><span className="text-xs text-slate-500">{a.placa}</span></td>
              <td className={celula}>{a.descricao ?? "—"}{a.problemas && <p className="mt-1 text-xs text-slate-600"><strong>Diagnóstico:</strong> {a.problemas}</p>}</td>
              <td className={celula}><Status valor={a.status} /></td>
              <td className={`${celula} space-x-2 space-y-2 whitespace-nowrap`}>
                {ehCliente
                  ? ["solicitado", "confirmado"].includes(a.status) && <button className={estilo.botaoPerigo} disabled={acao.enviando} onClick={() => mudarStatus(a.id, "cancelado")}>Cancelar</button>
                  : <>
                    {(ACOES_EQUIPE[a.status] ?? []).map((b) => (
                      <button key={b.status} className={b.perigo ? estilo.botaoPerigo : estilo.botaoSecundario} disabled={acao.enviando} onClick={() => mudarStatus(a.id, b.status)}>{b.texto}</button>
                    ))}
                    {!a.diagnostico_id && ["confirmado", "em_atendimento"].includes(a.status) && (
                      <button className={estilo.botaoSecundario} onClick={() => setDiagnosticando(diagnosticando === a.id ? null : a.id)}>Diagnóstico</button>
                    )}
                    {a.diagnostico_id && !["pendente", "aprovado"].includes(a.orcamento_status ?? "") && (
                      <Link className={estilo.botaoSecundario} to={`/orcamentos/novo?diagnostico=${a.diagnostico_id}`}>Criar orçamento</Link>
                    )}
                  </>}
              </td>
            </tr>,
          ];
          if (diagnosticando === a.id) {
            linhas.push(
              <tr key={`${a.id}-diag`}>
                <td colSpan={6} className="bg-slate-50 p-4">
                  <form onSubmit={(e) => diagnosticar(e, a.id)} className="grid gap-3 md:grid-cols-3">
                    <Campo rotulo="Problemas encontrados"><textarea name="problemas" required rows={2} className={estilo.input} /></Campo>
                    <Campo rotulo="Recomendações"><textarea name="recomendacoes" rows={2} className={estilo.input} /></Campo>
                    <Campo rotulo="Km no painel do veículo (opcional)">
                      <input name="km_registrado" type="number" min={a.quilometragem} placeholder={`Último registro: ${a.quilometragem.toLocaleString("pt-BR")} km`} className={estilo.input} />
                      <span className="text-xs font-normal text-slate-500">Se preencher, atualiza a quilometragem do {a.modelo} e fica no histórico deste serviço.</span>
                    </Campo>
                    <div className="md:col-span-3"><button className={estilo.botao} disabled={acao.enviando}>Registrar diagnóstico</button></div>
                  </form>
                </td>
              </tr>,
            );
          }
          return linhas;
        })}
      </Tabela>
    </Pagina>
  );
}
