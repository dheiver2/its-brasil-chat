// Transcrição de áudio (voz → texto) pelo motor Mangaba.
// Recebe um arquivo de áudio (multipart) do navegador e repassa para o
// endpoint nativo /api/v1/{modelo}/audio/transcribe (Whisper) do servidor.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { readSession } from "../../lib/auth";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // 25 MB

/** Deriva a origem do servidor de IA a partir do OPENAI_BASE_URL (que termina em /v1). */
function engineOrigin(): string {
  const base = (process.env.OPENAI_BASE_URL || "https://router.huggingface.co/v1").replace(/\/$/, "");
  return base.replace(/\/v1$/, "");
}

export async function POST(req: Request) {
  if (!readSession(req.headers.get("cookie"))) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  // O modelo precisa ser um slug Mangaba (ex.: mangaba-pro). Provedores externos
  // (Groq/HF, com "/" no id) não expõem esta rota de transcrição.
  const model = (process.env.OPENAI_MODEL || "").trim();
  if (!model || model.includes("/")) {
    return Response.json(
      { error: "Transcrição de áudio indisponível para o provedor atual." },
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
  if (!(file instanceof File)) {
    return Response.json({ error: "Arquivo de áudio ausente." }, { status: 400 });
  }
  if (file.size === 0) return Response.json({ error: "Áudio vazio." }, { status: 400 });
  if (file.size > MAX_AUDIO_BYTES) {
    return Response.json({ error: "Áudio muito grande (máx. 25 MB)." }, { status: 413 });
  }

  const out = new FormData();
  out.append("file", file, file.name || "audio.webm");
  const language = inForm.get("language");
  if (typeof language === "string" && language.trim()) out.append("language", language.trim());

  const url = `${engineOrigin()}/api/v1/${encodeURIComponent(model)}/audio/transcribe`;
  const apiKey = process.env.OPENAI_API_KEY || "";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        // Evita a interstitial do ngrok-free (ignorado por outros provedores).
        "ngrok-skip-browser-warning": "1",
      },
      body: out,
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      await res.text().catch(() => "");
      return Response.json({ error: "Falha ao transcrever o áudio." }, { status: 502 });
    }
    const data = await res.json().catch(() => null);
    const transcription = data && typeof data.transcription === "string" ? data.transcription : "";
    return Response.json({ transcription, language: data?.language ?? null });
  } catch {
    clearTimeout(timer);
    return Response.json({ error: "Não foi possível conectar ao serviço de transcrição." }, { status: 502 });
  }
}
