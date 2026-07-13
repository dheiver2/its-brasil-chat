# Deploy no Windows Server — Ítala (ITS Brasil)

Guia de implantação com **PostgreSQL local no próprio Windows Server**, o app rodando
como serviço (PM2) e HTTPS via IIS (reverse proxy). Testado como referência; ajuste
caminhos/versões conforme o servidor.

---

## 1. Pré-requisitos (instalar no servidor)

| Software | Versão | Observação |
|----------|--------|------------|
| **Node.js** | **20 LTS** | ⚠️ NÃO usar Node 26 — quebra o bundler do Next 14. Instalador oficial nodejs.org. |
| **Git** | qualquer | opcional (usado só p/ o id de build); sem ele, cai para timestamp. |
| **PostgreSQL** | 14–16 | instalador oficial postgresql.org/download/windows (roda como serviço do Windows). |
| **PM2** | atual | `npm install -g pm2` (gerenciador de processo). |
| **IIS** + **URL Rewrite** + **ARR** | — | para HTTPS e reverse proxy (ver passo 6). |

Confirme a versão do Node:
```powershell
node -v   # deve ser v20.x
```

---

## 2. PostgreSQL local

1. Instale o PostgreSQL (anote a senha do usuário `postgres`).
2. Crie o banco e um usuário da aplicação (via **pgAdmin** ou **psql**):

```sql
CREATE USER itsbrasil WITH PASSWORD 'TROQUE_ESTA_SENHA';
CREATE DATABASE itsbrasil OWNER itsbrasil;
```

> Postgres local, sem SSL — a connection string **não** deve ter `sslmode=require`.

---

## 3. Código + dependências

```powershell
cd C:\apps\its-brasil-chat        # onde você colocou o projeto
npm install                       # postinstall é cross-platform (Node, sem bash)
```

---

## 4. Variáveis de ambiente

Crie `C:\apps\its-brasil-chat\.env.production` (NÃO versionar):

```
# Sessão — gere 64+ hex (ex.: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
SESSION_SECRET=COLE_UM_SEGREDO_ALEATORIO_AQUI

# Banco Postgres LOCAL do Windows Server
POSTGRES_URL=postgres://itsbrasil:TROQUE_ESTA_SENHA@localhost:5432/itsbrasil

# Motor de IA (gateway Mangaba, OpenAI-compatible) — ver seção "Gateway" abaixo
OPENAI_BASE_URL=http://IP_DO_GATEWAY:PORTA/v1
OPENAI_MODEL=mangaba-pro
OPENAI_MODEL_FALLBACKS=mangaba-max,mangaba-lite-q4
OPENAI_VISION_MODEL=mangaba-vision-q8
OPENAI_API_KEY=none            # ou a chave mk_live_... se o gateway exigir

# Admin do painel /admin
ADMIN_EMAILS=voce@itsbrasil.net
```

---

## 5. Criar as tabelas + primeira conta admin

```powershell
node scripts/init-local-db.mjs             # cria users/conversations/knowledge
# ou:  node scripts/init-local-db.mjs admin@itsbrasil.net UmaSenhaForte
```
(O script lê `.env.production` / `.env` / `.env.local` automaticamente.)

> Cada colaborador também pode se cadastrar sozinho na tela `/chat` → **Criar conta**.

---

## 6. Rodar como serviço (PM2)

```powershell
npm run build
pm2 start ecosystem.config.js      # sobe em http://localhost:3000
pm2 save
pm2 logs its-brasil-chat           # acompanhar logs
```

**Iniciar no boot do Windows:** o `pm2 startup` não suporta Windows nativamente. Opções:
- **pm2-installer** (`https://github.com/jessety/pm2-installer`) — registra o PM2 como Serviço do Windows, **ou**
- **NSSM** — envolva o comando `node node_modules/next/dist/bin/next start -p 3000` como serviço.

---

## 7. HTTPS + porta 80/443 (IIS reverse proxy)

O `next start` serve em HTTP na porta 3000. Você **precisa de HTTPS**, porque o cookie de
sessão é `Secure` — **sem HTTPS o login não funciona**.

1. Instale no IIS: **URL Rewrite** e **Application Request Routing (ARR)**.
2. Em ARR, habilite **"Enable proxy"**.
3. Crie um site no IIS com binding **HTTPS (443)** e um **certificado TLS** (o domínio da ITS,
   ou um cert interno).
4. Adicione uma regra de **URL Rewrite** encaminhando tudo para o app:

`web.config` na raiz do site:
```xml
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="ReverseProxyToNext" stopProcessing="true">
          <match url="(.*)" />
          <action type="Rewrite" url="http://localhost:3000/{R:1}" />
          <serverVariables>
            <set name="HTTP_X_FORWARDED_PROTO" value="https" />
          </serverVariables>
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```
5. Redirecione HTTP→HTTPS (regra de redirect do IIS) para não cair no cookie inseguro.

> Alternativa ao IIS: **nginx para Windows** ou **Caddy** (Caddy resolve o TLS sozinho) como reverse proxy.

---

## 8. Gateway de IA (decisão pendente)

O app só conversa se `OPENAI_BASE_URL` apontar para um gateway Mangaba **alcançável a partir
do Windows Server**. Dois caminhos:

- **Gateway em outra máquina/rede** (recomendado se já existe): aponte `OPENAI_BASE_URL` para
  o IP:porta dele. Se exigir autenticação, preencha `OPENAI_API_KEY` com a chave `mk_live_...`.
- **Gateway no próprio Windows Server**: exige portar o `mangaba-gateway` (Python + modelos GGUF)
  para Windows — trabalhoso; avaliar caso a caso.

---

## Checklist final
- [ ] Node 20 instalado (`node -v`)
- [ ] Postgres local com banco `itsbrasil` criado
- [ ] `.env.production` preenchido (SESSION_SECRET, POSTGRES_URL, OPENAI_*)
- [ ] `npm install` + `npm run build` sem erros
- [ ] `node scripts/init-local-db.mjs` criou as tabelas + admin
- [ ] `pm2 start ecosystem.config.js` no ar (http://localhost:3000)
- [ ] IIS/Caddy servindo HTTPS na 443 → localhost:3000
- [ ] Gateway de IA alcançável (`OPENAI_BASE_URL`) e `/api/status` retornando online
