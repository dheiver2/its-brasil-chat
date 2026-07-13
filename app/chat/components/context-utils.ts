import type { Message } from "./types";

export function prepareHistoryForModel(messages: Message[], maxMessages = 24) {
  const normalized = messages
    .filter((message) => Boolean(message?.content || message?.role))
    .map((message) => ({
      ...message,
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
