import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Aviso, Campo, Cartao, Pagina, Tabela } from "../components/ui";
import { celula, estilo, lerForm, useAcao, useCarregar } from "../lib/util";
import { api } from "../services/auth";

export type Cliente = { id: string; nome: string; email: string; telefone: string; ativo: boolean; total_veiculos: number };

export function Clientes() {
  const [busca, setBusca] = useState("");
  const { dados, erro, recarregar } = useCarregar(() => api.get<Cliente[]>(`clientes?busca=${encodeURIComponent(busca)}`), [busca]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const acao = useAcao();

  async function criar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (await acao.executar(() => api.post("clientes", lerForm(form)))) {
      form.reset();
      setMostrarForm(false);
      recarregar();
    }
  }

  return (
    <Pagina
      titulo="Clientes"
      descricao="Cadastro e consulta de clientes (RF01)."
      acoes={<button className={estilo.botao} onClick={() => setMostrarForm(!mostrarForm)}>{mostrarForm ? "Fechar" : "Novo cliente"}</button>}
    >
      {mostrarForm && (
        <Cartao titulo="Novo cliente">
          <form onSubmit={criar} className="grid gap-4 md:grid-cols-2">
            <Campo rotulo="Nome completo"><input name="nome" required className={estilo.input} /></Campo>
            <Campo rotulo="E-mail"><input name="email" type="email" required className={estilo.input} /></Campo>
            <Campo rotulo="Telefone"><input name="telefone" required className={estilo.input} /></Campo>
            <Campo rotulo="Senha inicial (informe ao cliente)"><input name="senha" type="text" minLength={8} required className={estilo.input} /></Campo>
            <div className="md:col-span-2 space-y-3">
              <Aviso mensagem={acao.erro} />
              <button className={estilo.botao} disabled={acao.enviando}>Cadastrar cliente</button>
            </div>
          </form>
        </Cartao>
      )}

      <input className={`${estilo.input} max-w-md`} placeholder="Buscar por nome, e-mail ou telefone" value={busca} onChange={(e) => setBusca(e.target.value)} />
      <Aviso mensagem={erro} />
      <Tabela colunas={["Nome", "E-mail", "Telefone", "Veículos", "Situação"]}>
        {(dados ?? []).map((cliente) => (
          <tr key={cliente.id}>
            <td className={celula}>{cliente.nome}</td>
            <td className={celula}>{cliente.email}</td>
            <td className={celula}>{cliente.telefone}</td>
            <td className={celula}><Link className={estilo.link} to={`/veiculos?usuario_id=${cliente.id}`}>{cliente.total_veiculos} veículo(s)</Link></td>
            <td className={celula}>{cliente.ativo ? "Ativo" : "Inativo"}</td>
          </tr>
        ))}
      </Tabela>
    </Pagina>
  );
}
