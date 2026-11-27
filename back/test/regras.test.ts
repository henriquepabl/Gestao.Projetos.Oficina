import assert from "node:assert/strict";
import { test } from "node:test";
import { comSaldo, osEmAberto, podeMudarAgendamento, podeMudarOS } from "../src/regras";
import { HttpError, numero, texto } from "../src/http";

test("cliente só cancela agendamento ainda não iniciado", () => {
  assert.equal(podeMudarAgendamento("solicitado", "cancelado", false), true);
  assert.equal(podeMudarAgendamento("confirmado", "cancelado", false), true);
  assert.equal(podeMudarAgendamento("em_atendimento", "cancelado", false), false);
  assert.equal(podeMudarAgendamento("solicitado", "confirmado", false), false);
});

test("equipe segue o fluxo do agendamento", () => {
  assert.equal(podeMudarAgendamento("solicitado", "confirmado", true), true);
  assert.equal(podeMudarAgendamento("solicitado", "recusado", true), true);
  assert.equal(podeMudarAgendamento("confirmado", "em_atendimento", true), true);
  assert.equal(podeMudarAgendamento("em_atendimento", "concluido", true), true);
  assert.equal(podeMudarAgendamento("solicitado", "concluido", true), false);
  assert.equal(podeMudarAgendamento("concluido", "cancelado", true), false);
  assert.equal(podeMudarAgendamento("recusado", "confirmado", true), false);
});

test("transições da OS", () => {
  assert.equal(podeMudarOS("aberta", "em_execucao"), true);
  assert.equal(podeMudarOS("em_execucao", "aguardando_peca"), true);
  assert.equal(podeMudarOS("aguardando_peca", "em_execucao"), true);
  assert.equal(podeMudarOS("em_execucao", "concluida"), true);
  assert.equal(podeMudarOS("concluida", "entregue"), true);
  assert.equal(podeMudarOS("aberta", "concluida"), true, "atalho: concluir direto");
  assert.equal(podeMudarOS("em_execucao", "entregue"), true, "atalho: finalizar e entregar");
  assert.equal(podeMudarOS("em_execucao", "aberta"), false);
  assert.equal(podeMudarOS("entregue", "cancelada"), false);
  assert.equal(podeMudarOS("entregue", "aberta"), false);
  assert.equal(podeMudarOS("cancelada", "em_execucao"), false);
  assert.equal(podeMudarOS("concluida", "cancelada"), false);
});

test("OS em aberto aceita peças", () => {
  assert.equal(osEmAberto("aberta"), true);
  assert.equal(osEmAberto("aguardando_peca"), true);
  assert.equal(osEmAberto("concluida"), false);
  assert.equal(osEmAberto("cancelada"), false);
});

test("saldo e situação do pagamento", () => {
  assert.deepEqual(comSaldo({ total: 391, total_pago: 200 }), { total: 391, total_pago: 200, saldo: 191, situacao_pagamento: "pendente" });
  assert.equal(comSaldo({ total: 391, total_pago: 391 }).situacao_pagamento, "pago");
  assert.equal(comSaldo({ total: 0.3, total_pago: 0.1 + 0.2 }).saldo, 0, "sem erro de ponto flutuante");
  assert.equal(comSaldo({ total: 0, total_pago: 0 }).situacao_pagamento, "pendente", "OS sem itens não aparece como paga");
});

test("validação de entrada", () => {
  assert.equal(numero("12,5", "valor"), 12.5);
  assert.equal(numero(undefined, "valor", { obrigatorio: false }), null);
  assert.throws(() => numero("-1", "valor"), HttpError);
  assert.throws(() => numero("1.5", "qtd", { inteiro: true }), HttpError);
  assert.throws(() => numero("abc", "valor"), HttpError);
  assert.equal(texto("  Ana ", "nome"), "Ana");
  assert.throws(() => texto("", "nome"), HttpError);
  assert.equal(texto("", "nome", false), null);
});
