"use client";
import { useMemo } from "react";
import type { Message } from "./types";

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function TokenCounter({ messages }: { messages: Message[] }) {
  const stats = useMemo(() => {
    let input = 0;
    let output = 0;
    for (const m of messages) {
      const t = estimateTokens(m.content);
      if (m.role === "assistant") output += t;
      else input += t;
    }
    return { input, output, total: input + output };
  }, [messages]);

  if (messages.length === 0) return null;

  return (
    <div className="token-counter">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
        <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
      </svg>
      <span title={`~${stats.input} tokens de entrada, ~${stats.output} tokens de saída`}>
        ~{stats.total.toLocaleString()} tokens
      </span>
    </div>
  );
}
