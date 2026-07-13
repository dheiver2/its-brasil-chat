export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { readSession } from "../../../lib/auth";
import { isAdminEmail } from "../../../lib/allowlist";
import { engineOrigin } from "../../../lib/preload";

async function isAdmin(username: string): Promise<boolean> {
  return isAdminEmail(username);
}

// Status do gateway Mangaba: consulta o health-check no ORIGIN do motor
// (OPENAI_BASE_URL sem o sufixo /v1) e devolve o JSON para o painel /admin.
export async function GET(req: Request) {
  const username = readSession(req.headers.get("cookie"));
  if (!username || !(await isAdmin(username))) {
    return Response.json({ error: "Não autorizado" }, { status: 403 });
  }

  const url = `${engineOrigin()}/api/v1/health`;
  const apiKey = process.env.OPENAI_API_KEY || "";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000); // timeout ~8s
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        // Evita a interstitial do ngrok-free (ignorado por outros provedores).
        "ngrok-skip-browser-warning": "1",
      },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return Response.json({ online: false });
    const health = await res.json();
    return Response.json({ online: true, ...health });
  } catch {
    // Falha/timeout: gateway indisponível.
    return Response.json({ online: false });
  } finally {
    clearTimeout(timer);
  }
}
