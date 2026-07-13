"use client";
import { useState, useMemo } from "react";
import type { Message } from "./types";

export function MessageSearch({ messages, onJump }: { messages: Message[]; onJump: (index: number) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<number[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);

  const allText = useMemo(() => {
    return messages.map((m, i) => ({ index: i, text: m.content.toLowerCase() }));
  }, [messages]);

  function search(q: string) {
    setQuery(q);
    if (!q.trim()) { setResults([]); return; }
    const lower = q.toLowerCase();
    const found = allText.filter((t) => t.text.includes(lower)).map((t) => t.index);
    setResults(found);
    setCurrentIdx(0);
    if (found.length > 0) onJump(found[0]);
  }

  function navigate(dir: "prev" | "next") {
    let idx = currentIdx;
    if (dir === "next") idx = (idx + 1) % results.length;
    else idx = (idx - 1 + results.length) % results.length;
    setCurrentIdx(idx);
    onJump(results[idx]);
  }

  if (messages.length === 0) return null;

  return (
    <div className="msg-search">
      <div className="msg-search-input">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8"/>
          <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
        <input
          value={query}
          onChange={(e) => search(e.target.value)}
          placeholder="Buscar na conversa…"
          aria-label="Buscar mensagens"
        />
        {query && (
          <button className="clear" onClick={() => { setQuery(""); setResults([]); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>
      {results.length > 0 && (
        <div className="msg-search-nav">
          <span className="msg-search-count">{currentIdx + 1} de {results.length}</span>
          <button onClick={() => navigate("prev")} type="button" aria-label="Anterior">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button onClick={() => navigate("next")} type="button" aria-label="Próximo">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
