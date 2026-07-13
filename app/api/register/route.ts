export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Auto-cadastro ABERTO: qualquer colaborador cria a própria conta com
// e-mail + senha. Cria a conta (bcrypt), evita duplicados e já autentica
// (define o cookie de sessão). Rate-limit por IP contra abuso.
import { hashPasswordBcrypt, createSessionToken, sessionCookie } from "../../lib/auth";
import { createUser, userExists, migrateDb } from "../../lib/db";
import { normalizeEmail, displayName, EMAIL_RE } from "../../lib/allowlist";
import { rateLimit, LIMITS, getIp, tooManyRequests } from "../../lib/ratelimit";

export async function POST(req: Request) {
  const ip = getIp(req);
  const rl = await rateLimit(`register:${ip}`, LIMITS.register.limit, LIMITS.register.windowSecs);
  if (!rl.allowed) return tooManyRequests(rl.resetAt);

  let email = "";
  let password = "";
  try {
    const body = await req.json();
    email = normalizeEmail(body.email ?? body.username ?? "");
    password = String(body.password || "");
  } catch { /* validado abaixo */ }

  if (!EMAIL_RE.test(email)) {
    return Response.json({ error: "Informe um e-mail válido." }, { status: 400 });
  }
  if (password.length < 8) {
    return Response.json({ error: "A senha deve ter pelo menos 8 caracteres." }, { status: 400 });
  }

  try {
    await migrateDb(); // garante a tabela users (idempotente)
    if (await userExists(email)) {
      return Response.json(
        { error: "Já existe uma conta com este e-mail. Faça login." },
        { status: 409 }
      );
    }
    const hash = await hashPasswordBcrypt(password);
    await createUser(email, hash);
    const token = createSessionToken(email);
    return new Response(JSON.stringify({ user: email, name: displayName(email) }), {
      status: 201,
      headers: { "Content-Type": "application/json", "Set-Cookie": sessionCookie(token) },
    });
  } catch (e) {
    // Corrida no UNIQUE (dois cadastros simultâneos) cai aqui como conflito.
    const msg = String((e as Error)?.message || "");
    if (/duplicate key|unique/i.test(msg)) {
      return Response.json(
        { error: "Já existe uma conta com este e-mail. Faça login." },
        { status: 409 }
      );
    }
    console.error("register error", e);
    return Response.json({ error: "Não foi possível criar a conta. Tente novamente." }, { status: 500 });
  }
}
