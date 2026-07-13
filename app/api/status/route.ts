export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { brandModel, pickModel } from "../../lib/mangaba";
import { readSession } from "../../lib/auth";
import { preloadModel } from "../../lib/preload";

export async function GET(req: Request) {
  if (!readSession(req.headers.get("cookie"))) {
    return new Response(JSON.stringify({ online: false, model: null }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Base do serviço de IA (endpoint compatível com OpenAI — ex.: Hugging Face).
  // Consultamos /v1/models com a mesma chave do /api/chat.
  const baseV1 = (process.env.OPENAI_BASE_URL || "https://router.huggingface.co/v1").replace(/\/$/, "");
  const apiKey = process.env.OPENAI_API_KEY || "";
  const configured = process.env.OPENAI_MODEL;

  try {
    const res = await fetch(`${baseV1}/models`, {
      cache: "no-store",
      // ngrok-skip-browser-warning: evita a página de aviso do ngrok-free
      // (inofensivo para outros provedores, que ignoram o header).
      headers: { Authorization: `Bearer ${apiKey}`, "ngrok-skip-browser-warning": "1" },
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    // OpenAI-compatible: { data: [{ id }] }
    const names: string[] = (data.data || []).map((m: { id: string }) => m.id);
    const real = configured || pickModel(names);
    if (!real) throw new Error();
    // Aquecimento: dispara a pré-carga do modelo padrão SEM await (fire-and-forget),
    // para não atrasar nem quebrar a resposta do status. Mitiga OOM no 1º chat.
    void preloadModel(real);
    // Retorna também a lista completa de modelos disponíveis para o seletor
    return Response.json({
      online: true,
      model: brandModel(real),
      defaultModelId: real,
      models: names.map((id) => ({ id, label: brandModel(id) })),
    });
  } catch {
    return Response.json({ online: false, model: null });
  }
}
