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

   **Senha:** em desenvolvimento local, se não definir `LEX_SEED_PASSWORD`, o seed usa a senha **`lex-local-dev`** (apenas para ambiente não produtivo). Para **definir ou repor** a senha do utilizador seed, execute de novo o seed com uma variável de ambiente:

   ```bash
   LEX_SEED_PASSWORD='a-sua-nova-senha' pnpm db:seed
   ```

   Opcional: `LEX_SEED_EMAIL=email@exemplo.com` para criar/atualizar outro e-mail.

   > O seed cria o utilizador **leandro.borges@me.com** (ou o definido em `LEX_SEED_EMAIL`), entidades PF/PJ seed, membros, categorias, fontes pagadoras e contratos Microblau, Unimed e FIPEC (valores zerados para edição).

   **Docker / produção (primeiro arranque):** defina **`LEX_SEED_PASSWORD`** no ambiente (o `docker-compose` do repo usa o default `lex-docker-seed` se não passar outra). Sem a variável num deploy “nu” (`docker run` sem `-e`), o seed automático falha quando a base ainda não tem utilizadores.

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
docker run -p 3000:3000 -e JWT_SECRET=sua-chave -e LEX_SEED_PASSWORD=sua-senha-seed -v lex_data:/data lex-finance
```

- `PORT` pode ser sobrescrito (Railway injeta `PORT`); dentro do Compose o serviço usa `3000` interno.
- SQLite persistente: `DATABASE_URL=file:/data/app.db` (padrão na imagem). Monte um volume em **`/data`**.
- Entrypoint: `docker/entrypoint.sh` (copiado para `/usr/local/bin/lex-entrypoint.sh` na imagem). Após `migrate deploy`, se **não existir nenhum utilizador** (volume SQLite novo), corre o **seed automaticamente** — em produção é **obrigatório** definir **`LEX_SEED_PASSWORD`** (o `docker-compose` local usa o default `lex-docker-seed` se não passar outra). Para desativar: `LEX_SKIP_AUTO_SEED=1`.

Se a base **já tem utilizadores** e precisar de correr o seed manualmente (raro):

```bash
docker exec -it <container> sh -c "cd /app/apps/api && LEX_ALLOW_SEED_IN_PROD=1 LEX_SEED_PASSWORD='nova-senha' npx prisma db seed"
```

O seed atual remove o utilizador legado `admin@lex.local` (se existir) e garante o utilizador definido em `seed.ts`. Útil após mudar o e-mail/senha do bootstrap sem apagar o volume.

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
   - **`LEX_SEED_PASSWORD`** — obrigatório no **primeiro arranque** (base vazia); define a senha do utilizador seed. Depois do login, pode alterar no ecrã de perfil. **Não commite a senha no Git:** defina-a no painel do Railway (**Variables**) ou use o workflow em `.github/workflows/railway-lex-seed-password.yml` com **GitHub Secrets** (ver abaixo).
   - `DATABASE_URL=file:/data/app.db` (já é o padrão do `Dockerfile`; reforce se necessário).
   - `PORT` — definido automaticamente pelo Railway.

**GitHub Actions (sem acesso ao painel Railway):** no repositório, em **Settings → Secrets and variables → Actions**, crie:

| Secret | Conteúdo |
|--------|----------|
| `RAILWAY_TOKEN` | Token de projeto: Railway → Project → **Settings → Tokens** |
| `RAILWAY_SERVICE_ID` | ID do serviço Docker (ou nome, conforme o CLI aceitar) — visível na URL ou em **Settings** do serviço |
| `LEX_SEED_PASSWORD` | A senha desejada para o utilizador seed (ex.: a que usa no login) |
| `RAILWAY_ENVIRONMENT` | (opcional) Nome do ambiente, ex. `production`; se omitir, usa-se `production` |

Depois: **Actions → “Railway — LEX_SEED_PASSWORD” → Run workflow**. Com a opção *run prisma seed* ativa (padrão), o job grava a variável no Railway **sem disparar deploy imediato** (`--skip-deploys`) e corre `prisma db seed` via `railway ssh` para atualizar o hash na base já existente. Desative *run prisma seed* só se quiser apenas guardar a variável para o próximo deploy.
4. O arquivo `railway.json` aponta para o `Dockerfile` na raiz.
5. **Primeiro deploy:** com volume em `/data` vazio, o entrypoint aplica migrações e **cria o utilizador seed** (e-mail por defeito `leandro.borges@me.com`, ou `LEX_SEED_EMAIL`). Com base **já** populada, mudar só `LEX_SEED_PASSWORD` no painel **não** altera o hash na SQLite. Para **sincronizar a senha** sem SSH: defina **`LEX_RUN_SEED_ON_BOOT=1`**, confirme `LEX_SEED_PASSWORD` (e opcionalmente `LEX_SEED_EMAIL`), faça **Redeploy**, faça login e **apague** `LEX_RUN_SEED_ON_BOOT`. Alternativa: workflow GitHub ou `docker exec` com seed (secção Docker).

6. Em **Settings → Networking**, gere um **domínio público** (ou use o que o Railway atribui). Serviço só com rede interna ou URL errada costuma aparecer como *Application failed to respond*. Health check: `GET /health` → `ok`.
7. Acesse a URL pública: interface web na raiz, API em `/api`, documentação em `/api/docs`.

### Login devolve “e-mail ou senha incorretos”

**Diagnóstico rápido no Railway:** nas **Variables** do serviço, adicione temporariamente `LEX_VERBOSE_LOGIN_ERRORS` = `1` e faça **Redeploy**. No login, a API passa a responder com **“Não existe utilizador com este e-mail.”** ou **“Senha incorreta.”** em vez da mensagem genérica. Remova a variável depois de resolver.

1. **E-mail exato** — o seed usa por defeito `leandro.borges@me.com` (com **g** em *borges*). Se tiver definido `LEX_SEED_EMAIL` no Railway, use esse valor.
2. **Variáveis no Railway sem novo seed** — `LEX_SEED_PASSWORD` só entra na base quando o **prisma db seed** corre. Se a base já existia, use **`LEX_RUN_SEED_ON_BOOT=1`** → Redeploy → login → remova a variável. Ou o workflow **Actions → Railway — LEX_SEED_PASSWORD** com *run prisma seed*.
3. **Testar a API** — em `/api/docs`, experimente `POST /api/auth/login` com o mesmo corpo; se falhar, o problema é credenciais/servidor, não o browser.
4. **Caracteres especiais na senha** — se a variável foi colada com aspas erradas ou cortada antes do `$`, regrave `LEX_SEED_PASSWORD` no Railway (valor completo) e volte a correr o seed (workflow ou comando em Docker na documentação acima).

### Reset de emergência da senha (sem seed / SSH)

Se nada mais funcionar, pode usar um **endpoint único** que só existe quando define no Railway (ou Docker) a variável **`LEX_EMERGENCY_PASSWORD_RESET_TOKEN`** com um valor **longo e aleatório** (mínimo 16 caracteres no pedido; recomende-se 32+).

1. No Railway → **Variables**: `LEX_EMERGENCY_PASSWORD_RESET_TOKEN` = por exemplo uma string gerada com o gestor de passwords.
2. **Redeploy** (para carregar a variável).
3. Envie um `POST` (ex.: a partir do computador):

```bash
curl -sS -X POST "https://SEU-DOMINIO-RAILWAY/api/auth/emergency-reset-password" \
  -H "Content-Type: application/json" \
  -d '{"token":"O_MESMO_VALOR_DA_VARIAVEL","email":"leandro.borges@me.com","newPassword":"NovaSenhaForte123"}'
```

4. Resposta `{"ok":true}` — faça login com a **newPassword**.
5. **Apague imediatamente** `LEX_EMERGENCY_PASSWORD_RESET_TOKEN` no Railway e volte a fazer **Redeploy**. Com a variável vazia, o endpoint devolve 404.

**Risco:** quem souber o token pode alterar a senha desse e-mail enquanto a variável existir. Use só em emergência e remova a variável logo a seguir.

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
