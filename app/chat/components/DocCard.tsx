"use client";
import { useState } from "react";

export function DocCard({ json }: { json: string }) {
  const [downloading, setDownloading] = useState(false);
  const [err, setErr] = useState("");

  let spec: { title?: string; blocks?: Array<{ type?: string; text?: string; items?: string[]; columns?: string[] }> } | null = null;
  try { spec = JSON.parse(json); } catch { spec = null; }

  if (!spec || !Array.isArray(spec.blocks) || !spec.blocks.length) {
    return (
      <div className="sheet-card pending">
        <span className="typing"><span/><span/><span/></span>
        Preparando documento…
      </div>
    );
  }

  const blocks = spec.blocks;
  const headings = blocks.filter((b) => b.type === "heading").length;
  const tables = blocks.filter((b) => b.type === "table").length;

  async function download() {
    setErr("");
    setDownloading(true);
    try {
      const res = await fetch("/api/document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: json,
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Falha ao gerar o documento.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(spec!.title || "documento").replace(/[^a-z0-9_\-]+/gi, "_").toLowerCase()}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="sheet-card">
      <div className="sheet-head">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="1.8"/>
          <path d="M14 2v6h6M8 13h8M8 17h8M8 9h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
        <span className="sheet-title">{spec.title || "Documento"}</span>
        <button className="sheet-dl" onClick={download} disabled={downloading} type="button">
          {downloading ? "Gerando…" : "Baixar .docx"}
        </button>
      </div>
      <div className="sheet-more">
        {blocks.length} bloco(s){headings ? ` · ${headings} título(s)` : ""}{tables ? ` · ${tables} tabela(s)` : ""}
      </div>
      {err && <div className="error">{err}</div>}
    </div>
  );
}
