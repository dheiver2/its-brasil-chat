export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { readSession } from "../../lib/auth";
import {
  shareConversation,
  migrateConversations,
  setSharedId,
  clearSharedId,
  findConversationBySharedId,
} from "../../lib/db";

export async function POST(req: Request) {
  const username = readSession(req.headers.get("cookie"));
  if (!username) return Response.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const { conversationId, targetUser } = await req.json();
    if (!conversationId || typeof conversationId !== "string") {
      return Response.json({ error: "conversationId inválido" }, { status: 400 });
    }
    await migrateConversations();
    if (targetUser && typeof targetUser === "string") {
      // Compartilhar com usuário específico
      await shareConversation(conversationId, username, targetUser.trim().toLowerCase());
      return Response.json({ ok: true });
    }
    // Link público — persistido no banco (sobrevive a cold starts na Vercel).
    // Se a conversa já tem link, reutiliza o mesmo id (link estável).
    const shareId = crypto.randomUUID().slice(0, 8);
    const saved = await setSharedId(conversationId, username, shareId);
    if (!saved) {
      return Response.json(
        { error: "Conversa ainda não sincronizada — envie uma mensagem e tente de novo." },
        { status: 404 }
      );
    }
    return Response.json({ id: saved });
  } catch {
    return Response.json({ error: "Erro interno" }, { status: 500 });
  }
}

/** Revoga o link público de uma conversa (só o dono pode). */
export async function DELETE(req: Request) {
  const username = readSession(req.headers.get("cookie"));
  if (!username) return Response.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const { conversationId } = await req.json();
    if (!conversationId || typeof conversationId !== "string") {
      return Response.json({ error: "conversationId inválido" }, { status: 400 });
    }
    const revoked = await clearSharedId(conversationId, username);
    return Response.json({ ok: true, revoked });
  } catch {
    return Response.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const shareId = url.searchParams.get("id");
  if (!shareId) return Response.json({ error: "id ausente" }, { status: 400 });

  try {
    const conversation = await findConversationBySharedId(shareId);
    if (!conversation) return Response.json({ error: "Não encontrado" }, { status: 404 });
    return Response.json({
      title: conversation.title,
      messages: conversation.messages,
    });
  } catch {
    return Response.json({ error: "Erro interno" }, { status: 500 });
  }
}
