# Oficina+ — Sistema de Gestão Web para Oficina Mecânica

Sistema web para oficina mecânica com **portal do cliente** e **painel da oficina** sobre a mesma API REST e o mesmo banco PostgreSQL (Neon). Cobre o fluxo do documento do projeto: cadastro → agendamento → diagnóstico → orçamento → aceite → ordem de serviço → peças → pagamento registrado → histórico e relatórios (RF01–RF10).

## Stack

| Camada    | Tecnologias                                                                 |
| --------- | --------------------------------------------------------------------------- |
| Frontend  | React 19, TypeScript, Vite 8, Tailwind CSS 4, React Router 7, Oxlint        |
| Backend   | Node.js, Express 5, TypeScript, `pg`, `bcrypt`, `jsonwebtoken`, `tsx`       |
| Banco     | PostgreSQL (Neon)                                                           |
| Testes    | Runner nativo do Node (`node --test`)                                       |

## Perfis

| Perfil (`role`) | O que faz |
| --- | --- |
| `client` | Cadastra os próprios veículos, solicita/cancela agendamentos, aprova ou recusa orçamentos, acompanha as próprias OS, consulta se o pagamento foi feito e vê o histórico do veículo. Só enxerga os próprios dados. |
| `employee` | Tudo do painel: clientes, veículos, agenda, diagnóstico, orçamentos, OS, estoque e registro de pagamentos. |
| `admin` | Tudo do `employee` + relatórios (RF10) e gestão de usuários (criar funcionário, mudar perfil, ativar/desativar). |

O cliente pode criar a própria conta em `/create-account` ou ser cadastrado no balcão pelo funcionário (com senha inicial, que ele troca em "Meu perfil"). Pagamentos são apenas **registrados** (valor, forma, pago/pendente); o recebimento acontece fora do sistema.

## Estrutura

```text
back/
  database/migrations/   001 (usuários, veículos, agendamentos) e 002 (diagnóstico, orçamento, OS, estoque, pagamentos)
  database/migrate.ts    aplica as migrações em ordem (idempotentes)
  src/
    middlewares/auth.ts  JWT: autenticar, permitir(...roles), dono()
    http.ts              validação de entrada e tratamento central de erros
    regras.ts            regras de negócio puras (transições de status, saldo)
    routes/ controllers/ services/   um trio por módulo
  test/                  testes unitários (*.test.ts) e fluxo completo (*.e2e.ts)
frontend/src/
  pages/                 uma tela por módulo; a mesma tela muda conforme o perfil
  components/            Sidebar (menu por perfil) e peças de UI
  lib/util.ts            formatação e hooks de carregamento
  services/auth.ts       cliente HTTP com token e sessão
docs/                    modelo de dados, plano de implementação e status reports
```

## Configuração e execução

Pré-requisitos: Node.js 20.19+ ou 22.12+ e um banco PostgreSQL (Neon).

### Backend

```bash
cd back
npm install
cp .env.example .env     # preencha DATABASE_URL e JWT_SECRET
npm run migrate          # cria/atualiza as tabelas
npm run dev
```

| Variável       | Padrão                  | Descrição |
| -------------- | ----------------------- | --------- |
| `PORT`         | `3000`                  | Porta da API |
| `FRONTEND_URL` | `http://localhost:5173` | Origem permitida pelo CORS |
| `DATABASE_URL` | —                       | Conexão PostgreSQL (obrigatória) |
| `JWT_SECRET`   | —                       | Segredo dos tokens de login (obrigatório; use um valor longo e aleatório, ex.: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`) |

### Frontend

```bash
cd frontend
npm install
cp .env.example .env     # VITE_API_URL=http://localhost:3000
npm run dev
```

### Primeiro administrador

Crie a conta pela tela de cadastro e promova-a no SQL Editor do Neon:

```sql
UPDATE usuarios SET role = 'admin' WHERE email = 'seu-email@exemplo.com';
```

Depois disso, o admin cadastra os funcionários pela tela **Usuários**.

## Scripts

| Onde | Comando | Descrição |
| --- | --- | --- |
| `back/` | `npm run dev` | API com recarregamento automático |
| `back/` | `npm run migrate` | Aplica as migrações no `DATABASE_URL` |
| `back/` | `npm test` | Testes unitários (regras de negócio, validação e permissões do middleware) |
| `back/` | `npm run test:e2e` | Fluxo completo RF01–RF10 + isolamento entre clientes. Precisa da API rodando (`API_URL`, padrão `http://localhost:3000`); cria dados `e2e-*@teste.local` e apaga no fim |
| `back/` | `npm run typecheck` | Verificação de tipos |
| `frontend/` | `npm run build` / `npm run lint` | Build de produção / Oxlint |

## API

Todas as rotas (exceto login, cadastro e health) exigem `Authorization: Bearer <token>`. "Todos" = qualquer perfil logado; o cliente só recebe os próprios registros.

| Método | Rota | Perfis | RF |
| --- | --- | --- | --- |
| POST | `/api/cadastro` · `/api/login` | público | — |
| GET · PATCH | `/api/me` · `/api/me/senha` | todos | — |
| GET · POST · GET/PATCH `:id` | `/api/clientes` | equipe | RF01 |
| GET · POST · PATCH | `/api/usuarios` | admin | — |
| GET | `/api/equipe` | equipe | — |
| GET · POST · GET/PATCH `:id` | `/api/veiculos` | todos | RF02 |
| GET | `/api/veiculos/:id/historico` | todos | RF09 |
| GET · POST · GET `:id` | `/api/agendamentos` | todos | RF03 |
| GET | `/api/agendamentos/ocupados?data=` | todos | RF03 |
| PATCH | `/api/agendamentos/:id/status` | todos (cliente só cancela) | RF03 |
| POST | `/api/agendamentos/:id/diagnostico` | equipe | RF04 |
| GET · GET `:id` | `/api/orcamentos` | todos | RF05 |
| POST · PATCH `:id/cancelar` | `/api/orcamentos` | equipe | RF05 |
| PATCH | `/api/orcamentos/:id/resposta` | cliente (aprovar abre a OS) | RF05 |
| GET · GET `:id` | `/api/ordens-servico` | todos | RF06 |
| PATCH `:id` · POST `:id/pecas` | `/api/ordens-servico` | equipe | RF06/RF07 |
| GET · POST · PATCH `:id` · GET/POST `:id/movimentacoes` | `/api/pecas` | equipe | RF07 |
| POST `:id/pagamentos` · PATCH `/api/pagamentos/:id` | `/api/ordens-servico` | equipe | RF08 |
| GET | `/api/dashboard` | equipe | — |
| GET | `/api/relatorios?de=&ate=` | admin | RF10 |
| GET | `/api/health` | público | — |

## Regras importantes

- **Isolamento de dados (R06):** rotas de cliente filtram pelo id do token, nunca por id enviado na requisição; o banco também garante (FK composta) que o veículo do agendamento é do mesmo cliente.
- **Agenda:** a oficina atende até `CAPACIDADE_OFICINA` (3) veículos ao mesmo tempo; confirmar acima disso retorna 409. Ajuste em `back/src/regras.ts`.
- **Estoque (R10):** movimentação e saldo são gravados na mesma transação; saldo negativo é bloqueado pelo banco. Peça usada na OS é uma saída vinculada à OS.
- **Status:** transições válidas de agendamento e OS ficam em `back/src/regras.ts` (cobertas por testes).
- **Sessão:** token JWT de 8 h guardado no `sessionStorage` (fecha ao fechar a aba).
