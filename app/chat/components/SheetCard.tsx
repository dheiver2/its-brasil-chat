"use client";
import { useState } from "react";

export function SheetCard({ json }: { json: string }) {
  const [downloading, setDownloading] = useState(false);
  const [err, setErr] = useState("");

  let spec: { title?: string; sheets?: Array<{ name?: string; columns?: string[]; rows?: unknown[][] }> } | null = null;
  try { spec = JSON.parse(json); } catch { spec = null; }

  if (!spec || !Array.isArray(spec.sheets) || !spec.sheets.length) {
    return (
      <div className="sheet-card pending">
        <span className="typing"><span/><span/><span/></span>
        Preparando planilha…
      </div>
    );
  }

  const first = spec.sheets[0];
  const cols = first.columns || [];
  const previewRows = (first.rows || []).slice(0, 5);

  async function download() {
    setErr("");
    setDownloading(true);
    try {
      const res = await fetch("/api/spreadsheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: json,
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Falha ao gerar a planilha.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(spec!.title || "planilha").replace(/[^a-z0-9_\-]+/gi, "_").toLowerCase()}.xlsx`;
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
          <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8"/>
          <path d="M3 9h18M3 15h18M9 3v18M15 3v18" stroke="currentColor" strokeWidth="1.4"/>
        </svg>
        <span className="sheet-title">{spec.title || "Planilha"}</span>
        <button className="sheet-dl" onClick={download} disabled={downloading} type="button">
          {downloading ? "Gerando…" : "Baixar .xlsx"}
        </button>
      </div>
      {cols.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead><tr>{cols.map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
            <tbody>
              {previewRows.map((r, ri) => (
                <tr key={ri}>{(r as unknown[]).map((v, ci) => <td key={ci}>{String(v)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {(first.rows?.length || 0) > previewRows.length && (
        <div className="sheet-more">+{(first.rows!.length - previewRows.length)} linha(s) na planilha completa</div>
      )}
      {err && <div className="error">{err}</div>}
    </div>
  );
}
