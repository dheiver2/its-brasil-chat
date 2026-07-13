import type { Message } from "./types";

export function prepareHistoryForModel(messages: Message[], maxMessages = 24) {
  // Envia ao modelo APENAS role + content (descarta image/sources/reactions —
  // não são contexto para o LLM e a miniatura em base64 pesaria muito).
  const normalized = messages
    .filter((message) => Boolean(message?.content || message?.role))
    .map((message) => ({
      role: message.role,
      content: typeof message.content === "string" ? message.content : "",
    }));

  if (normalized.length <= maxMessages) {
    return normalized;
  }

  const recent = normalized.slice(-maxMessages);
  const older = normalized.slice(0, -maxMessages);
  const olderText = older
    .map((message) => `${message.role === "user" ? "Usuário" : "Assistente"}: ${message.content}`)
    .join("\n")
    .slice(0, 1800);

  return [
    {
      role: "assistant" as const,
      content: `Resumo da conversa anterior: ${olderText || "Contexto anterior compactado para manter a resposta rápida."}`,
    },
    ...recent,
  ];
}
