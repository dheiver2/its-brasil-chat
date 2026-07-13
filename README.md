# Ítala — ITS Brasil

Clone do ChatGPT com a identidade visual da **ITS Brasil** (provedora de internet de fibra e conectividade).
Landing institucional com a persona **Ítala** — a assistente de IA da ITS Brasil — e uma
interface de chat completa (`/chat`), construída em **Next.js 14** (App Router) com
respostas em **streaming**. Usa **Mangaba** (motor de IA compatível com a API OpenAI,
mesmo fluxo do Ollama) como provedor padrão.

## Sumário

- [Funcionalidades](#funcionalidades)
- [Stack](#stack)
- [Paleta de cores](#paleta-de-cores)
- [Rotas principais](#rotas-principais)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Rodar localmente](#rodar-localmente)
- [Testes e lint](#testes-e-lint)
- [CI](#ci)
- [Deploy na Vercel](#deploy-na-vercel)
- [Estrutura](#estrutura)
- [Provedores compatíveis](#provedores-compatíveis)

## Funcionalidades

- **Landing institucional** (`/`) apresentando a assistente **Ítala**, com CTA para o chat
  e para os canais da ITS Brasil (WhatsApp, Instagram, LinkedIn).
- **Chat em streaming** (`/chat`) com histórico de conversas, pastas, busca de mensagens,
  seleção de modelo, reações e compartilhamento de conversa (`/chat/shared/[id]`).
- **Autenticação por allowlist**: login/registro restritos a e-mails cadastrados em
  `app/lib/allowlist.ts` (auto-cadastro fechado à equipe da ITS Brasil).
- **Geração de artefatos**: planilhas `.xlsx` (`app/lib/spreadsheet.ts`, ExcelJS) e
  documentos `.docx` (`app/lib/document.ts`, biblioteca `docx`), exibidos em painel lateral
  redimensionável (com suporte a Mermaid e blocos React/JSX).
- **Leitura de anexos**: PDF (`pdfjs-dist`), Word (`mammoth`) e Excel enviados pelo usuário
  (`app/lib/extract.ts`).
- **Busca na web com citação de fontes**: DuckDuckGo por padrão, com upgrade opcional para
  Tavily (`app/lib/search.ts`, `app/lib/search-providers.ts`).
- **Base de conhecimento** interna (`/api/knowledge`) usada para enriquecer respostas com
  contexto da ITS Brasil.
- **Painel administrativo** (`/admin`) para gestão de usuários, e rota de seed protegida por
  token (`/api/admin/seed`).
- **Agente público embutível** (`/api/agent`) — widget de IA que pode ser incorporado em
  outras páginas.
- **Entrada por voz e imagem**: transcrição de áudio (`/api/audio`) e visão computacional via
  modelo Mangaba (`/api/image`).
- **Rate limiting** (`app/lib/ratelimit.ts`) em memória por padrão, com upgrade opcional para
  Upstash Redis (rate limit global entre instâncias).
- **Manual de uso** estático em `/manual`.

## Stack

- **Next.js 14** (App Router, rotas Edge para streaming)
- **React 18** + TypeScript
- **PostgreSQL** (Supabase) via `pg` / `@neondatabase/serverless`
- **Vitest** para testes unitários
- **react-markdown**, **highlight.js**, **KaTeX** para renderização de mensagens (código,
  Markdown, fórmulas)
- Motor de IA: **Mangaba** (endpoint compatível com OpenAI `chat/completions`)

## Paleta de cores

| Token | Cor |
|-------|-----|
| Verde escuro | `#357A17` |
| Verde | `#4E9A1E` |
| Verde vivo (marca) | `#6FCD00` |
| Verde claro | `#eef7e0` |
| Branco | `#ffffff` |

Fonte: **Open Sans**. Site institucional: [itsbrasil.net](https://www.itsbrasil.net).

## Rotas principais

| Rota | Descrição |
|------|-----------|
| `GET /` | Landing institucional (Ítala) |
| `GET /chat` | Interface de chat |
| `GET /chat/shared/[id]` | Visualização de conversa compartilhada |
| `GET /admin` | Painel administrativo |
| `GET /manual` | Manual de uso |
| `POST /api/chat` | Streaming de respostas do modelo (Edge) |
| `POST /api/agent` | Agente público embutível |
| `POST /api/login`, `/api/register`, `/api/logout`, `GET /api/me` | Autenticação |
| `GET/POST /api/conversations`, `/api/conversations/[id]` | CRUD de conversas |
| `POST /api/document`, `/api/spreadsheet` | Geração de `.docx` / `.xlsx` |
| `POST /api/image` | Análise de imagem (visão) |
| `POST /api/audio` | Transcrição de áudio |
| `POST /api/search` | Busca na web com fontes |
| `GET/POST /api/knowledge` | Base de conhecimento |
| `POST /api/share` | Compartilhamento de conversa |
| `POST /api/admin/seed`, `/api/admin/users` | Administração (protegidas por token) |
| `GET /api/status`, `/api/version` | Health check / versão do build |

## Variáveis de ambiente

Veja também [`.env.example`](.env.example). Nenhum valor real deve ser commitado.

| Variável | Obrigatória | Onde é usada | Descrição |
|----------|:---:|---|---|
| `SESSION_SECRET` | Produção | `app/lib/auth.ts`, `app/lib/auth-edge.ts` | Segredo para assinar sessões (gere com `openssl rand -hex 32`) |
| `POSTGRES_URL` | Sim (runtime) | `app/lib/db.ts` | Connection string do Postgres (pooler Supabase, porta 6543) |
| `POSTGRES_URL_NON_POOLING` | Não | `app/lib/db.ts` | Fallback de conexão direta (sem pooler) |
| `OPENAI_BASE_URL` | Sim | `app/api/chat`, `app/api/agent` | Endpoint compatível com OpenAI (`/v1/chat/completions`) do motor Mangaba ou outro provedor |
| `OPENAI_MODEL` | Sim | `app/api/chat`, `app/api/agent` | Nome do modelo principal a usar no provedor configurado |
| `OPENAI_API_KEY` | Sim (placeholder aceito) | `app/api/chat`, `app/api/agent` | Chave de API do provedor; o motor Mangaba não exige token real |
| `OPENAI_MODEL_FALLBACKS` | Não | `app/api/chat` | Lista de modelos (separados por vírgula) tentados se o principal falhar |
| `OPENAI_MAX_TOKENS` | Não | `app/api/chat`, `app/api/agent` | Teto de tokens de saída (padrão: 2048 no chat, 1024 no agente) |
| `OPENAI_VISION_MODEL` | Não | `app/api/image` | Modelo usado para análise de imagens (padrão: `mangaba-vision-q8`) |
| `TAVILY_API_KEY` | Não | `app/lib/search-providers.ts` | Ativa busca via Tavily; sem ela, cai para DuckDuckGo |
| `ADMIN_SEED_TOKEN` | Não | `app/api/admin/seed` | Token para proteger a rota de seed de usuários da allowlist |
| `SEED_SECRET` | Não | `app/api/admin/seed` | Gera senhas determinísticas no seed (maior prioridade) |
| `SEED_DEFAULT_PASSWORD` | Não | `app/api/admin/seed` | Senha padrão para todos os usuários no seed (usada se não houver `SEED_SECRET`) |
| `UPSTASH_REDIS_REST_URL` | Não | `app/lib/ratelimit.ts` | Ativa rate limiting global via Upstash Redis |
| `UPSTASH_REDIS_REST_TOKEN` | Não | `app/lib/ratelimit.ts` | Token do Upstash Redis |
| `NEXT_PUBLIC_BUILD` | Não (automática) | `app/lib/build.ts`, `next.config.js` | Id do build exposto ao cliente; preenchida automaticamente (SHA do commit) |

## Rodar localmente

Gerenciador de pacotes: **npm** (repositório usa `package-lock.json`).

```bash
npm install
cp .env.example .env.local   # preencha POSTGRES_URL, OPENAI_*, SESSION_SECRET etc.
npm run dev
```

Acesse http://localhost:3000. O chat (`/chat`) precisa de `POSTGRES_URL` configurado e de um
motor compatível com OpenAI (Mangaba local, Groq, Hugging Face etc.) em `OPENAI_BASE_URL`.

### Mangaba (motor de IA local, gratuito)

O **Mangaba** roda na sua máquina com o **mesmo fluxo do Ollama** (API OpenAI-compatible em
`http://localhost:11434`), sem enviar dados a terceiros.

**macOS / Linux:**

```bash
curl -fsSL https://mangaba-site.vercel.app/install.sh | bash
```

**Windows (PowerShell):**

```powershell
irm https://mangaba-site.vercel.app/install.ps1 | iex
```

> Requer Python 3.8+. Modelo padrão `mangaba-mini` (~470 MB, roda em CPU). No **macOS**, o
> Safari bloqueia páginas `https` chamando `http://localhost`; o instalador usa
> [mkcert](https://github.com/FiloSottile/mkcert) para servir em `https://localhost:11434`
> nesse caso. O app tenta `https` e cai para `http` automaticamente.

Instalação manual (qualquer SO com Python):

```bash
pip install --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cpu \
  https://mangaba-site.vercel.app/dl/mangaba_mini-0.1.0-py3-none-any.whl
python -m mangaba_mini pull mangaba-mini
python -m mangaba_mini serve
```

## Testes e lint

```bash
npm test        # vitest run
npm run test:watch
npm run lint     # next lint
npm run build    # next build
```

**Limitação conhecida:** o projeto não possui um arquivo de configuração do ESLint
versionado (`next lint` pede uma configuração interativa na primeira execução). Por isso o
CI roda o lint com `continue-on-error` — ele não bloqueia o pipeline enquanto essa
configuração não for adicionada ao repositório. Há também 1 teste pré-existente falhando em
`tests/data-utils.test.ts` (não relacionado a mudanças de infraestrutura), fora do escopo
deste ajuste de CI/README.

## CI

`.github/workflows/ci.yml` roda em todo push/PR para `main`: checkout, `npm ci`, lint
(non-blocking) e `npm run build`. O build **não** requer `POSTGRES_URL`/`OPENAI_*` — essas
variáveis só são lidas em tempo de execução (runtime), não durante `next build`.

## Deploy na Vercel

⚠️ **Importante:** o Mangaba roda na *sua máquina* (`localhost`). Uma função serverless
na Vercel **não enxerga o seu localhost**. Você tem 3 caminhos:

### Opção A — Mangaba exposto por túnel (mantém Mangaba + Vercel)
Exponha seu Mangaba na internet e aponte a Vercel para ele:

```bash
# exemplo com cloudflared (gratuito)
cloudflared tunnel --url http://localhost:11434
# copie a URL https gerada, ex.: https://algo.trycloudflare.com
```

Na Vercel → **Settings → Environment Variables**:
- `OPENAI_BASE_URL` = `https://algo.trycloudflare.com/v1`
- `OPENAI_MODEL` = `mangaba-pro`

Sua máquina precisa ficar ligada com `mangaba serve` + o túnel ativos.

### Opção B — Groq (gratuito e hospedado, recomendado para Vercel)
Não precisa deixar nada ligado. Crie uma chave em https://console.groq.com e configure:
- `OPENAI_BASE_URL` = `https://api.groq.com/openai/v1`
- `OPENAI_MODEL` = `llama-3.3-70b-versatile`
- `OPENAI_API_KEY` = sua chave Groq

### Opção C — Rodar 100% local
Não fazer deploy e usar apenas `npm run dev` com o Mangaba. Grátis e privado.

Passos do deploy em si:
1. Suba o projeto para um repositório no GitHub.
2. Em [vercel.com](https://vercel.com): **Add New → Project** → importe o repositório.
3. Configure as variáveis conforme a opção A ou B acima (e `POSTGRES_URL`, `SESSION_SECRET`).
4. **Deploy**.

## Estrutura

```
its-brasil-chat/
├── app/
│   ├── api/                # rotas de API (chat, auth, documentos, admin...)
│   ├── chat/                # interface de chat (componentes + página)
│   ├── lib/                 # auth, db, mangaba, busca, rate limit, extração de arquivos
│   ├── admin/                # painel administrativo
│   ├── manual/                # manual de uso
│   ├── knowledge/             # conteúdo markdown da base de conhecimento
│   ├── globals.css            # paleta + estilos
│   ├── layout.tsx
│   └── page.tsx                # landing (Ítala)
├── scripts/                 # seed de usuários, ingestão de conhecimento, sync do pdf worker
├── tests/                   # testes unitários (vitest)
├── public/logo-its.png      # logo oficial da ITS Brasil
└── ...
```

## Provedores compatíveis

A API usa o formato OpenAI `chat/completions`. Funciona com qualquer endpoint compatível
ajustando `OPENAI_BASE_URL` e `OPENAI_MODEL` (ex.: Groq, Together, OpenRouter, Hugging Face,
LM Studio local).
