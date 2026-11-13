# Status report — autenticação e acesso ao painel

**Projeto:** Oficina+ — Sistema de Gestão Web para Oficina Mecânica  
**Fase documentada:** interface de login, criação de conta e controle de navegação  
**Data do registro:** 13/11/2026  
**Situação:** implementação inicial concluída; autenticação ainda requer endurecimento antes de ser considerada pronta para produção.

## Resumo

Nesta fase foram incorporadas ao frontend as telas de login e criação de conta e conectados os formulários à API Node/Express. O backend passou a oferecer cadastro de clientes com senha armazenada em hash bcrypt. As rotas do painel agora redirecionam para o login quando a sessão do navegador não está marcada como ativa.

Durante a execução, o formulário de cadastro retornou “não foi possível se conectar ao servidor”. A causa observada foi a API não estar em execução. Após iniciar o backend, o health check respondeu com estado `ok` e banco `connected`.

## Entregas realizadas

### Frontend

- Tela responsiva de login em `/login`.
- Tela responsiva de criação de conta em `/create-account`; `/cadastro` redireciona para essa tela.
- Formulários conectados à API por `VITE_API_URL` (no ambiente atual: `http://localhost:3000`).
- Estados de carregamento e apresentação de mensagens de erro.
- Validação de campos obrigatórios, mínimo de oito caracteres para senha e confirmação de senha no cadastro.
- Controle de exibição da senha.
- Rotas do painel (`/`, `/clientes`, `/agendamentos`, `/ordens-servico` e `/estoque`) condicionadas à sessão do navegador. Sem a marca de sessão, a aplicação redireciona para `/login`; após autenticar, retorna à rota solicitada.
- Ação “Sair da conta”, que encerra a sessão local e retorna ao login.

### Backend

- `POST /api/login`: valida e-mail e senha e confere a senha com o hash armazenado.
- `POST /api/cadastro`: valida os dados, normaliza o e-mail, cria o usuário com perfil `client` e grava o hash da senha com bcrypt.
- Respostas específicas para dados inválidos, e-mail já cadastrado e falha interna.
- Rotas adicionadas ao servidor Express existente.

### Banco e arquitetura

- O cadastro usa a tabela `usuarios` prevista em `back/database/migrations/001_cadastros_agenda.sql`.
- A senha em texto puro não é persistida. O cadastro grava `senha_hash`; o login compara a senha informada com bcrypt.
- A solução mantém a arquitetura prevista para o projeto: React/TypeScript/Vite no frontend, Node.js/Express/TypeScript no backend e PostgreSQL como banco relacional.

## Evidências e validação realizada

- O backend iniciou com `npm run dev` e informou que estava servindo em `http://localhost:3000`.
- `GET /api/health` respondeu `200 OK` com `{"status":"ok","service":"oficina-api","database":"connected"}`.
- A indisponibilidade inicial do cadastro foi associada ao backend parado; a URL do frontend e a porta configurada no backend estavam ambas em `3000`.
- Não foi executado fluxo completo de cadastro/login pela interface, nem build, lint ou testes automatizados nesta fase. A resposta do health check comprova disponibilidade da API e conexão com o banco, mas não comprova, isoladamente, que a migração foi aplicada ou que o cadastro ponta a ponta funciona.

## Como executar localmente

O `npm run dev` deve ser executado dentro de cada pacote, pois a raiz do repositório não possui `package.json` com script `dev`.

Terminal 1 — API:

```sh
cd /home/mrcarvalho/Temp/Gestao.Projetos.Oficina/back
npm run dev
```

Terminal 2 — interface:

```sh
cd /home/mrcarvalho/Temp/Gestao.Projetos.Oficina/frontend
npm run dev
```

A interface fica em `http://localhost:5173` e a API, por padrão, em `http://localhost:3000`. O backend requer `back/.env` com `DATABASE_URL`; o frontend usa `frontend/.env` com `VITE_API_URL=http://localhost:3000`. O CORS do backend usa `FRONTEND_URL`, cujo padrão é `http://localhost:5173`.

Se o formulário mostrar erro de conexão, confirmar que o processo do backend está ativo, que a porta da API corresponde a `VITE_API_URL` e que o terminal do backend não encerrou com erro.

## Pendências e limitações

1. **Sessão apenas no frontend:** `sessionStorage` guarda uma marca local de sessão depois que a API aceita o login. Ela é encerrada ao fechar a aba ou sair, mas pode ser alterada pelo próprio navegador; portanto, é um controle de navegação para o protótipo, não uma credencial segura.
2. **Sem token ou cookie de autenticação:** o endpoint de login não emite JWT nem configura cookie de sessão. As APIs ainda não autenticam requisições nem verificam perfil/permissões.
3. **Proteção server-side pendente:** aplicar middleware de autenticação/autorização às futuras rotas privadas e garantir que dados do cliente sejam filtrados pelo usuário autenticado. Não liberar o sistema para uso real com dados de clientes antes dessa etapa.
4. **Recuperação de senha:** o link atual abre contato por e-mail; não há fluxo de redefinição implementado.
5. **Validar integração completa:** aplicar/confirmar a migração no banco de desenvolvimento e percorrer cadastro, login, rejeição de credenciais incorretas, e-mail duplicado, redirecionamento de rota protegida e logout.
6. **Verificação técnica:** executar build e lint do frontend e typecheck do backend, corrigindo eventuais erros antes de considerar a entrega homologada.

## Próximas ações sugeridas

- Adicionar emissão e validação de sessão no backend (cookie seguro ou token com estratégia de armazenamento definida) e middleware de autorização.
- Validar o cadastro e login ponta a ponta com a migração aplicada.
- Definir o destino pós-login por perfil (`client`, `employee`, `admin`) e separar o portal do cliente do painel administrativo conforme os requisitos do produto.
- Registrar evidências dos testes e atualizar o status report com bloqueios, responsáveis e previsão após a validação da equipe.
