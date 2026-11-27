import { useState } from "react";
import { Aviso, Campo, Cartao, Pagina, Tabela } from "../components/ui";
import { celula, estilo, hojeISO, moeda, rotulo, useCarregar } from "../lib/util";
import { api } from "../services/auth";

type Relatorio = {
  servicos: { status: string; total: number }[];
  faturamento: { por_mes: { mes: string; total: number; pagamentos: number }[]; por_forma: { forma: string; total: number }[] };
  estoque: { abaixo_minimo: { codigo: string; nome: string; quantidade: number; estoque_minimo: number }[]; mais_usadas: { codigo: string; nome: string; quantidade: number }[] };
  desempenho: { mecanico: string; concluidas: number; horas_medias: number | null }[];
};

export function Relatorios() {
  const [de, setDe] = useState(`${hojeISO().slice(0, 8)}01`);
  const [ate, setAte] = useState(hojeISO());
  const { dados, erro } = useCarregar(() => api.get<Relatorio>(`relatorios?de=${de}&ate=${ate}`), [de, ate]);
  const faturado = dados?.faturamento.por_mes.reduce((soma, m) => soma + m.total, 0) ?? 0;
  const totalOS = dados?.servicos.reduce((soma, s) => soma + s.total, 0) ?? 0;

  return (
    <Pagina titulo="Relatórios" descricao="Serviços, faturamento, estoque e desempenho (RF10).">
      <div className="flex flex-wrap gap-3">
        <Campo rotulo="De"><input type="date" value={de} onChange={(e) => setDe(e.target.value)} className={estilo.input} /></Campo>
        <Campo rotulo="Até"><input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className={estilo.input} /></Campo>
      </div>
      <Aviso mensagem={erro} />
      {dados && <>
        <div className="grid gap-5 md:grid-cols-3">
          <Cartao><p className="text-sm text-slate-500">Faturamento recebido</p><p className="mt-1 text-3xl font-bold text-green-700">{moeda(faturado)}</p></Cartao>
          <Cartao><p className="text-sm text-slate-500">Ordens abertas no período</p><p className="mt-1 text-3xl font-bold text-blue-600">{totalOS}</p></Cartao>
          <Cartao><p className="text-sm text-slate-500">Peças para repor (hoje)</p><p className="mt-1 text-3xl font-bold text-amber-700">{dados.estoque.abaixo_minimo.length}</p></Cartao>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Cartao titulo="Serviços por situação">
            <Tabela colunas={["Situação", "Ordens"]}>{dados.servicos.map((s) => <tr key={s.status}><td className={celula}>{rotulo(s.status)}</td><td className={celula}>{s.total}</td></tr>)}</Tabela>
          </Cartao>
          <Cartao titulo="Faturamento por mês">
            <Tabela colunas={["Mês", "Pagamentos", "Total"]}>{dados.faturamento.por_mes.map((m) => <tr key={m.mes}><td className={celula}>{m.mes.split("-").reverse().join("/")}</td><td className={celula}>{m.pagamentos}</td><td className={celula}>{moeda(m.total)}</td></tr>)}</Tabela>
          </Cartao>
          <Cartao titulo="Faturamento por forma de pagamento">
            <Tabela colunas={["Forma", "Total"]}>{dados.faturamento.por_forma.map((f) => <tr key={f.forma}><td className={celula}>{rotulo(f.forma)}</td><td className={celula}>{moeda(f.total)}</td></tr>)}</Tabela>
          </Cartao>
          <Cartao titulo="Desempenho dos mecânicos">
            <Tabela colunas={["Mecânico", "OS concluídas", "Tempo médio"]}>{dados.desempenho.map((d) => <tr key={d.mecanico}><td className={celula}>{d.mecanico}</td><td className={celula}>{d.concluidas}</td><td className={celula}>{d.horas_medias ?? "—"} h</td></tr>)}</Tabela>
          </Cartao>
          <Cartao titulo="Peças mais usadas no período">
            <Tabela colunas={["Código", "Peça", "Saídas"]}>{dados.estoque.mais_usadas.map((p) => <tr key={p.codigo}><td className={celula}>{p.codigo}</td><td className={celula}>{p.nome}</td><td className={celula}>{p.quantidade}</td></tr>)}</Tabela>
          </Cartao>
          <Cartao titulo="Peças abaixo do estoque mínimo">
            <Tabela colunas={["Código", "Peça", "Saldo", "Mínimo"]}>{dados.estoque.abaixo_minimo.map((p) => <tr key={p.codigo}><td className={celula}>{p.codigo}</td><td className={celula}>{p.nome}</td><td className={celula}>{p.quantidade}</td><td className={celula}>{p.estoque_minimo}</td></tr>)}</Tabela>
          </Cartao>
        </div>
      </>}
    </Pagina>
  );
}
