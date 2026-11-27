import { Link } from "react-router-dom";
import { Aviso, Pagina } from "../components/ui";
import { useCarregar } from "../lib/util";
import { api } from "../services/auth";

type Indicadores = {
  agendamentos_hoje: number;
  solicitacoes_pendentes: number;
  ordens_em_andamento: number;
  orcamentos_pendentes: number;
  pecas_estoque_baixo: number;
};

export function Dashboard() {
  const { dados, erro } = useCarregar(() => api.get<Indicadores>("dashboard"), []);

  const indicadores = [
    { titulo: "Agendamentos hoje", valor: dados?.agendamentos_hoje, to: "/agendamentos" },
    { titulo: "Solicitações aguardando", valor: dados?.solicitacoes_pendentes, to: "/agendamentos" },
    { titulo: "Ordens em andamento", valor: dados?.ordens_em_andamento, to: "/ordens-servico" },
    { titulo: "Orçamentos pendentes", valor: dados?.orcamentos_pendentes, to: "/orcamentos" },
    { titulo: "Peças com estoque baixo", valor: dados?.pecas_estoque_baixo, to: "/estoque" },
  ];

  return (
    <Pagina titulo="Dashboard" descricao="Visão geral da oficina.">
      <Aviso mensagem={erro} />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        {indicadores.map((indicador) => (
          <Link key={indicador.titulo} to={indicador.to} className="rounded-xl bg-white p-5 shadow-sm transition hover:shadow-md">
            <p className="text-sm text-slate-500">{indicador.titulo}</p>
            <strong className="mt-2 block text-3xl text-blue-600">{indicador.valor ?? "…"}</strong>
          </Link>
        ))}
      </div>
    </Pagina>
  );
}
