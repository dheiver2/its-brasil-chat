// Pré-carga (warm-up) de modelo no motor Mangaba.
// Edge-safe: usa apenas fetch + process.env (sem fs nem APIs de Node), então
// pode ser importado tanto no runtime "nodejs" quanto no "edge".
//
// O gateway expõe POST /api/v1/{slug}/load, que carrega o modelo de forma
// ASSÍNCRONA na memória. Chamamos isso para mitigar OOM do mangaba-pro:
// esquentar o modelo antes que ele seja realmente necessário.

/** Deriva a origem do motor a partir do OPENAI_BASE_URL (que termina em /v1). */
function engineOrigin(): string {
  const base = (process.env.OPENAI_BASE_URL || "https://router.huggingface.co/v1").replace(/\/$/, "");
  return base.replace(/\/v1$/, "");
}

/**
 * Dispara a pré-carga do modelo no gateway. Fire-and-forget: NUNCA lança
 * (todos os erros são engolidos) e usa um timeout curto para não segurar o
 * chamador. Não retorna nada útil além da conclusão da tentativa.
 */
export async function preloadModel(model: string): Promise<void> {
  const slug = (model || "").trim();
  // Só faz sentido para slugs Mangaba (self-hosted). Provedores externos
  // (Groq/HF, com "/" no id) não expõem a rota /load.
  if (!slug || slug.includes("/")) return;

  const url = `${engineOrigin()}/api/v1/${encodeURIComponent(slug)}/load`;
  const apiKey = process.env.OPENAI_API_KEY || "";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4_000); // timeout curto (4s)
  try {
    await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        // Evita a interstitial do ngrok-free (ignorado por outros provedores).
        "ngrok-skip-browser-warning": "1",
      },
      signal: controller.signal,
    });
  } catch {
    // Fire-and-forget: engole qualquer erro (conexão, timeout, etc.).
  } finally {
    clearTimeout(timer);
  }
}
