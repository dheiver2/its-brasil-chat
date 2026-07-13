# Rodar 100% local — Ítala (ITS Brasil)

Guia para rodar a plataforma inteira na sua máquina: banco Postgres local (Docker)
+ motor de IA via gateway Mangaba (ngrok), sem depender da Vercel nem de banco em nuvem.

## Pré-requisitos
- **Docker** (para o Postgres local)
- **Node 20** (o projeto usa Next 14.2.5; há um `.nvmrc` fixando `20.20.2`).
  ⚠️ Node 26 quebra o bundler do Next (erro `Cannot read properties of undefined (reading 'call')`).
  Use `nvm use` na pasta do projeto.

## 1) Banco de dados (Postgres em Docker)
Já provisionado no container `itsbrasil-db` (porta **5433**). Se precisar recriar:

```bash
docker run -d --name itsbrasil-db --restart unless-stopped \
  -e POSTGRES_USER=itsbrasil -e POSTGRES_PASSWORD=itsbrasil -e POSTGRES_DB=itsbrasil \
  -p 5433:5432 -v itsbrasil-pgdata:/var/lib/postgresql/data postgres:16-alpine
```

Criar as tabelas e semear a conta admin (lê o `.env.local`):

```bash
node scripts/init-local-db.mjs           # cria users/conversations/knowledge + conta admin
# ou:  node scripts/init-local-db.mjs email@dominio.com senha
```

**Conta admin já criada:** `dheiver.santos@gmail.com` / `its@2026`

**Auto-cadastro (aberto):** cada colaborador cria a própria conta em `/chat` →
botão **"Criar conta"** (e-mail + senha de no mínimo 8 caracteres). Não precisa mais
provisionar conta pelo admin nem estar na allowlist. Para restringir a cadastro
(ex.: só `@itsbrasil.net`), edite `app/api/register/route.ts`.

## 2) Variáveis de ambiente (`.env.local`)
Já configurado. Aponta o motor de IA para o gateway Mangaba (ngrok) e o banco para o container:

```
POSTGRES_URL=postgres://itsbrasil:itsbrasil@localhost:5433/itsbrasil
OPENAI_BASE_URL=https://walton-undepreciatory-tracee.ngrok-free.dev/v1
OPENAI_MODEL=mangaba-pro
OPENAI_MODEL_FALLBACKS=mangaba-max,mangaba-lite-q4
OPENAI_VISION_MODEL=mangaba-vision-q8
```

> A URL do ngrok muda a cada reinício do túnel. Quando mudar, troque `OPENAI_BASE_URL`
> (mantendo o `/v1` no final) e reinicie/rebuilde.

## 3) Subir a aplicação (modo produção — recomendado)
O `next dev` (webpack HMR) apresenta um bug de hidratação neste ambiente; o **modo
produção funciona 100%** (build + start):

```bash
nvm use                 # Node 20
npm install             # primeira vez
npm run local           # = next build && next start -p 3020
# depois de buildado, para subir de novo sem rebuild:  npm run start:local
```

Acesse **http://localhost:3020** → entre em `/chat` com a conta acima.

- Após alterar código, rode `npm run build` de novo (o modo produção não tem hot-reload).
- `next dev --turbo` roda, mas o Turbopack não compila o `pdfjs-dist` usado no chat.

## Verificação rápida
```bash
curl -s localhost:3020/api/status | jq       # {"online":true,"model":"Mangaba Pro",...}
```
