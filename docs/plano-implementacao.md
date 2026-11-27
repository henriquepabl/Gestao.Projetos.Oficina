# Plano de implementação — o que falta

Comparação entre o PDF do trabalho (RF01–RF10, critérios de aceitação e visões de usuário) e o código atual (`main`, commit `cd68cc3`).

> **Status em 27/11/2026 (branch `feat/funcionalidades`):** etapas 0 a 8 implementadas e a migração 002 aplicada no Neon. Etapa 9: testes unitários (`npm test`) e o teste de fluxo completo (`npm run test:e2e`) passando; build, lint e typecheck sem erros; telas verificadas no navegador com os 3 perfis. **Falta:** deploy (Render), matriz de rastreabilidade formal e manual do usuário.
> Diferenças em relação ao plano abaixo: aprovar o orçamento já abre a OS automaticamente; registrar o diagnóstico passa o agendamento para "em atendimento" e atualiza a quilometragem do veículo; a agenda aceita até 3 atendimentos simultâneos (`CAPACIDADE_OFICINA`). Não foi feito "remarcar" agendamento (o cliente cancela e pede outro horário).

## 1. Situação atual

| Item | Status |
| --- | --- |
| Tabelas `usuarios`, `veiculos`, `agendamentos` (migração 001) | ✅ existe |
| `POST /api/cadastro` (cria `client` com bcrypt) | ✅ existe |
| `POST /api/login` | ⚠️ valida a senha, mas **não devolve token nem o perfil** do usuário |
| Proteção das rotas da API (middleware de autenticação/perfil) | ❌ não existe |
| Frontend sabe qual perfil está logado | ❌ só guarda `"true"` no `sessionStorage` |
| Portal do cliente × painel da oficina | ❌ todos veem o mesmo menu |
| Telas Clientes, Agendamentos, OS, Estoque | ❌ placeholders (`EmConstrucao`) |
| Dashboard | ❌ números fixos |
| Testes automatizados | ❌ nenhum framework instalado |
| README | ⚠️ desatualizado (diz que não há login) |

**Conclusão:** o banco PostgreSQL no Neon comporta todo o escopo sem problemas. Faltam **6 tabelas** (seção 3). Histórico (RF09) e relatórios (RF10) não precisam de tabela: são consultas sobre as tabelas que já existirão.

## 2. Quem pode fazer o quê

O PDF tem quatro visões (cliente, recepção, mecânico, gestão); o modelo de dados já decidiu usar só três `role`s. Mapeamento:

| Funcionalidade | `client` | `employee` (recepção + mecânico) | `admin` (gestão) |
| --- | :-: | :-: | :-: |
| Ver/editar o próprio perfil | ✅ | ✅ | ✅ |
| Cadastrar/consultar clientes (RF01) | — | ✅ | ✅ |
| Veículos (RF02) | só os seus | todos | todos |
| Solicitar agendamento (RF03) | só para os seus veículos | ✅ (em nome do cliente) | ✅ |
| Confirmar/recusar/remarcar agendamento | cancelar o seu | ✅ | ✅ |
| Registrar diagnóstico (RF04) | — | ✅ | ✅ |
| Montar orçamento (RF05) | — | ✅ | ✅ |
| Aprovar/recusar orçamento | só os seus | — | — |
| Ordem de serviço: abrir, status, peças (RF06) | acompanhar as suas | ✅ | ✅ |
| Estoque: entrada/saída/saldo (RF07) | — | ✅ | ✅ |
| Registrar pagamento (RF08) | consultar se foi pago | ✅ | ✅ |
| Histórico do veículo (RF09) | só os seus | ✅ | ✅ |
| Relatórios e faturamento (RF10) | — | — | ✅ |
| Gerenciar usuários (criar funcionário, ativar/desativar, mudar role) | — | — | ✅ |

Regra de ouro (critério de aceitação do PDF e risco R06): **toda rota de cliente filtra pelo `id` vindo do token**, nunca por um id enviado no corpo/URL.

## 3. Tabelas que faltam — migração `002_oficina_operacao.sql`

Fluxo do PDF: cadastro → agendamento → **diagnóstico → orçamento → aceite → OS → peças → pagamento** → histórico/relatórios.

Decisões para manter pequeno:
- Peças usadas na OS = movimentação de estoque do tipo `saida` com `os_id` preenchido (não precisa de tabela `os_pecas`).
- Um mecânico responsável por OS (coluna). Se a oficina exigir vários, trocar por uma tabela `os_mecanicos`.
- Pagamento só registra valor, forma e se está pago — nada de gateway (restrição 3.1 do PDF).
- Saldo de estoque em `pecas.quantidade`, atualizado **na mesma transação** que grava a movimentação (risco R10).

```sql
BEGIN;

-- RF04
CREATE TABLE IF NOT EXISTS diagnosticos (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    agendamento_id  BIGINT NOT NULL UNIQUE REFERENCES agendamentos(id) ON DELETE RESTRICT,
    mecanico_id     BIGINT NOT NULL REFERENCES usuarios(id),
    problemas       TEXT NOT NULL,
    recomendacoes   TEXT,
    km_registrado   INTEGER CHECK (km_registrado >= 0),
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RF07
CREATE TABLE IF NOT EXISTS pecas (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo          VARCHAR(40) NOT NULL UNIQUE,
    nome            VARCHAR(150) NOT NULL,
    preco_venda     NUMERIC(10,2) NOT NULL CHECK (preco_venda >= 0),
    quantidade      INTEGER NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
    estoque_minimo  INTEGER NOT NULL DEFAULT 0 CHECK (estoque_minimo >= 0),
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RF05
CREATE TABLE IF NOT EXISTS orcamentos (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    diagnostico_id  BIGINT NOT NULL REFERENCES diagnosticos(id) ON DELETE RESTRICT,
    criado_por      BIGINT NOT NULL REFERENCES usuarios(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'pendente'
                    CHECK (status IN ('pendente', 'aprovado', 'recusado', 'cancelado')),
    validade        DATE,
    observacoes     TEXT,
    respondido_em   TIMESTAMPTZ,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orcamento_itens (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    orcamento_id    BIGINT NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
    tipo            VARCHAR(15) NOT NULL CHECK (tipo IN ('peca', 'mao_de_obra')),
    peca_id         BIGINT REFERENCES pecas(id),
    descricao       VARCHAR(200) NOT NULL,
    quantidade      NUMERIC(10,2) NOT NULL CHECK (quantidade > 0),
    valor_unitario  NUMERIC(10,2) NOT NULL CHECK (valor_unitario >= 0),
    CONSTRAINT orcamento_itens_peca_coerente CHECK ((tipo = 'peca') = (peca_id IS NOT NULL))
);

-- RF06
CREATE TABLE IF NOT EXISTS ordens_servico (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    orcamento_id    BIGINT NOT NULL UNIQUE REFERENCES orcamentos(id) ON DELETE RESTRICT,
    veiculo_id      BIGINT NOT NULL REFERENCES veiculos(id) ON DELETE RESTRICT,
    mecanico_id     BIGINT REFERENCES usuarios(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'aberta'
                    CHECK (status IN ('aberta', 'em_execucao', 'aguardando_peca',
                                      'concluida', 'entregue', 'cancelada')),
    observacoes     TEXT,
    aberta_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    concluida_em    TIMESTAMPTZ,
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RF07 (e peças consumidas pela OS)
CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    peca_id         BIGINT NOT NULL REFERENCES pecas(id) ON DELETE RESTRICT,
    tipo            VARCHAR(10) NOT NULL CHECK (tipo IN ('entrada', 'saida')),
    quantidade      INTEGER NOT NULL CHECK (quantidade > 0),
    os_id           BIGINT REFERENCES ordens_servico(id) ON DELETE RESTRICT,
    motivo          VARCHAR(200),
    usuario_id      BIGINT NOT NULL REFERENCES usuarios(id),
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT mov_os_somente_saida CHECK (os_id IS NULL OR tipo = 'saida')
);

-- RF08 (só registro; o recebimento acontece fora do sistema)
CREATE TABLE IF NOT EXISTS pagamentos (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    os_id           BIGINT NOT NULL REFERENCES ordens_servico(id) ON DELETE RESTRICT,
    valor           NUMERIC(10,2) NOT NULL CHECK (valor > 0),
    forma           VARCHAR(20) NOT NULL
                    CHECK (forma IN ('dinheiro', 'pix', 'cartao_debito',
                                     'cartao_credito', 'boleto', 'transferencia')),
    status          VARCHAR(15) NOT NULL DEFAULT 'pendente'
                    CHECK (status IN ('pendente', 'pago', 'cancelado')),
    pago_em         TIMESTAMPTZ,
    registrado_por  BIGINT NOT NULL REFERENCES usuarios(id),
    observacao      TEXT,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT pagamento_pago_tem_data CHECK ((status = 'pago') = (pago_em IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS orcamentos_diagnostico_idx ON orcamentos (diagnostico_id);
CREATE INDEX IF NOT EXISTS orcamento_itens_orcamento_idx ON orcamento_itens (orcamento_id);
CREATE INDEX IF NOT EXISTS os_veiculo_idx ON ordens_servico (veiculo_id);
CREATE INDEX IF NOT EXISTS os_status_idx ON ordens_servico (status);
CREATE INDEX IF NOT EXISTS mov_peca_idx ON movimentacoes_estoque (peca_id);
CREATE INDEX IF NOT EXISTS mov_os_idx ON movimentacoes_estoque (os_id);
CREATE INDEX IF NOT EXISTS pagamentos_os_idx ON pagamentos (os_id);

-- reaproveita a função criada na migração 001
DROP TRIGGER IF EXISTS trg_pecas_atualizado_em ON pecas;
CREATE TRIGGER trg_pecas_atualizado_em BEFORE UPDATE ON pecas
    FOR EACH ROW EXECUTE FUNCTION atualizar_data_atualizacao();
DROP TRIGGER IF EXISTS trg_orcamentos_atualizado_em ON orcamentos;
CREATE TRIGGER trg_orcamentos_atualizado_em BEFORE UPDATE ON orcamentos
    FOR EACH ROW EXECUTE FUNCTION atualizar_data_atualizacao();
DROP TRIGGER IF EXISTS trg_os_atualizado_em ON ordens_servico;
CREATE TRIGGER trg_os_atualizado_em BEFORE UPDATE ON ordens_servico
    FOR EACH ROW EXECUTE FUNCTION atualizar_data_atualizacao();

COMMIT;
```

Como "a quem pertence" cada registro (para filtrar o cliente):
`orcamento → diagnostico → agendamento.usuario_id` e `ordem_servico → veiculo.usuario_id`.

Valor total do orçamento = `SUM(quantidade * valor_unitario)` dos itens. Saldo a pagar da OS = total do orçamento aprovado − `SUM(valor)` dos pagamentos `pago`. Não guarde totais em coluna; calcule na consulta.

## 4. Etapas

Cada etapa = migração/backend + tela + teste. A ordem segue as dependências do cronograma do PDF (S2 → S5). Os padrões a seguir são os que já existem: `routes/` → `controllers/` (valida entrada) → `services/` (SQL com `database.query`).

### Etapa 0 — Autenticação de verdade (bloqueia todas as outras)
Hoje qualquer um chama a API e o frontend não sabe o perfil.

Backend
- [ ] `npm i jsonwebtoken` e `npm i -D @types/jsonwebtoken`; adicionar `JWT_SECRET` ao `.env` e ao `.env.example`.
- [ ] `login.controller.ts`: no sucesso, devolver `{ token, usuario: { id, nome, role } }` (o `loginService` já retorna esses dados).
- [ ] Criar `back/src/middlewares/auth.ts` com:
  - `autenticar`: lê `Authorization: Bearer <token>`, valida, coloca `{ id, role }` em `request.usuario`; senão 401.
  - `permitir(...roles)`: 403 se `request.usuario.role` não estiver na lista.
- [ ] `GET /api/me` (autenticado) — devolve o usuário logado. Serve para testar o middleware.

Frontend
- [ ] `services/auth.ts`: `authSession.start(token, usuario)` guarda os dois; `getUsuario()`; `post`/`get` passam a enviar o header `Authorization`; resposta 401 → `end()` e volta ao login.
- [ ] `App.tsx`: após login, `client` vai para o portal (`/portal`) e `employee`/`admin` para o painel (`/`). Guard de rota por perfil.
- [ ] `Sidebar.tsx`: lista de links filtrada pelo `role`.

Banco
- [ ] Criar o primeiro admin: cadastrar normalmente e rodar `UPDATE usuarios SET role = 'admin' WHERE email = '...';` no Neon.

Pronto quando: cliente logado não consegue abrir `/clientes` nem chamar `GET /api/clientes` (403).

### Etapa 1 — Migração 002
- [ ] Salvar o SQL da seção 3 em `back/database/migrations/002_oficina_operacao.sql` e aplicar no Neon (mesmo comando `psql` do `modelo-dados-sprint-2.md`, ou colar no SQL Editor do Neon).
- [ ] Confirmar que a 001 também está aplicada.

### Etapa 2 — Usuários, clientes e veículos (RF01, RF02)
Backend
- [ ] `GET/POST/PATCH /api/clientes` (`employee`, `admin`): listar com busca por nome/e-mail/telefone, criar, editar. Criar reaproveita `cadastroService.create` e a mesma validação do `cadastro.controller` (o funcionário define a senha inicial — ver seção 5).
- [ ] `PATCH /api/me/senha` (qualquer usuário logado): troca a senha confirmando a atual com `bcrypt.compare`.
- [ ] `GET/POST/PATCH /api/usuarios` (`admin`): criar funcionário/admin, mudar `role`, ativar/desativar (`ativo`). Evitar o admin se desativar.
- [ ] `GET/POST/PATCH /api/veiculos`: `client` só vê/cria os seus (`usuario_id` = token); funcionário informa o `usuario_id`.

Frontend
- [ ] Painel: tela Clientes (lista + formulário) com os veículos do cliente; tela Usuários (admin).
- [ ] Portal: "Meus veículos" e "Meu perfil" (trocar senha).

### Etapa 3 — Agendamentos (RF03)
- [ ] `POST /api/agendamentos`: cliente solicita (status `solicitado`); funcionário pode criar já `confirmado`.
- [ ] Antes de confirmar, checar conflito de horário: `SELECT 1 FROM agendamentos WHERE status IN ('confirmado','em_atendimento') AND inicio < $fim AND fim > $inicio`.
- [ ] `PATCH /api/agendamentos/:id/status`: funcionário confirma/recusa/inicia/conclui; cliente só cancela o próprio enquanto `solicitado`/`confirmado`.
- [ ] `GET /api/agendamentos?data=`: painel vê todos do dia; cliente só os seus.
- [ ] Telas: agenda do dia no painel; "Meus agendamentos" + formulário de solicitação no portal.

### Etapa 4 — Diagnóstico e orçamento (RF04, RF05)
- [ ] `POST /api/agendamentos/:id/diagnostico` (`employee`/`admin`, `mecanico_id` = token).
- [ ] `POST /api/orcamentos` com itens (peças do estoque com preço sugerido de `pecas.preco_venda` + mão de obra). Inserir orçamento e itens em **uma transação** (`database.connect()` → `BEGIN`/`COMMIT`/`ROLLBACK`).
- [ ] `GET /api/orcamentos` e `/:id` com itens e total; cliente só os seus.
- [ ] `PATCH /api/orcamentos/:id/resposta` (`client`, dono, status `pendente`): `aprovado` ou `recusado`, grava `respondido_em`.
- [ ] Telas: diagnóstico + montagem de orçamento no painel; "Orçamentos" com botões Aprovar/Recusar no portal.

### Etapa 5 — Estoque (RF07)
- [ ] `GET/POST/PATCH /api/pecas` (`employee`/`admin`); filtro `?abaixo_minimo=true` (`quantidade <= estoque_minimo`) = alerta de reposição.
- [ ] `POST /api/pecas/:id/movimentacoes`: na mesma transação insere a movimentação e faz `UPDATE pecas SET quantidade = quantidade ± $n`. O `CHECK (quantidade >= 0)` já impede saldo negativo — trate o erro `23514` como "estoque insuficiente".
- [ ] Tela Estoque: lista, cadastro, entrada/saída, destaque para estoque baixo.

### Etapa 6 — Ordens de serviço (RF06)
- [ ] `POST /api/ordens-servico` a partir de um orçamento `aprovado` (copia `veiculo_id` do agendamento).
- [ ] `PATCH /api/ordens-servico/:id`: status, mecânico, observações; ao ir para `concluida`, gravar `concluida_em`.
- [ ] `POST /api/ordens-servico/:id/pecas`: dá baixa no estoque (reusa a função da etapa 5 com `os_id`).
- [ ] `GET /api/ordens-servico` (painel: todas, filtro por status) e portal (só as suas, com status e peças usadas).
- [ ] Tela OS no painel; "Meus serviços" no portal.

### Etapa 7 — Pagamentos e histórico (RF08, RF09)
- [ ] `POST /api/ordens-servico/:id/pagamentos` e `PATCH /api/pagamentos/:id` (marcar `pago` com `pago_em`) — `employee`/`admin`.
- [ ] Na resposta da OS: `total`, `total_pago`, `saldo` e `situacao_pagamento` (`pago`/`pendente`). O cliente só **consulta**.
- [ ] `GET /api/veiculos/:id/historico`: OS concluídas/entregues do veículo com diagnóstico, itens e valores. Cliente só dos seus.
- [ ] Telas: registro de pagamento dentro da OS; histórico na página do veículo (painel e portal).

### Etapa 8 — Relatórios e dashboard (RF10)
- [ ] `GET /api/relatorios/...` (`admin`), com período `?de=&ate=`:
  - serviços: OS por status no período;
  - faturamento: soma de pagamentos `pago` por mês e por forma;
  - estoque: peças abaixo do mínimo e saídas no período;
  - desempenho: OS concluídas por mecânico e tempo médio (`concluida_em - aberta_em`).
- [ ] Dashboard com números reais (`GET /api/dashboard`): agendamentos de hoje, OS em andamento, orçamentos pendentes, peças com estoque baixo — os mesmos 4 cards que já estão no mock.

### Etapa 9 — Qualidade e entrega (EAP 6 e 7)
- [ ] Testes com o runner nativo do Node (`node --import tsx --test`), sem instalar framework. Prioridade, pelos indicadores do PDF:
  - permissões: cliente A não lê veículo/orçamento/OS do cliente B; cliente recebe 403 nas rotas do painel;
  - regras críticas: conflito de agenda, total do orçamento, baixa de estoque não fica negativa, saldo de pagamento.
- [ ] Rodar `npm run typecheck` (back), `npm run build` e `npm run lint` (front).
- [ ] Teste ponta a ponta manual do fluxo do PDF: cadastro → agendamento → diagnóstico → orçamento → aceite → OS → peças → pagamento → histórico → relatório.
- [ ] Deploy (Render + Neon), atualizar o README (rotas, perfis, variáveis `JWT_SECRET`) e a matriz de rastreabilidade RF01–RF10 → tela/endpoint/teste.

## 5. Decisões tomadas
1. **Cadastro de cliente pelos dois caminhos.** O PDF atribui à recepção "cadastrar clientes e veículos" (seção 2.1) e prevê "acesso e perfil" no portal (EAP 3.1), então os dois atendem:
   - o cliente se cadastra sozinho em `/create-account` (já pronto);
   - o funcionário cadastra o cliente que chega no balcão (etapa 2), definindo uma **senha inicial** e passando-a ao cliente, que depois a troca em "Meu perfil" (`PATCH /api/me/senha`, que exige a senha atual).
   - Descartado: deixar `senha_hash` nulo para o cliente "reivindicar" a conta depois. Quem soubesse o e-mail poderia tomar a conta, e isso exigiria fluxo de convite/e-mail.
2. **Sem permissões diferentes entre funcionários.** Todo `employee` vê e opera tudo do painel (clientes, agenda, diagnóstico, orçamento, OS, estoque, pagamentos). Sem coluna `cargo`. Só o `admin` tem a mais: gerenciar usuários e ver relatórios.
3. **Um mecânico por OS** (`ordens_servico.mecanico_id`).
