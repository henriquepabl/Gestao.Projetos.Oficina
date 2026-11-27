import { useState, type FormEvent } from "react";
import { Aviso, Campo, Cartao, Pagina } from "../components/ui";
import { estilo, lerForm, rotulo, useAcao, useCarregar } from "../lib/util";
import { api } from "../services/auth";

type Eu = { nome: string; email: string; telefone: string; role: string };

export function Perfil() {
  const { dados, erro } = useCarregar(() => api.get<Eu>("me"), []);
  const acao = useAcao();
  const [ok, setOk] = useState("");

  async function trocarSenha(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOk("");
    const form = event.currentTarget;
    const campos = lerForm(form);
    if (campos.novaSenha !== campos.confirmacao) return acao.setErro("As senhas não coincidem.");
    if (await acao.executar(() => api.patch("me/senha", { senhaAtual: campos.senhaAtual, novaSenha: campos.novaSenha }))) {
      form.reset();
      setOk("Senha alterada com sucesso.");
    }
  }

  return (
    <Pagina titulo="Meu perfil">
      <Aviso mensagem={erro} />
      {dados && (
        <Cartao titulo="Dados da conta">
          <dl className="grid gap-2 text-sm md:grid-cols-2">
            <div><dt className="text-slate-500">Nome</dt><dd>{dados.nome}</dd></div>
            <div><dt className="text-slate-500">E-mail</dt><dd>{dados.email}</dd></div>
            <div><dt className="text-slate-500">Telefone</dt><dd>{dados.telefone}</dd></div>
            <div><dt className="text-slate-500">Perfil</dt><dd>{rotulo(dados.role)}</dd></div>
          </dl>
        </Cartao>
      )}
      <Cartao titulo="Trocar senha">
        <form onSubmit={trocarSenha} className="grid max-w-md gap-4">
          <Campo rotulo="Senha atual"><input name="senhaAtual" type="password" required autoComplete="current-password" className={estilo.input} /></Campo>
          <Campo rotulo="Nova senha"><input name="novaSenha" type="password" minLength={8} required autoComplete="new-password" className={estilo.input} /></Campo>
          <Campo rotulo="Confirmar nova senha"><input name="confirmacao" type="password" minLength={8} required autoComplete="new-password" className={estilo.input} /></Campo>
          <Aviso mensagem={acao.erro} />
          <Aviso mensagem={ok} tipo="ok" />
          <button className={estilo.botao} disabled={acao.enviando}>Salvar nova senha</button>
        </form>
      </Cartao>
    </Pagina>
  );
}
