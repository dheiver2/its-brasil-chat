"use client";
import { useContext, useMemo, useState } from "react";
import { CodeBlock } from "./CodeBlock";
import { ArtifactContext } from "./ArtifactContext";
import { artifactKind, artifactLabel, artifactExt, buildSrcDoc } from "./artifact-utils";

/**
 * Artifact ao estilo claude.ai: HTML/SVG/Mermaid/React renderizados ao vivo em
 * iframe isolado, com Preview/Código, copiar, baixar, abrir em aba e expandir
 * para o painel lateral.
 */
export function ArtifactCard({ code, lang }: { code: string; lang: string }) {
  const [view, setView] = useState<"preview" | "code">("preview");
  const ctx = useContext(ArtifactContext);
  const kind = artifactKind(lang) || "html";
  const srcDoc = useMemo(() => buildSrcDoc(code, kind), [code, kind]);

  function download() {
    const ext = artifactExt(kind);
    const blob = new Blob([code], { type: ext === "svg" ? "image/svg+xml" : "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `artifact.${ext}`; a.click();
    URL.revokeObjectURL(url);
  }
  function openTab() {
    const blob = new Blob([srcDoc], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }

  return (
    <div className="artifact-card">
      <div className="artifact-head">
        <span className="artifact-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 5h16v14H4zM4 9h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
          Artifact · {artifactLabel(kind)}
        </span>
        <div className="artifact-actions">
          <div className="artifact-toggle">
            <button className={view === "preview" ? "on" : ""} onClick={() => setView("preview")} type="button">Preview</button>
            <button className={view === "code" ? "on" : ""} onClick={() => setView("code")} type="button">Código</button>
          </div>
          {ctx && (
            <button className="artifact-btn" onClick={() => ctx.open({ code, lang })} type="button" title="Expandir no painel" aria-label="Expandir no painel">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M9 3H3v6M15 21h6v-6M21 3l-7 7M3 21l7-7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          )}
          <button className="artifact-btn" onClick={openTab} type="button" title="Abrir em nova aba" aria-label="Abrir em nova aba">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button className="artifact-btn" onClick={download} type="button" title="Baixar" aria-label="Baixar">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      </div>
      {view === "preview" ? (
        <iframe className="artifact-frame" title="Artifact preview" sandbox="allow-scripts allow-popups allow-forms" srcDoc={srcDoc} />
      ) : (
        <CodeBlock code={code} lang={lang} />
      )}
    </div>
  );
}
