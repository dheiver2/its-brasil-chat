// Edge Runtime: sem cold start (~200-500ms poupados por request),
// executa na rede da Vercel mais próxima do usuário.
export const runtime = "edge";
export const dynamic = "force-dynamic";

import { readSessionEdge } from "../../lib/auth-edge";
import { rateLimit, LIMITS, tooManyRequests } from "../../lib/ratelimit";
import { formatSearchContext } from "../../lib/search";
import type { SearchResult } from "../../lib/search";
import { KNOWLEDGE_BASE } from "../../lib/knowledge-base";

// ── RAG leve sobre a base estática da ITS (edge-safe, sem banco) ──────
// Casa termos distintos da pergunta contra os chunks e devolve os melhores,
// para GROUNDING: a Ítala responde sobre os produtos reais da ITS, não de memória.
const normText = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
function retrieveKnowledge(query: string, limit = 4): string[] {
  const terms = Array.from(new Set(normText(query).split(/[^a-z0-9]+/).filter((w) => w.length > 2)));
  if (!terms.length) return [];
  const scored = KNOWLEDGE_BASE.map((d) => {
    const body = normText(d.content), title = normText(d.title);
    let distinct = 0, occ = 0, th = 0;
    for (const t of terms) {
      const n = body.split(t).length - 1;
      if (n > 0) { distinct += 1; occ += n; }
      if (title.includes(t)) th += 1;
    }
    return { d, score: distinct + th * 0.5 + Math.min(occ, 10) * 0.1, distinct };
  }).filter((s) => s.distinct >= 1).sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => `${s.d.title}: ${s.d.content}`.slice(0, 900));
}

// Base do system prompt — enviado SEMPRE (curto, para economizar tokens).
const BASE_PROMPT =
  "Você é a Ítala, a assistente virtual inteligente da ITS Brasil — " +
  "provedora de internet de fibra óptica e links dedicados, com 17 anos de mercado corporativo, " +
  "atendendo clientes residenciais e empresariais em mais de 40 municípios da Bahia. " +
  "Responda sempre em português do Brasil, de forma clara, profissional e prestativa. " +
  "Use markdown quando ajudar na leitura.\n\n" +
  "MÉTODO DE TRABALHO — ESPECIFICAÇÃO PRIMEIRO: antes de produzir qualquer entrega " +
  "(resposta, documento, planilha, plano, análise ou solução), defina primeiro a " +
  "ESPECIFICAÇÃO do que será feito: o objetivo, para quem/uso, os requisitos, o escopo e " +
  "o formato esperado. Se o pedido estiver ambíguo ou faltar uma informação essencial, faça " +
  "de 1 a 3 perguntas objetivas para fechar a especificação ANTES de entregar. Se o pedido já " +
  "estiver claro, declare em 1–2 linhas a especificação que você assumiu e então produza a " +
  "resposta baseada estritamente nela. Não invente requisitos: a entrega deve refletir " +
  "exatamente o que foi especificado.\n\n" +
  "ARTIFACTS: quando o usuário pedir uma página, layout, componente, gráfico, diagrama, app " +
  "ou demonstração, gere o resultado em UM único bloco de código renderizável ao vivo: " +
  "`html` (HTML completo autocontido, CSS/JS inline), `svg` (vetorial), `mermaid` (fluxograma/" +
  "sequência/diagrama) ou `jsx` (React — DEFINA um componente chamado `App`; React e ReactDOM " +
  "já estão disponíveis, não importe). Esses blocos viram preview para o usuário. Não use essas " +
  "linguagens para trechos meramente ilustrativos — só quando o artefato renderizável for o objetivo.";

// Bloco de planilha — só injetado quando o pedido é sobre planilha (economiza tokens).
const SHEET_BLOCK =
  "\n\nGERAÇÃO DE PLANILHAS: quando o usuário pedir uma planilha financeira, planilha de " +
  "custos, orçamento ou cotação em formato de planilha, responda normalmente e, ao final, " +
  "inclua um único bloco de código com a linguagem `its-sheet` contendo APENAS um JSON " +
  "válido neste formato:\n" +
  "```its-sheet\n" +
  '{ "title": "Custos do Projeto X", "sheets": [{ "name": "Custos", ' +
  '"columns": ["Item", "Categoria", "Qtd", "Valor Unit", "Total"], ' +
  '"rows": [["Notebook", "Equipamento", 2, 3500, 7000]], "currencyColumns": [3, 4], "totals": true }] }\n' +
  "```\n" +
  "Regras: valores monetários como NÚMEROS (sem 'R$' nem separador), `currencyColumns` são os " +
  "índices 0-based das colunas de dinheiro, JSON válido. Gere o bloco só quando uma planilha for útil.";

// Bloco de documento Word — só injetado quando o pedido é sobre documento.
const DOC_BLOCK =
  "\n\nGERAÇÃO DE DOCUMENTOS WORD: quando o usuário pedir um documento, proposta, relatório, " +
  "carta, contrato ou texto formatado em Word, responda normalmente e, ao final, inclua um " +
  "único bloco de código com a linguagem `its-doc` contendo APENAS um JSON válido assim:\n" +
  "```its-doc\n" +
  '{ "title": "Proposta Comercial", "blocks": [ ' +
  '{ "type": "heading", "level": 1, "text": "Introdução" }, ' +
  '{ "type": "paragraph", "text": "Texto." }, ' +
  '{ "type": "bullets", "items": ["Item A", "Item B"] }, ' +
  '{ "type": "table", "columns": ["Item", "Valor"], "rows": [["Plano X", "R$ 100"]] } ] }\n' +
  "```\n" +
  "Tipos de bloco: heading (level 1-4), paragraph, bullets, numbered, table. JSON válido. " +
  "Gere o bloco só quando um documento Word for útil; caso contrário, responda em markdown.";

const SHEET_RE = /\b(planilha|or[çc]amento|cota[çc][ãa]o|custos?|\.xlsx|excel|tabela financeira)\b/i;
const DOC_RE = /\b(documento|proposta|relat[óo]rio|contrato|carta|comunicado|of[íi]cio|\.docx|word)\b/i;

/** Monta o system prompt por INTENÇÃO: só inclui os blocos pesados (planilha/doc)
 *  quando o texto recente do usuário indica que serão úteis. Corta tokens fixos. */
function buildSystemPrompt(recentUserText: string): string {
  let p = BASE_PROMPT;
  if (SHEET_RE.test(recentUserText)) p += SHEET_BLOCK;
  if (DOC_RE.test(recentUserText)) p += DOC_BLOCK;
  return p;
}

// Janela de contexto. Menor = menos tokens e prefill mais rápido.
const MAX_HISTORY_MSGS = 10;       // últimas ~5 trocas
const MAX_MSG_LENGTH = 32_000;     // chars por mensagem (validação de entrada)
const CONTEXT_CHAR_BUDGET = 24_000; // teto de chars de histórico+busca (~6k tokens)

const MAX_TOKENS = Number(process.env.OPENAI_MAX_TOKENS || 2048); // teto de saída

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

/** Estimativa leve de tokens (sem lib pesada no Edge): ~4 chars por token. */
const estTokens = (s: string) => Math.ceil(s.length / 4);

export async function POST(req: Request) {
  const username = await readSessionEdge(req.headers.get("cookie"));
  if (!username) {
    return new Response(JSON.stringify({ error: "Sessão expirada. Entre novamente." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Rate limiting: 30 msgs / min por usuário
  const rl = await rateLimit(`chat:${username}`, LIMITS.chat.limit, LIMITS.chat.windowSecs);
  if (!rl.allowed) return tooManyRequests(rl.resetAt);

  const apiKey = process.env.OPENAI_API_KEY || "mangaba";

  let messages: ChatMessage[];
  let searchResults: SearchResult[] = [];
  let searchQuery = "";
  let clientModel: string | null = null;
  let customInstructions: string | null = null;
  try {
    const body = await req.json();
    messages = body.messages;
    // Modelo vindo do cliente (seletor de modelo no frontend)
    if (typeof body.model === "string" && body.model.trim()) clientModel = body.model.trim();
    // Instruções personalizadas do usuário
    if (typeof body.customInstructions === "string" && body.customInstructions.trim()) {
      customInstructions = body.customInstructions.trim().slice(0, 2000);
    }
    if (Array.isArray(body.searchResults)) searchResults = body.searchResults;
    if (typeof body.searchQuery === "string") searchQuery = body.searchQuery;
    if (!Array.isArray(messages)) throw new Error();

    // Validação básica
    for (const m of messages) {
      if (!["user", "assistant"].includes(m.role)) {
        return new Response(JSON.stringify({ error: "Role de mensagem inválido." }), {
          status: 400, headers: { "Content-Type": "application/json" },
        });
      }
      if (typeof m.content !== "string" || m.content.length > MAX_MSG_LENGTH) {
        return new Response(JSON.stringify({ error: "Mensagem muito longa." }), {
          status: 400, headers: { "Content-Type": "application/json" },
        });
      }
    }
  } catch {
    return new Response(JSON.stringify({ error: "Corpo da requisição inválido." }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  // ── Truncar histórico (por contagem) ───────────────────────────────
  let trimmed: ChatMessage[] =
    messages.length > MAX_HISTORY_MSGS
      ? [messages[0], ...messages.slice(-MAX_HISTORY_MSGS + 1)]
      : messages;

  // ── Contexto de busca (pré-computado pelo /api/search) ─────────────
  const searchContext = searchResults.length
    ? formatSearchContext(searchQuery, searchResults)
    : "";

  // ── System prompt por intenção (só blocos úteis) ────────────────────
  const recentUserText = [...messages].reverse().find((m) => m.role === "user")?.content || "";
  const systemPrompt = buildSystemPrompt(recentUserText);

  // ── GROUNDING: base de conhecimento da ITS relevante à pergunta ──────
  const kbChunks = retrieveKnowledge(recentUserText);
  const knowledgeContext = kbChunks.length
    ? `\n\nBASE DE CONHECIMENTO DA ITS BRASIL (responda com base ESTRITAMENTE nestes dados quando a pergunta for sobre a empresa, seus planos, serviços ou cobertura). Se a informação pedida (ex.: preço, plano ou velocidade específica) NÃO estiver aqui, diga que não tem esse dado e oriente falar com a ITS Brasil — NUNCA invente planos, velocidades, preços ou números:\n${kbChunks.map((c, i) => `[${i + 1}] ${c}`).join("\n\n")}`
    : "";

  // ── Orçamento de contexto: corta histórico antigo (preservando a 1ª msg
  //    e as mais recentes) até caber no teto de chars. Busca + base de
  //    conhecimento consomem parte do orçamento. Economiza tokens.
  const searchChars = searchContext.length + knowledgeContext.length;
  let budget = Math.max(2_000, CONTEXT_CHAR_BUDGET - searchChars);
  const histChars = (arr: ChatMessage[]) => arr.reduce((n, m) => n + m.content.length, 0);
  while (trimmed.length > 2 && histChars(trimmed) > budget) {
    trimmed.splice(1, 1); // remove a mensagem mais antiga depois da primeira
  }
  void estTokens; // estimativa disponível para logs/ajustes futuros

  // ── Failover entre MODELOS do mesmo provedor (Hugging Face) ──────────
  // Mesma base e mesma chave; se um modelo falhar (conexão, timeout ou status
  // != 2xx), tentamos o próximo modelo da lista antes de desistir. NÃO troca
  // de provedor.
  // Instruções personalizadas: injeta no system prompt
  const instructionsBlock = customInstructions
    ? `\n\nINSTRUÇÕES DO USUÁRIO (sempre siga estas instruções em toda resposta):\n${customInstructions}`
    : "";

  const payloadMessages = [
    {
      role: "system",
      content: `${systemPrompt}${instructionsBlock}${knowledgeContext}${searchContext ? `\n\n${searchContext}` : ""}`,
    },
    ...trimmed,
  ];

  const baseUrl = (process.env.OPENAI_BASE_URL || "https://router.huggingface.co/v1").replace(/\/$/, "");

  // Modelos: se o cliente selecionou um modelo, usa ele primeiro;
  // senão, usa o OPENAI_MODEL padrão + fallbacks.
  const requestedModel = clientModel || process.env.OPENAI_MODEL || "";
  const fallbackModels = (process.env.OPENAI_MODEL_FALLBACKS || "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  const models = Array.from(
    new Set(
      [requestedModel, ...fallbackModels].filter(Boolean)
    )
  );

  // Timeout só para a CONEXÃO/headers — não corta o streaming já iniciado.
  const CONNECT_TIMEOUT_MS = 20_000;
  async function openUpstream(modelId: string): Promise<Response | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CONNECT_TIMEOUT_MS);
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        // ngrok-skip-browser-warning: evita a interstitial do ngrok-free quando
        // o motor é servido por um túnel ngrok (ignorado por outros provedores).
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}`, "ngrok-skip-browser-warning": "1" },
        body: JSON.stringify({ model: modelId, stream: true, messages: payloadMessages, max_tokens: MAX_TOKENS }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok || !res.body) {
        await res.text().catch(() => ""); // drena corpo de erro
        return null;
      }
      return res;
    } catch {
      clearTimeout(timer);
      return null;
    }
  }

  let upstream: Response | null = null;
  for (const modelId of models) {
    upstream = await openUpstream(modelId);
    if (upstream) break;
  }
  if (!upstream) {
    return new Response(
      JSON.stringify({ error: "Não foi possível conectar ao serviço de IA." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── Stream de tokens para o browser ──────────────────────────────────
  // Parseia o SSE do provedor e re-emite apenas o texto dos tokens,
  // sem overhead de JSON por parte do browser.
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body!.getReader();
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine.startsWith("data:")) continue;
            const data = trimmedLine.slice(5).trim();
            if (data === "[DONE]") { controller.close(); return; }
            try {
              const json = JSON.parse(data);
              const token = json.choices?.[0]?.delta?.content;
              if (token) controller.enqueue(encoder.encode(token));
            } catch { /* ignorar chunks parciais/keepalive */ }
          }
        }
      } catch (err) {
        controller.error(err);
        return;
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no", // desabilita buffering em proxies
    },
  });
}
