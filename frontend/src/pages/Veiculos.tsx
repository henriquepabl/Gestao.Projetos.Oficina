import { useState, type FormEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Aviso, Campo, Cartao, Pagina, Status, Tabela } from "../components/ui";
import { celula, data, estilo, lerForm, moeda, rotulo, useAcao, useCarregar } from "../lib/util";
import { api, authSession } from "../services/auth";
import type { Cliente } from "./Clientes";

const ANO_MAXIMO = new Date().getFullYear() + 1;

export type Veiculo = { id: string; usuario_id: string; cliente_nome: string; marca: string; modelo: string; ano: number; placa: string; quilometragem: number };

export function Veiculos() {
  const ehCliente = authSession.usuario()?.role === "client";
  const [params] = useSearchParams();
  const usuarioId = params.get("usuario_id") ?? "";
  const { dados, erro, recarregar } = useCarregar(() => api.get<Veiculo[]>(`veiculos?usuario_id=${usuarioId}`), [usuarioId]);
  const clientes = useCarregar(() => (ehCliente ? Promise.resolve([]) : api.get<Cliente[]>("clientes")), [ehCliente]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const acao = useAcao();

  async function criar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (await acao.executar(() => api.post("veiculos", lerForm(form)))) {
      form.reset();
      setMostrarForm(false);
      recarregar();
    }
  }

  return (
    <Pagina
      titulo={ehCliente ? "Meus veículos" : "Veículos"}
      descricao={usuarioId && dados?.[0] ? `Veículos de ${dados[0].cliente_nome}` : "Marca, modelo, ano, placa e quilometragem (RF02)."}
      acoes={<button className={estilo.botao} onClick={() => setMostrarForm(!mostrarForm)}>{mostrarForm ? "Fechar" : "Novo veículo"}</button>}
    >
      {mostrarForm && (
        <Cartao titulo="Novo veículo">
          <form onSubmit={criar} className="grid gap-4 md:grid-cols-3">
            {!ehCliente && (
              <Campo rotulo="Cliente">
                <select name="usuario_id" required defaultValue={usuarioId} className={estilo.input}>
                  <option value="">Selecione…</option>
                  {(clientes.dados ?? []).map((c) => <option key={c.id} value={c.id}>{c.nome} — {c.email}</option>)}
                </select>
              </Campo>
            )}
            <Campo rotulo="Marca"><input name="marca" required className={estilo.input} /></Campo>
            <Campo rotulo="Modelo"><input name="modelo" required className={estilo.input} /></Campo>
            <Campo rotulo="Ano"><input name="ano" type="number" min={1950} max={ANO_MAXIMO} required className={estilo.input} /></Campo>
            <Campo rotulo="Placa"><input name="placa" required placeholder="ABC1D23" className={estilo.input} /></Campo>
            <Campo rotulo="Quilometragem"><input name="quilometragem" type="number" min={0} className={estilo.input} /></Campo>
            <div className="md:col-span-3 space-y-3">
              <Aviso mensagem={acao.erro} />
              <button className={estilo.botao} disabled={acao.enviando}>Salvar veículo</button>
            </div>
          </form>
        </Cartao>
      )}

      <Aviso mensagem={erro} />
      <Tabela colunas={[...(ehCliente ? [] : ["Cliente"]), "Veículo", "Ano", "Placa", "Km", ""]} vazio="Nenhum veículo cadastrado.">
        {(dados ?? []).map((v) => (
          <tr key={v.id}>
            {!ehCliente && <td className={celula}>{v.cliente_nome}</td>}
            <td className={celula}>{v.marca} {v.modelo}</td>
            <td className={celula}>{v.ano}</td>
            <td className={celula}>{v.placa}</td>
            <td className={celula}>{v.quilometragem.toLocaleString("pt-BR")}</td>
            <td className={celula}><Link className={estilo.link} to={`/veiculos/${v.id}`}>Histórico</Link></td>
          </tr>
        ))}
      </Tabela>
    </Pagina>
  );
}

type Historico = {
  veiculo: Veiculo;
  servicos: { id: string; status: string; aberta_em: string; concluida_em: string; mecanico_nome: string | null; problemas: string; recomendacoes: string | null; km_registrado: number | null; total: number; itens: { descricao: string; tipo: string; quantidade: number; valor_unitario: number }[] }[];
};

export function VeiculoHistorico() {
  const { id } = useParams();
  const { dados, erro } = useCarregar(() => api.get<Historico>(`veiculos/${id}/historico`), [id]);
  const v = dados?.veiculo;

  return (
    <Pagina titulo={v ? `${v.marca} ${v.modelo} · ${v.placa}` : "Histórico do veículo"} descricao="Histórico de manutenção (RF09).">
      <Aviso mensagem={erro} />
      {v && <p className="text-sm text-slate-600">Cliente: {v.cliente_nome} · Ano {v.ano} · {v.quilometragem.toLocaleString("pt-BR")} km</p>}
      {dados && dados.servicos.length === 0 && <Cartao>Nenhum serviço concluído para este veículo ainda.</Cartao>}
      {dados?.servicos.map((s) => (
        <Cartao key={s.id}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <Link to={`/ordens-servico/${s.id}`} className={`${estilo.link} text-lg`}>OS #{s.id}</Link>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <span>Concluída em {data(s.concluida_em)}</span>
              <Status valor={s.status} />
            </div>
          </div>
          <p className="text-sm"><strong>Problemas:</strong> {s.problemas}</p>
          {s.recomendacoes && <p className="text-sm"><strong>Recomendações:</strong> {s.recomendacoes}</p>}
          <p className="mt-1 text-sm text-slate-600">Mecânico: {s.mecanico_nome ?? "—"}{s.km_registrado !== null && ` · ${s.km_registrado.toLocaleString("pt-BR")} km`}</p>
          <ul className="mt-3 space-y-1 text-sm">
            {s.itens.map((item, i) => (
              <li key={i} className="flex justify-between border-b border-slate-100 py-1">
                <span>{item.descricao} <span className="text-slate-500">({rotulo(item.tipo)} × {item.quantidade})</span></span>
                <span>{moeda(item.quantidade * item.valor_unitario)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-right font-semibold">Total {moeda(s.total)}</p>
        </Cartao>
      ))}
    </Pagina>
  );
}
