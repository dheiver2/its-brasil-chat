// Agente PÚBLICO da Ítala — atende usuários finais (sem login), em segundo
// plano, para uso em widget de site / integrações. RAG por palavra-chave
// (base estática, sem banco) + LLM Mangaba em streaming. Rate-limit por IP.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { rateLimit, getIp, tooManyRequests } from "../../lib/ratelimit";
import { KNOWLEDGE_BASE } from "../../lib/knowledge-base";

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const SYSTEM =
  "Você é a Ítala, a assistente virtual da ITS Brasil — provedora de internet de fibra óptica e " +
  "links dedicados, com mais de 17 anos de mercado, presente em mais de 40 municípios da Bahia. " +
  "Atende clientes e interessados em português do Brasil, de forma clara, cordial e " +
  "profissional. Responda SOMENTE com base no contexto da ITS Brasil fornecido e no conhecimento geral " +
  "pertinente; se não souber ou for fora do escopo da empresa, diga que vai encaminhar a um atendente " +
  "humano. Não invente preços, prazos ou políticas. Seja objetiva.";

const MAX_TOKENS = Number(process.env.OPENAI_MAX_TOKENS || 1024);

type Msg = { role: "user" | "assistant" | "system"; content: string };

/** RAG: top-4 trechos da base estática por termos distintos casados. */
function retrieve(q: string): string[] {
  const terms = Array.from(new Set(norm(q).split(/[^a-z0-9]+/).filter((w) => w.length > 2)));
  if (!terms.length) return [];
  const scored = KNOWLEDGE_BASE.map((d) => {
    const body = norm(d.content), title = norm(d.title);
    let distinct = 0, occ = 0, th = 0;
    for (const t of terms) {
      const n = body.split(t).length - 1;
      if (n > 0) { distinct += 1; occ += n; }
      if (title.includes(t)) th += 1;
    }
    return { d, score: distinct + th * 0.5 + Math.min(occ, 10) * 0.1, distinct };
  }).filter((s) => s.distinct >= 1).sort((a, b) => b.score - a.score);
  return scored.slice(0, 4).map((s) => s.d.content.slice(0, 1000));
}

export async function POST(req: Request) {
  const ip = getIp(req);
  const rl = await rateLimit(`agent:${ip}`, 20, 60);
  if (!rl.allowed) return tooManyRequests(rl.resetAt);

  let body: { message?: string; history?: Msg[] };
  try { body = await req.json(); } catch { return Response.json({ error: "JSON inválido" }, { status: 400 }); }

  const message = (body.message || "").toString().trim().slice(0, 4000);
  if (!message) return Response.json({ error: "Mensagem vazia" }, { status: 400 });

  const history = Array.isArray(body.history) ? body.history.slice(-8).filter(
    (m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string"
  ).map((m) => ({ role: m.role, content: m.content.slice(0, 4000) })) : [];

  const ctx = retrieve(message);
  const system = ctx.length
    ? `${SYSTEM}\n\nContexto da ITS Brasil (use para responder):\n${ctx.map((c, i) => `[${i + 1}] ${c}`).join("\n\n")}`
    : SYSTEM;

  const payload: Msg[] = [{ role: "system", content: system }, ...history, { role: "user", content: message }];

  const baseUrl = (process.env.OPENAI_BASE_URL || "https://router.huggingface.co/v1").replace(/\/$/, "");
  const apiKey = process.env.OPENAI_API_KEY || "mangaba";
  const models = Array.from(new Set([
    process.env.OPENAI_MODEL || "",
    ...(process.env.OPENAI_MODEL_FALLBACKS || "").split(",").map((m) => m.trim()),
  ].filter(Boolean)));

  async function open(model: string): Promise<Response | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}`, "ngrok-skip-browser-warning": "1" },
        body: JSON.stringify({ model, stream: true, messages: payload, max_tokens: MAX_TOKENS }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok || !res.body) { await res.text().catch(() => ""); return null; }
      return res;
    } catch { clearTimeout(timer); return null; }
  }

  let upstream: Response | null = null;
  for (const m of models) { upstream = await open(m); if (upstream) break; }
  if (!upstream) return Response.json({ error: "Serviço de IA indisponível." }, { status: 502 });

  // Re-emite apenas o texto dos tokens (SSE -> texto puro).
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream!.body!.getReader();
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            const t = line.trim();
            if (!t.startsWith("data:")) continue;
            const data = t.slice(5).trim();
            if (data === "[DONE]") { controller.close(); return; }
            try {
              const json = JSON.parse(data);
              const tok = json.choices?.[0]?.delta?.content;
              if (tok) controller.enqueue(encoder.encode(tok));
            } catch { /* ignora linhas parciais */ }
          }
        }
      } catch { /* fim */ }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
