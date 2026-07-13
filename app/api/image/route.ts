// Descrição de imagem pelo motor Mangaba (modelo de visão).
// Recebe uma imagem (multipart) e repassa para /api/v1/{visão}/image/describe,
// devolvendo a descrição textual — usada para dar "olhos" ao chat de texto.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { readSession } from "../../lib/auth";

const MAX_IMAGE_BYTES = 12 * 1024 * 1024; // 12 MB
const VISION_MODEL = process.env.OPENAI_VISION_MODEL || "mangaba-vision-q8";

/** Deriva a origem do servidor de IA a partir do OPENAI_BASE_URL (que termina em /v1). */
function engineOrigin(): string {
  const base = (process.env.OPENAI_BASE_URL || "https://router.huggingface.co/v1").replace(/\/$/, "");
  return base.replace(/\/v1$/, "");
}

export async function POST(req: Request) {
  if (!readSession(req.headers.get("cookie"))) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  // Só o motor Mangaba (self-hosted) expõe a rota de visão; provedores
  // externos (Groq/HF, com "/" no id do modelo) não têm /image/describe.
  const chatModel = (process.env.OPENAI_MODEL || "").trim();
  if (!chatModel || chatModel.includes("/")) {
    return Response.json(
      { error: "Análise de imagem indisponível para o provedor atual." },
      { status: 501 }
    );
  }

  let inForm: FormData;
  try {
    inForm = await req.formData();
  } catch {
    return Response.json({ error: "Envio inválido (esperado multipart/form-data)." }, { status: 400 });
  }

  const file = inForm.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Imagem ausente." }, { status: 400 });
  if (file.size === 0) return Response.json({ error: "Imagem vazia." }, { status: 400 });
  if (file.size > MAX_IMAGE_BYTES) {
    return Response.json({ error: "Imagem muito grande (máx. 12 MB)." }, { status: 413 });
  }

  const out = new FormData();
  out.append("file", file, file.name || "imagem.png");
  const prompt = inForm.get("prompt");
  if (typeof prompt === "string" && prompt.trim()) out.append("prompt", prompt.trim());

  const url = `${engineOrigin()}/api/v1/${encodeURIComponent(VISION_MODEL)}/image/describe`;
  const apiKey = process.env.OPENAI_API_KEY || "";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "ngrok-skip-browser-warning": "1" },
      body: out,
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      await res.text().catch(() => "");
      return Response.json({ error: "Falha ao analisar a imagem." }, { status: 502 });
    }
    const data = await res.json().catch(() => null);
    // QResponse: { text, model, tokens_generated }
    const description = data && typeof data.text === "string" ? data.text.trim() : "";
    return Response.json({ description });
  } catch {
    clearTimeout(timer);
    return Response.json({ error: "Não foi possível conectar ao serviço de visão." }, { status: 502 });
  }
}
