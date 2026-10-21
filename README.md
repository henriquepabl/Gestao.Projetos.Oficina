# Oficina+ — Sistema de Gestão Web para Oficina Mecânica

Sistema web para gestão de oficina mecânica, composto por uma interface administrativa (painel da oficina) e uma API REST. O frontend abriga o painel administrativo e o backend expõe os endpoints e a conexão com o banco PostgreSQL.

O projeto está em desenvolvimento: o layout e as rotas já existem, mas a maioria dos módulos ainda não foi implementada.

## Stack

| Camada    | Tecnologias                                                                 |
| --------- | --------------------------------------------------------------------------- |
| Frontend  | React 19, TypeScript, Vite 8, Tailwind CSS 4, React Router 7, Oxlint        |
| Backend   | Node.js, Express 5, TypeScript, `pg`, `dotenv`, `cors`, `tsx`               |
| Banco     | PostgreSQL (compatível com Neon)                                            |

## Estrutura do repositório

```text
.
├── back/
│   ├── src/
│   │   ├── database.ts        # Pool de conexões PostgreSQL
│   │   └── server.ts          # Aplicação Express e endpoints
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   └── Sidebar.tsx
│   │   ├── layouts/
│   │   │   └── AppLayout.tsx
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   └── EmConstrucao.tsx
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── .env.example
│   ├── package.json
│   └── vite.config.ts
├── docs/                      # Reservado para documentação
├── GPQS_Proposta_Integrada_Editavel.docx.pdf
└── README.md
```

## Pré-requisitos

- Node.js 20.19+ ou 22.12+ (compatível com o Vite 8)
- npm
- PostgreSQL local ou uma instância gerenciada (por exemplo, Neon)

## Configuração e execução

### Backend

```bash
cd back
npm install
cp .env.example .env
npm run dev
```

No Windows (Prompt de Comando), use `copy .env.example .env` no lugar de `cp`.

Variáveis de ambiente (`back/.env`):

| Variável       | Padrão                    | Descrição                                                        |
| -------------- | ------------------------- | ---------------------------------------------------------------- |
| `PORT`         | `3000`                    | Porta HTTP da API                                                |
| `FRONTEND_URL` | `http://localhost:5173`   | Origem permitida pelo CORS                                       |
| `DATABASE_URL` | —                         | String de conexão PostgreSQL; obrigatória para o health check    |

A API sobe em `http://localhost:3000`.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

No Windows (Prompt de Comando), use `copy .env.example .env` no lugar de `cp`.

Variável de ambiente (`frontend/.env`):

| Variável       | Padrão                  | Descrição                                              |
| -------------- | ----------------------- | ------------------------------------------------------ |
| `VITE_API_URL` | `http://localhost:3000` | URL da API; ainda não consumida pelo frontend          |

O frontend sobe em `http://localhost:5173`.

## Scripts

### Backend (`back/`)

| Comando             | Descrição                                      |
| ------------------- | ---------------------------------------------- |
| `npm run dev`       | Inicia a API com recarregamento automático     |
| `npm run typecheck` | Verifica os tipos com TypeScript sem emitir JS |

### Frontend (`frontend/`)

| Comando           | Descrição                                  |
| ----------------- | ------------------------------------------ |
| `npm run dev`     | Inicia o servidor de desenvolvimento Vite  |
| `npm run build`   | Verifica os tipos e gera o build de produção |
| `npm run lint`    | Executa o Oxlint                           |
| `npm run preview` | Pré-visualiza o build de produção          |

## API

| Método | Rota          | Descrição                                      |
| ------ | ------------- | ---------------------------------------------- |
| `GET`  | `/`           | Mensagem de boas-vindas da API                 |
| `GET`  | `/api/health` | Verifica o serviço e a conexão com o banco     |

Exemplo de resposta de `GET /`:

```json
{
  "message": "Bem-vindo à API da oficina!"
}
```

Exemplo de resposta de `GET /api/health`:

```json
{
  "status": "ok",
  "service": "oficina-api",
  "database": "connected"
}
```

Se a conexão com o banco falhar, o endpoint retorna HTTP 500 com `{"status":"error","database":"disconnected"}`.

## Rotas do frontend

| Rota               | Tela                        | Status                    |
| ------------------ | --------------------------- | ------------------------- |
| `/`                | Dashboard                   | Dados estáticos (mock)    |
| `/clientes`        | Clientes                    | Em construção             |
| `/agendamentos`    | Agendamentos                | Em construção             |
| `/ordens-servico`  | Ordens de serviço           | Em construção             |
| `/estoque`         | Estoque                     | Em construção             |

## Status e limitações

- O backend expõe apenas os endpoints de boas-vindas e health check; não há autenticação, CRUD ou migrações.
- O frontend ainda não consome a API; os indicadores do dashboard são estáticos.
- As telas de Clientes, Agendamentos, Ordens de serviço e Estoque são placeholders.