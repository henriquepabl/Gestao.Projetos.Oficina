import { useState, type FormEvent } from "react";
import { Aviso, Campo, Cartao, Pagina, Tabela } from "../components/ui";
import { celula, estilo, lerForm, rotulo, useAcao, useCarregar } from "../lib/util";
import { api, authSession, type Role } from "../services/auth";

type Usuario = { id: string; nome: string; email: string; telefone: string; role: Role; ativo: boolean };
const ROLES: Role[] = ["client", "employee", "admin"];

export function Usuarios() {
  const eu = authSession.usuario();
  const [busca, setBusca] = useState("");
  const lista = useCarregar(() => api.get<Usuario[]>(`usuarios?busca=${encodeURIComponent(busca)}`), [busca]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const acao = useAcao();

  async function criar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (await acao.executar(() => api.post("usuarios", lerForm(form)))) {
      form.reset();
      setMostrarForm(false);
      lista.recarregar();
    }
  }

  async function atualizar(id: string, mudanca: Partial<Usuario>) {
    if (await acao.executar(() => api.patch(`usuarios/${id}`, mudanca))) lista.recarregar();
  }

  return (
    <Pagina
      titulo="Usuários"
      descricao="Cadastre funcionários, altere perfis e desative contas."
      acoes={<button className={estilo.botao} onClick={() => setMostrarForm(!mostrarForm)}>{mostrarForm ? "Fechar" : "Novo usuário"}</button>}
    >
      {mostrarForm && (
        <Cartao titulo="Novo usuário">
          <form onSubmit={criar} className="grid gap-4 md:grid-cols-3">
            <Campo rotulo="Nome"><input name="nome" required className={estilo.input} /></Campo>
            <Campo rotulo="E-mail"><input name="email" type="email" required className={estilo.input} /></Campo>
            <Campo rotulo="Telefone"><input name="telefone" required className={estilo.input} /></Campo>
            <Campo rotulo="Senha inicial"><input name="senha" minLength={8} required className={estilo.input} /></Campo>
            <Campo rotulo="Perfil">
              <select name="role" defaultValue="employee" className={estilo.input}>{ROLES.map((r) => <option key={r} value={r}>{rotulo(r)}</option>)}</select>
            </Campo>
            <div className="md:col-span-3"><button className={estilo.botao} disabled={acao.enviando}>Cadastrar</button></div>
          </form>
        </Cartao>
      )}
      <input className={`${estilo.input} max-w-md`} placeholder="Buscar por nome, e-mail ou telefone" value={busca} onChange={(e) => setBusca(e.target.value)} />
      <Aviso mensagem={lista.erro || acao.erro} />
      <Tabela colunas={["Nome", "E-mail", "Telefone", "Perfil", "Situação", ""]}>
        {(lista.dados ?? []).map((u) => (
          <tr key={u.id} className={u.ativo ? "" : "opacity-60"}>
            <td className={celula}>{u.nome}</td>
            <td className={celula}>{u.email}</td>
            <td className={celula}>{u.telefone}</td>
            <td className={celula}>
              {u.id === eu?.id ? rotulo(u.role) : (
                <select value={u.role} disabled={acao.enviando} className={estilo.input} onChange={(e) => atualizar(u.id, { role: e.target.value as Role })}>
                  {ROLES.map((r) => <option key={r} value={r}>{rotulo(r)}</option>)}
                </select>
              )}
            </td>
            <td className={celula}>{u.ativo ? "Ativo" : "Inativo"}</td>
            <td className={celula}>
              {u.id !== eu?.id && (
                <button className={u.ativo ? estilo.botaoPerigo : estilo.botaoSecundario} disabled={acao.enviando} onClick={() => atualizar(u.id, { ativo: !u.ativo })}>
                  {u.ativo ? "Desativar" : "Reativar"}
                </button>
              )}
            </td>
          </tr>
        ))}
      </Tabela>
    </Pagina>
  );
}
