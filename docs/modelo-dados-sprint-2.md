# Modelo de dados — Sprint 2

## Escopo

Este primeiro recorte cobre os pacotes do plano ligados a acesso e perfil (EAP 3.1),
veículos e histórico (3.2), solicitação de agendamentos (3.3), cadastros internos
(4.1–4.2) e banco/perfis (5.1–5.2). O PDF prevê essas entregas na Sprint 2
(semanas 3–4), após requisitos, protótipos, arquitetura e modelo de dados da Sprint 1.

## Tabelas

| Tabela | Responsabilidade | Relações principais |
| --- | --- | --- |
| `usuarios` | Conta, credenciais, estado e perfil de acesso | Um usuário pode possuir vários veículos e solicitar vários agendamentos |
| `veiculos` | Marca, modelo, ano, placa e quilometragem | Cada veículo pertence a um usuário |
| `agendamentos` | Pedido e horário de atendimento, estado e atendente opcional | Liga o cliente ao seu veículo; pode indicar o atendente responsável |

`agendamentos` tem uma chave estrangeira composta para assegurar que o veículo
selecionado pertence ao usuário que fez o pedido. A API ainda deve validar que o
usuário autenticado só consulta/edita os próprios veículos e agendamentos.

## Perfis (`usuarios.role`)

O campo `role` possui exatamente três valores: `client`, `employee` e `admin`.

| Role | Acesso esperado |
| --- | --- |
| `client` | Consultar e manter seus próprios veículos; solicitar e acompanhar os próprios agendamentos e, nos módulos futuros, seus orçamentos, ordens de serviço e histórico |
| `employee` | Operar cadastros e agenda da oficina, atender solicitações e executar as funções internas autorizadas |
| `admin` | Gerenciar usuários e configurações, além do acesso interno de gestão |

Recepção, mecânicos e gestão aparecem como funções distintas no documento do
projeto, mas aqui compartilham o role `employee` para respeitar os três valores
solicitados. O role define o limite geral do acesso; autorização por operação
(por exemplo, editar estoque ou registrar diagnóstico) deve ser aplicada na API.
Se a equipe precisar de permissões distintas entre funcionários, isso deve ser
decidido antes desses módulos e pode ser acrescentado como `cargo`/permissões sem
criar um quarto valor em `role`.

## Decisões e cuidados

- `senha_hash` guarda somente o hash produzido pelo backend (bcrypt); nunca a senha em texto puro. O tamanho é `TEXT`, pois o formato do hash pode mudar.
- E-mail é único sem diferenciar maiúsculas/minúsculas. A aplicação deve gravá-lo normalizado, por exemplo em minúsculas.
- A remoção de usuário/veículo é restrita quando há dados dependentes; prefira desativar contas e manter o histórico.
- `atendente_id` é opcional enquanto o pedido aguarda triagem. O backend deve verificar que, quando preenchido, aponta para `employee` ou `admin` ativo.
- O banco não impede sobreposição de horários entre agendamentos. Antes de confirmar um horário, a API deve validar disponibilidade; se necessário, uma regra de exclusão PostgreSQL será definida quando duração e recursos (elevador/mecânico) forem especificados.
- Os nomes dos estados são internos; a interface pode exibi-los em português legível.

## Próximo passo recomendado

1. Aplicar `back/database/migrations/001_cadastros_agenda.sql` ao banco de desenvolvimento.
2. Ajustar o login para usar somente `role` e garantir criação de conta com hash de senha.
3. Implementar CRUD autenticado de veículos e criação/listagem/cancelamento de agendamentos, sempre filtrando dados de cliente pelo ID do usuário autenticado.
4. Validar disponibilidade e transições de status com a equipe da oficina antes de construir a agenda interna.
5. Atualizar este documento e o diagrama do modelo quando diagnóstico, orçamento e ordem de serviço forem modelados na Sprint 3/4.

## Execução da migração

Com `DATABASE_URL` configurada no backend, pode-se executar a partir da raiz do
repositório:

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f back/database/migrations/001_cadastros_agenda.sql
```
