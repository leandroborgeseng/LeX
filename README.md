# LeX Finance

Monorepo **full stack** para controle financeiro **pessoal (PF)** e **empresarial (PJ)** com visão consolidada, fluxo de caixa, recorrências, cartões, financiamentos, contratos, folha simplificada, transferências internas, relatórios e projeções.

## Stack

| Camada    | Tecnologia                                      |
|----------|--------------------------------------------------|
| Backend  | NestJS 10, TypeScript, Prisma 6, SQLite         |
| Frontend | React 18, Vite 6, TypeScript, Tailwind, shadcn-style (Radix + CVA) |
| Auth     | JWT (login e-mail + senha)                       |
| API docs | Swagger em `/api/docs`                           |

## Estrutura

```
apps/
  api/     → NestJS + Prisma + pasta public/ (frontend build em produção)
  web/     → React + Vite + Tailwind
prisma/    → (schema em apps/api/prisma)
```

## Pré-requisitos

- Node.js 20+
- [pnpm](https://pnpm.io) 9 (`corepack enable` ou `npm i -g pnpm`)

## Configuração local

1. Clone o repositório e instale dependências na raiz:

   ```bash
   pnpm install
   ```

2. Crie `apps/api/.env` (veja `apps/api/.env.example`):

   ```env
   PORT=3000
   JWT_SECRET=uma-chave-segura
   DATABASE_URL=file:./dev.db
   ```

3. Aplique migrações e seed:

   ```bash
   cd apps/api
   npx prisma migrate dev
   npx prisma db seed
   ```

   Ou, na raiz:

   ```bash
   pnpm db:migrate
   pnpm db:seed
   ```

   > O seed cria o usuário **admin@lex.local** / **admin123**, entidades PF/PJ seed, membros, categorias, fontes pagadoras e contratos Microblau, Unimed e FIPEC (valores zerados para edição).

4. Desenvolvimento (API + frontend com proxy):

   ```bash
   pnpm dev
   ```

   - Frontend: http://localhost:5173 (proxy `/api` → API)
   - API: http://localhost:3000  
   - Swagger: http://localhost:3000/api/docs  

5. Build unificado (frontend copiado para `apps/api/public`):

   ```bash
   pnpm build
   ```

6. Produção local (um único processo servindo API + estáticos):

   ```bash
   cd apps/api
   pnpm start:prod
   ```

   Abra http://localhost:3000 — a SPA é servida na raiz e a API em `/api`.

## Docker

Build da imagem na raiz do projeto:

```bash
docker build -t lex-finance .
```

Execução:

```bash
docker run -p 3000:3000 -e JWT_SECRET=sua-chave -v lex_data:/data lex-finance
```

- `PORT` pode ser sobrescrito (Railway injeta `PORT`).
- SQLite persistente: `DATABASE_URL=file:/data/app.db` (padrão na imagem). Monte um volume em **`/data`**.

Na primeira subida, rode o seed **uma vez** (com o container em execução ou `docker run` com comando alternativo):

```bash
docker exec -it <container> sh -c "cd /app/apps/api && npx prisma db seed"
```

## Deploy no Railway

1. Crie um projeto e conecte o repositório (ou use CLI).
2. Adicione um **volume** montado em **`/data`** para persistir o SQLite.
3. Variáveis sugeridas:
   - `JWT_SECRET` — obrigatório em produção.
   - `DATABASE_URL=file:/data/app.db` (já é o padrão do `Dockerfile`; reforce se necessário).
   - `PORT` — definido automaticamente pelo Railway.
4. O arquivo `railway.json` aponta para o `Dockerfile` na raiz.
5. Após o primeiro deploy, execute o seed (Railway → service → **Shell** ou comando one-off):

   ```bash
   cd apps/api && npx prisma db seed
   ```

6. Acesse a URL pública: interface web na raiz, API em `/api`, documentação em `/api/docs`.

## Scripts npm (raiz)

| Script        | Descrição                                      |
|---------------|------------------------------------------------|
| `pnpm dev`    | API (watch) + Vite em paralelo                 |
| `pnpm build`  | Build web + Nest + cópia do frontend para API  |
| `pnpm start`  | `node dist/main` do pacote `@lex/api`          |
| `pnpm db:generate` | `prisma generate`                         |
| `pnpm db:migrate`  | `prisma migrate deploy` (CI/prod)         |
| `pnpm db:push`     | `prisma db push` (apenas dev)             |
| `pnpm db:seed`     | Executa o seed                            |

## Regras de negócio principais (API)

- **Entidades** `PF` e `PJ`; relatórios e DRE aceitam escopo `PF`, `PJ` ou `CONSOLIDADO`.
- **Transferências internas** não são receita/despesa operacional; entram no **saldo de contas** via movimentação entre contas.
- **Recorrência**: receitas/despesas `RECORRENTE` com `recurrenceFrequency` e `futureOccurrences` geram linhas futuras; `POST .../regenerate-future` remove ocorrências **PREVISTO** futuras do template e recria.
- **Financiamentos**: geração automática da tabela (SAC ou PRICE); pagamento de parcela atualiza saldo e totais; `POST .../regenerate-installments` recalcula parcelas **não pagas**.
- **Cartão**: compras podem ser parceladas; faturas por mês/ano com total atualizado; totais por categoria e por originador expostos na API.

## Documentação da API

Swagger UI: **`/api/docs`** (autentique com **Authorize** usando o token retornado em `POST /api/auth/login`).

## Licença

Uso privado / projeto pessoal.
