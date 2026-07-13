export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { readSession } from "../../../lib/auth";
import { query, migrateDb, createUser } from "../../../lib/db";
import { hashPasswordBcrypt } from "../../../lib/auth";
import { isAdminEmail } from "../../../lib/allowlist";

async function isAdmin(username: string): Promise<boolean> {
  return isAdminEmail(username);
}

export async function GET(req: Request) {
  const username = readSession(req.headers.get("cookie"));
  if (!username || !(await isAdmin(username))) {
    return Response.json({ error: "Não autorizado" }, { status: 403 });
  }
  await migrateDb();
  const result = await query("SELECT username, created_at FROM users ORDER BY created_at DESC");
  return Response.json({ users: result.rows });
}

export async function POST(req: Request) {
  const username = readSession(req.headers.get("cookie"));
  if (!username || !(await isAdmin(username))) {
    return Response.json({ error: "Não autorizado" }, { status: 403 });
  }
  try {
    const { username: newUser, password } = await req.json();
    if (!newUser || !password) {
      return Response.json({ error: "username e password são obrigatórios" }, { status: 400 });
    }
    if (typeof password !== "string" || password.length < 8) {
      return Response.json({ error: "Senha muito curta — mínimo 8 caracteres." }, { status: 400 });
    }
    await migrateDb();
    const hash = await hashPasswordBcrypt(password);
    await createUser(newUser.trim().toLowerCase(), hash);
    return Response.json({ ok: true }, { status: 201 });
  } catch (e: any) {
    if (e?.message?.includes("unique") || e?.code === "23505") {
      return Response.json({ error: "Usuário já existe" }, { status: 409 });
    }
    return Response.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const username = readSession(req.headers.get("cookie"));
  if (!username || !(await isAdmin(username))) {
    return Response.json({ error: "Não autorizado" }, { status: 403 });
  }
  try {
    const { username: target } = await req.json();
    if (!target) return Response.json({ error: "username obrigatório" }, { status: 400 });
    // LGPD: remove também as conversas do usuário (revoga links públicos junto)
    // e o acesso dele a conversas compartilhadas por colegas.
    await query("DELETE FROM conversations WHERE username = $1", [target]);
    await query(
      "UPDATE conversations SET shared_with = array_remove(shared_with, $1) WHERE $1 = ANY(shared_with)",
      [target]
    );
    await query("DELETE FROM users WHERE username = $1", [target]);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Erro interno" }, { status: 500 });
  }
}
