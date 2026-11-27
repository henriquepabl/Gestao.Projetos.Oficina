// Teste de integração do fluxo do PDF (5.3): cadastro → agendamento → diagnóstico → orçamento → aceite
// → OS → peças → pagamento → histórico → relatórios, mais as regras de permissão por perfil.
// Requer a API rodando (API_URL, padrão http://localhost:3000) e o mesmo DATABASE_URL.
// Cria dados com e-mails "e2e-*@teste.local" e apaga tudo no final.  Uso: npm run test:e2e
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { database } from "../src/database";

const API = `${process.env.API_URL ?? "http://localhost:3000"}/api`;
const marca = `e2e-${Date.now()}`;
const email = (nome: string) => `${marca}-${nome}@teste.local`;

async function chamar(metodo: string, caminho: string, token?: string, corpo?: unknown) {
  const resposta = await fetch(`${API}${caminho}`, {
    method: metodo,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  return { status: resposta.status, corpo: (await resposta.json().catch(() => ({}))) as any };
}

async function criarUsuario(nome: string, role: string) {
  const r = await chamar("POST", "/cadastro", undefined, { nome, email: email(nome), telefone: "15999990000", senha: "senha-segura-1" });
  assert.equal(r.status, 201, JSON.stringify(r.corpo));
  if (role !== "client") await database.query("UPDATE usuarios SET role = $2 WHERE email = $1", [email(nome), role]);
  const login = await chamar("POST", "/login", undefined, { email: email(nome), senha: "senha-segura-1" });
  assert.equal(login.status, 200);
  assert.equal(login.corpo.usuario.role, role);
  return login.corpo as { token: string; usuario: { id: string } };
}

after(async () => {
  const ids = `(SELECT id FROM usuarios WHERE email LIKE '${marca}-%')`;
  await database.query(`DELETE FROM pagamentos WHERE os_id IN (SELECT os.id FROM ordens_servico os JOIN veiculos v ON v.id = os.veiculo_id WHERE v.usuario_id IN ${ids})`);
  await database.query(`DELETE FROM movimentacoes_estoque WHERE usuario_id IN ${ids}`);
  await database.query(`DELETE FROM ordens_servico WHERE veiculo_id IN (SELECT id FROM veiculos WHERE usuario_id IN ${ids})`);
  await database.query(`DELETE FROM orcamentos WHERE criado_por IN ${ids}`);
  await database.query(`DELETE FROM diagnosticos WHERE mecanico_id IN ${ids}`);
  await database.query(`DELETE FROM agendamentos WHERE usuario_id IN ${ids}`);
  await database.query(`DELETE FROM veiculos WHERE usuario_id IN ${ids}`);
  await database.query(`DELETE FROM pecas WHERE codigo LIKE '${marca}%'`);
  await database.query(`DELETE FROM usuarios WHERE email LIKE '${marca}-%'`);
  await database.end();
});

test("fluxo completo e permissões", async () => {
  const admin = await criarUsuario("admin", "admin");
  const func = await criarUsuario("func", "employee");
  const ana = await criarUsuario("ana", "client");
  const beto = await criarUsuario("beto", "client");

  // sem token / perfil errado
  assert.equal((await chamar("GET", "/veiculos")).status, 401);
  assert.equal((await chamar("GET", "/clientes", ana.token)).status, 403);
  assert.equal((await chamar("GET", "/pecas", ana.token)).status, 403);
  assert.equal((await chamar("GET", "/relatorios", func.token)).status, 403);
  assert.equal((await chamar("GET", "/usuarios", func.token)).status, 403);

  // RF02: cada cliente cadastra o próprio veículo
  const carroAna = await chamar("POST", "/veiculos", ana.token, { marca: "Fiat", modelo: "Uno", ano: 2015, placa: `E2E${Date.now() % 10000}`, quilometragem: 80000 });
  assert.equal(carroAna.status, 201, JSON.stringify(carroAna.corpo));
  const carroBeto = await chamar("POST", "/veiculos", beto.token, { marca: "VW", modelo: "Gol", ano: 2018, placa: `B2E${Date.now() % 10000}` });
  assert.equal(carroBeto.status, 201);

  // isolamento entre clientes (R06)
  assert.equal((await chamar("GET", `/veiculos/${carroAna.corpo.id}`, beto.token)).status, 404);
  assert.equal((await chamar("GET", "/veiculos", beto.token)).corpo.length, 1);
  const agendaAlheia = await chamar("POST", "/agendamentos", beto.token, {
    veiculo_id: carroAna.corpo.id, inicio: "2030-01-10T12:00:00Z", fim: "2030-01-10T13:00:00Z",
  });
  assert.equal(agendaAlheia.status, 400, "beto não pode agendar com o carro da ana");

  // RF01: funcionário vê clientes
  const clientes = await chamar("GET", `/clientes?busca=${marca}`, func.token);
  assert.equal(clientes.corpo.length, 2);

  // RF03: ana solicita, funcionário confirma
  const ag = await chamar("POST", "/agendamentos", ana.token, {
    veiculo_id: carroAna.corpo.id, inicio: "2030-01-10T12:00:00Z", fim: "2030-01-10T13:00:00Z", descricao: "Barulho no freio",
  });
  assert.equal(ag.status, 201);
  assert.equal(ag.corpo.status, "solicitado");
  assert.equal((await chamar("PATCH", `/agendamentos/${ag.corpo.id}/status`, ana.token, { status: "confirmado" })).status, 400);
  assert.equal((await chamar("PATCH", `/agendamentos/${ag.corpo.id}/status`, func.token, { status: "confirmado" })).corpo.status, "confirmado");

  // RF04: diagnóstico
  const diag = await chamar("POST", `/agendamentos/${ag.corpo.id}/diagnostico`, func.token, { problemas: "Pastilhas gastas", recomendacoes: "Trocar pastilhas", km_registrado: 81000 });
  assert.equal(diag.status, 201, JSON.stringify(diag.corpo));

  // RF07: peça com entrada no estoque
  const peca = await chamar("POST", "/pecas", func.token, { codigo: `${marca}-P1`, nome: "Pastilha de freio", preco_venda: 120.5, estoque_minimo: 2 });
  assert.equal(peca.status, 201, JSON.stringify(peca.corpo));
  assert.equal((await chamar("POST", `/pecas/${peca.corpo.id}/movimentacoes`, func.token, { tipo: "entrada", quantidade: 3 })).corpo.quantidade, 3);
  assert.equal((await chamar("POST", `/pecas/${peca.corpo.id}/movimentacoes`, func.token, { tipo: "saida", quantidade: 10 })).status, 400, "saldo negativo bloqueado");

  // RF05: orçamento (2 × 120,50 + 1,5 h × 100) = 391
  const orc = await chamar("POST", "/orcamentos", func.token, {
    diagnostico_id: diag.corpo.id,
    itens: [
      { tipo: "peca", peca_id: peca.corpo.id, descricao: "Pastilha de freio", quantidade: 2, valor_unitario: 120.5 },
      { tipo: "mao_de_obra", descricao: "Troca de pastilhas", quantidade: 1.5, valor_unitario: 100 },
    ],
  });
  assert.equal(orc.status, 201, JSON.stringify(orc.corpo));
  assert.equal(orc.corpo.total, 391);
  assert.equal((await chamar("PATCH", `/orcamentos/${orc.corpo.id}/resposta`, beto.token, { resposta: "aprovado" })).status, 404, "beto não aprova orçamento da ana");
  assert.equal((await chamar("GET", `/orcamentos/${orc.corpo.id}`, beto.token)).status, 404);
  const aprovado = await chamar("PATCH", `/orcamentos/${orc.corpo.id}/resposta`, ana.token, { resposta: "aprovado" });
  assert.equal(aprovado.corpo.status, "aprovado");
  const osId = aprovado.corpo.os_id;
  assert.ok(osId, "aprovar abre a OS");

  // RF06: OS com mecânico, peças e status
  assert.equal((await chamar("PATCH", `/ordens-servico/${osId}`, ana.token, { status: "em_execucao" })).status, 403);
  await chamar("PATCH", `/ordens-servico/${osId}`, func.token, { status: "em_execucao", mecanico_id: func.usuario.id });
  const comPeca = await chamar("POST", `/ordens-servico/${osId}/pecas`, func.token, { peca_id: peca.corpo.id, quantidade: 2 });
  assert.equal(comPeca.status, 201, JSON.stringify(comPeca.corpo));
  assert.equal(comPeca.corpo.pecas_usadas.length, 1);
  const saldoPeca = await chamar("GET", `/pecas?busca=${marca}`, func.token);
  assert.equal(saldoPeca.corpo[0].quantidade, 1);
  assert.equal(saldoPeca.corpo[0].abaixo_minimo, true);
  assert.equal((await chamar("PATCH", `/ordens-servico/${osId}`, func.token, { status: "aberta" })).status, 400, "transição inválida");
  await chamar("PATCH", `/ordens-servico/${osId}`, func.token, { status: "concluida" });

  // RF08: pagamento só registrado; cliente consulta
  await chamar("POST", `/ordens-servico/${osId}/pagamentos`, func.token, { valor: 200, forma: "pix", pago: true });
  let osAna = await chamar("GET", `/ordens-servico/${osId}`, ana.token);
  assert.equal(osAna.corpo.saldo, 191);
  assert.equal(osAna.corpo.situacao_pagamento, "pendente");
  const pend = await chamar("POST", `/ordens-servico/${osId}/pagamentos`, func.token, { valor: 191, forma: "dinheiro" });
  await chamar("PATCH", `/pagamentos/${pend.corpo.pagamentos[1].id}`, func.token, { status: "pago" });
  osAna = await chamar("GET", `/ordens-servico/${osId}`, ana.token);
  assert.equal(osAna.corpo.situacao_pagamento, "pago");
  // não deixa pagar além do total; lançamento errado pode ser estornado
  assert.equal((await chamar("POST", `/ordens-servico/${osId}/pagamentos`, func.token, { valor: 10, forma: "pix", pago: true })).status, 400);
  const estornado = await chamar("PATCH", `/pagamentos/${pend.corpo.pagamentos[1].id}`, func.token, { status: "cancelado" });
  assert.equal(estornado.corpo.saldo, 191);
  assert.equal((await chamar("POST", `/ordens-servico/${osId}/pagamentos`, func.token, { valor: 191, forma: "pix", pago: true })).status, 201);
  assert.equal((await chamar("GET", `/ordens-servico/${osId}`, beto.token)).status, 404);

  // RF09: histórico do veículo
  const hist = await chamar("GET", `/veiculos/${carroAna.corpo.id}/historico`, ana.token);
  assert.equal(hist.corpo.servicos.length, 1);
  assert.equal(hist.corpo.veiculo.quilometragem, 81000);

  // RF10: relatórios (admin) e dashboard (equipe)
  const rel = await chamar("GET", "/relatorios?de=2020-01-01&ate=2099-12-31", admin.token);
  assert.equal(rel.status, 200);
  assert.ok(rel.corpo.desempenho.some((linha: any) => linha.mecanico === "func"));
  assert.equal((await chamar("GET", "/dashboard", func.token)).status, 200);

  // admin gerencia usuários; não pode desativar a si mesmo
  assert.equal((await chamar("PATCH", `/usuarios/${admin.usuario.id}`, admin.token, { ativo: false })).status, 400);
  assert.equal((await chamar("PATCH", `/usuarios/${beto.usuario.id}`, admin.token, { ativo: false })).corpo.ativo, false);
  assert.equal((await chamar("POST", "/login", undefined, { email: email("beto"), senha: "senha-segura-1" })).status, 401);

  // troca de senha
  assert.equal((await chamar("PATCH", "/me/senha", ana.token, { senhaAtual: "errada-123", novaSenha: "nova-senha-1" })).status, 400);
  assert.equal((await chamar("PATCH", "/me/senha", ana.token, { senhaAtual: "senha-segura-1", novaSenha: "nova-senha-1" })).status, 200);
});
