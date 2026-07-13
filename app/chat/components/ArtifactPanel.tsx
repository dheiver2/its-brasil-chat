"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { CodeBlock } from "./CodeBlock";
import type { OpenArtifact } from "./ArtifactContext";
import { artifactKind, artifactLabel, artifactExt, buildSrcDoc } from "./artifact-utils";

const WIDTH_KEY = "its-artifact-width";

/** Painel lateral (overlay) redimensionável que exibe o artifact em destaque. */
export function ArtifactPanel({ artifact, onClose }: { artifact: OpenArtifact; onClose: () => void }) {
  const [view, setView] = useState<"preview" | "code">("preview");
  const [width, setWidth] = useState(560);
  const dragging = useRef(false);

  useEffect(() => {
    const saved = Number(localStorage.getItem(WIDTH_KEY));
    if (saved >= 360) setWidth(saved);
  }, []);

  useEffect(() => {
    function move(e: MouseEvent) {
      if (!dragging.current) return;
      const w = Math.min(Math.max(window.innerWidth - e.clientX, 360), Math.min(window.innerWidth - 280, 1100));
      setWidth(w);
    }
    function up() {
      if (dragging.current) { dragging.current = false; document.body.style.userSelect = ""; localStorage.setItem(WIDTH_KEY, String(width)); }
    }
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, [width]);

  const kind = artifactKind(artifact.lang) || "html";
  const srcDoc = useMemo(() => buildSrcDoc(artifact.code, kind), [artifact, kind]);

  function download() {
    const ext = artifactExt(kind);
    const blob = new Blob([artifact.code], { type: ext === "svg" ? "image/svg+xml" : "text/plain" });
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
    <aside className="artifact-panel" style={{ width }}>
      <div className="artifact-resizer" onMouseDown={() => { dragging.current = true; document.body.style.userSelect = "none"; }} />
      <div className="artifact-panel-head">
        <span className="artifact-title">Artifact · {artifactLabel(kind)}</span>
        <div className="artifact-actions">
          <div className="artifact-toggle">
            <button className={view === "preview" ? "on" : ""} onClick={() => setView("preview")} type="button">Preview</button>
            <button className={view === "code" ? "on" : ""} onClick={() => setView("code")} type="button">Código</button>
          </div>
          <button className="artifact-btn" onClick={openTab} type="button" title="Abrir em nova aba" aria-label="Abrir em nova aba">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button className="artifact-btn" onClick={download} type="button" title="Baixar" aria-label="Baixar">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button className="artifact-btn" onClick={onClose} type="button" title="Fechar" aria-label="Fechar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>
      </div>
      <div className="artifact-panel-body">
        {view === "preview" ? (
          <iframe className="artifact-panel-frame" title="Artifact" sandbox="allow-scripts allow-popups allow-forms" srcDoc={srcDoc} />
        ) : (
          <CodeBlock code={artifact.code} lang={artifact.lang} />
        )}
      </div>
    </aside>
  );
}
