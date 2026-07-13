"use client";
import type { Source } from "./types";

export function Sources({ sources }: { sources: Source[] }) {
  if (!sources.length) return null;
  const domain = (u: string) => {
    try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; }
  };
  return (
    <div className="sources">
      <div className="sources-label">Fontes</div>
      <div className="sources-list">
        {sources.map((s, i) => (
          <a key={i} className="source-chip" href={s.url} target="_blank" rel="noreferrer noopener" title={s.title}>
            <span className="source-num">{i + 1}</span>
            <span className="source-domain">{domain(s.url)}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
