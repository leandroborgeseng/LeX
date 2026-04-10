# LeX Finance

Monorepo **full stack** para controle financeiro **pessoal (PF)** e **empresarial (PJ)** com visão consolidada, fluxo de caixa, recorrências, cartões, financiamentos, contratos, folha simplificada, transferências internas, relatórios e projeções.

## Stack

| Camada    | Tecnologia                                      |
|----------|--------------------------------------------------|
| Backend  | NestJS 10, TypeScript, Prisma 6, SQLite         |
| Frontend | React 18, Vite 6, TypeScript, Tailwind, shadcn-style (Radix + CVA) |
| Auth     | JWT (login e-mail + senha)                       |
| API docs | Swagger em `/api/docs`                           |
| Mobile   | Layout responsivo, barra inferior + menu, **PWA** (instalar no ecrã inicial) |
| Offline  | Fila local (IndexedDB) para **POST/PUT/PATCH/DELETE** sem rede; sincroniza ao voltar online (não faz cache de leituras da API) |

## Estrutura

```
docker/
  entrypoint.sh   → arranque do container (migrações + node dist/main)
apps/
  api/            → NestJS + Prisma + public/ (SPA após pnpm build na raiz)
  web/            → React + Vite + Tailwind
  (API) cdb-applications → CDB indexado a % do CDI + projeção / IR regressivo
Dockerfile        → imagem única (API + estáticos + SQLite em /data)
docker-compose.yml → um serviço `app`, volume `lex_sqlite` → /data
```

## Pré-requisitos

- Node.js 20+
- [pnpm](https://pnpm.io) 9 (`corepack enable` ou `npm i -g pnpm`)

## Configuração local

1. Clone o repositório e instale dependências na raiz:

   ```bash
   pnpm install
   pnpm db:generate
   ```

   > No Docker, o `COPY apps` ocorre **antes** do `pnpm install`, então o schema Prisma já existe no install. **Localmente**, após o primeiro `pnpm install`, rode `pnpm db:generate` se o client ainda não foi gerado.

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

### Celular e PWA

- No **telefone**, use o Safari (iOS) ou Chrome (Android), faça login e no menu do browser escolha **Adicionar ao ecrã inicial** / **Instalar app**. O `vite-plugin-pwa` regista o service worker (interface em cache; **dados financeiros** continuam a vir da API em tempo real).
- **Sem rede**: criar/editar registos que usem `POST`/`PUT`/`PATCH`/`DELETE` (exceto login) é guardado na **fila**; quando a ligação voltar, a app tenta **sincronizar** automaticamente ou pode tocar em **Sincronizar** na barra amarela. **Receitas** mostram mensagem quando o envio fica na fila.
- O login **não** é guardado offline por segurança.

## Docker (container único)

Tudo corre num **só** processo Node: a API expõe `/api` e serve o build do Vite a partir de `apps/api/public` (preenchido pelo `pnpm build` na imagem).

**Na raiz do repositório:**

| Comando | Descrição |
|--------|-----------|
| `pnpm docker:build` | `docker build -t lex-finance .` |
| `pnpm docker:up` | `docker compose up --build` (porta host `LEX_PORT`, default 3000) |
| `pnpm docker:run` | `docker run` rápido com volume `lex_sqlite` |

Compose (recomendado para local):

```bash
pnpm docker:up
# ou: LEX_PORT=8080 LEX_JWT_SECRET=minha-chave docker compose up --build
```

Manual:

```bash
docker build -t lex-finance .
docker run -p 3000:3000 -e JWT_SECRET=sua-chave -v lex_data:/data lex-finance
```

- `PORT` pode ser sobrescrito (Railway injeta `PORT`); dentro do Compose o serviço usa `3000` interno.
- SQLite persistente: `DATABASE_URL=file:/data/app.db` (padrão na imagem). Monte um volume em **`/data`**.
- Entrypoint: `docker/entrypoint.sh` (copiado para `/usr/local/bin/lex-entrypoint.sh` na imagem). Após `migrate deploy`, se **não existir nenhum utilizador** (volume SQLite novo), corre o **seed automaticamente** (`admin@lex.local` / `admin123`). Para desativar: `LEX_SKIP_AUTO_SEED=1`.

Se a base **já tem utilizadores** e precisar de correr o seed manualmente (raro):

```bash
docker exec -it <container> sh -c "cd /app/apps/api && LEX_ALLOW_SEED_IN_PROD=1 npx prisma db seed"
```

## Deploy no Railway

**Importante (monorepo):**

- Use **um único serviço** com o **`Dockerfile` na raiz** do repositório. A API sobe e serve o frontend estático; não é necessário um serviço separado só para `@lex/web`.
- Se nos logs aparecer **`VITE … localhost:5173`** ou **`@lex/web dev`**, o Railway está a subir o **Vite em modo dev** (serviço com Root em `apps/web`, Nixpacks ou comando `pnpm dev`). **Apague esse serviço** ou mude para **Dockerfile na raiz** com Root **vazio**. O arranque correcto mostra `LeX: migrando…` / `LeX API em http://0.0.0.0:…`.
- Em **Settings → Root Directory**, deixe **vazio** (raiz do repo). Se estiver `apps/web`, o build pode usar contexto errado e falhar ou ficar desatualizado.
- Garanta que o deploy use o branch **`main`** (ou o branch onde você fez push das correções do Docker). Após mudanças no `Dockerfile`, use **Redeploy** (e, se existir, limpe cache de build).
- A mensagem **subscription is past due** é cobrança da conta Railway: regularize o pagamento ou os deploys podem falhar.
- O **`Dockerfile` copia `apps/` antes de `pnpm install`**, para o schema em `apps/api/prisma` existir durante o install (evita o erro `Could not find Prisma Schema` em builds antigos em cache).

1. Crie um projeto e conecte o repositório (ou use CLI).
2. Adicione um **volume** montado em **`/data`** para persistir o SQLite. Sem volume (ou com caminho errado), o SQLite pode falhar com **Unable to open the database file** (erro 14). A imagem usa um entrypoint que verifica se `/data` é gravável antes de migrar e subir a API.
3. Variáveis sugeridas:
   - `JWT_SECRET` — obrigatório em produção.
   - `DATABASE_URL=file:/data/app.db` (já é o padrão do `Dockerfile`; reforce se necessário).
   - `PORT` — definido automaticamente pelo Railway.
4. O arquivo `railway.json` aponta para o `Dockerfile` na raiz.
5. **Primeiro deploy:** com volume em `/data` vazio, o entrypoint aplica migrações e **cria o utilizador seed** sozinho (não precisa de `docker exec` nem variáveis extra no Railway). Login: `admin@lex.local` / `admin123` — altere a senha depois. Com base já populada, o seed **não** volta a correr.

6. Em **Settings → Networking**, gere um **domínio público** (ou use o que o Railway atribui). Serviço só com rede interna ou URL errada costuma aparecer como *Application failed to respond*. Health check: `GET /health` → `ok`.
7. Acesse a URL pública: interface web na raiz, API em `/api`, documentação em `/api/docs`.

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
| `pnpm docker:build` | Imagem Docker única na raiz            |
| `pnpm docker:up`   | Compose: um serviço `app` + volume SQLite |
| `pnpm docker:run`  | `docker run` com volume nomeado         |

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
