// Utilidades de Artifacts: detecção de tipo e geração do documento do iframe.
// Mermaid e React rodam via CDN dentro do iframe (sem dependências no bundle).

export type ArtifactKind = "html" | "svg" | "mermaid" | "react";

export function artifactKind(lang: string): ArtifactKind | null {
  const l = (lang || "").toLowerCase();
  if (l === "html") return "html";
  if (l === "svg") return "svg";
  if (l === "mermaid") return "mermaid";
  if (l === "jsx" || l === "tsx" || l === "react") return "react";
  return null;
}

export function artifactLabel(kind: ArtifactKind): string {
  return { html: "HTML", svg: "SVG", mermaid: "Diagrama", react: "React" }[kind];
}

export function artifactExt(kind: ArtifactKind): string {
  return kind === "svg" ? "svg" : kind === "react" ? "jsx" : "html";
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Documento HTML completo renderizado no iframe sandbox para cada tipo. */
export function buildSrcDoc(code: string, kind: ArtifactKind): string {
  if (kind === "svg") {
    return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;height:100%;display:flex;align-items:center;justify-content:center;background:#fff}svg{max-width:100%;max-height:100%}</style></head><body>${code}</body></html>`;
  }

  if (kind === "mermaid") {
    return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:16px;background:#fff;font-family:system-ui,sans-serif}#d{display:flex;justify-content:center}</style></head><body><div id="d" class="mermaid">${escapeHtml(code)}</div><script type="module">import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';try{mermaid.initialize({startOnLoad:false,theme:'default'});const el=document.getElementById('d');const {svg}=await mermaid.render('graph',el.textContent.trim());el.innerHTML=svg;}catch(e){document.getElementById('d').innerHTML='<pre style="color:#b00;white-space:pre-wrap">'+(e&&e.message||e)+'</pre>';}<\/script></body></html>`;
  }

  if (kind === "react") {
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"><\/script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"><\/script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
<style>body{margin:0;padding:16px;font-family:system-ui,sans-serif}#root{min-height:50px}#err{color:#b00;white-space:pre-wrap;font-family:monospace}</style>
</head><body><div id="root"></div><pre id="err"></pre>
<script type="text/babel" data-presets="react,typescript">
${code}
<\/script>
<script type="text/babel" data-presets="react,typescript">
try {
  const C = (typeof App !== 'undefined') ? App : (typeof Component !== 'undefined') ? Component : null;
  if (!C) { document.getElementById('err').textContent = 'Defina um componente chamado App (ex.: function App() { ... }).'; }
  else { ReactDOM.createRoot(document.getElementById('root')).render(<C/>); }
} catch (e) { document.getElementById('err').textContent = String(e && e.message || e); }
<\/script>
</body></html>`;
  }

  // html: documento completo usa direto; senão, embrulha.
  if (/<html[\s>]/i.test(code)) return code;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>${code}</body></html>`;
}
