# Frontend — Oficina+

Interface web do sistema de gestão da oficina mecânica. Para configuração completa do projeto (backend, banco e variáveis de ambiente), consulte o [README principal](../README.md).

## Stack

- React 19 + TypeScript
- Vite 8
- Tailwind CSS 4
- React Router 7
- Oxlint

## Comandos

```bash
npm install
cp .env.example .env
npm run dev
```

| Comando           | Descrição                                   |
| ----------------- | ------------------------------------------- |
| `npm run dev`     | Servidor de desenvolvimento em `:5173`      |
| `npm run build`   | Verificação de tipos e build de produção    |
| `npm run lint`    | Executa o Oxlint                            |
| `npm run preview` | Pré-visualiza o build de produção           |

A variável `VITE_API_URL` está definida em `.env.example`, mas ainda não é consumida pela aplicação.
