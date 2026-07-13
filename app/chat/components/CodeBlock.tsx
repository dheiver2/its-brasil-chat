"use client";
import { memo, useEffect, useRef, useState } from "react";
import hljs from "highlight.js/lib/common";

export const CodeBlock = memo(function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const ref = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    try {
      if (lang && hljs.getLanguage(lang)) {
        el.innerHTML = hljs.highlight(code, { language: lang }).value;
      } else {
        el.innerHTML = hljs.highlightAuto(code).value;
      }
    } catch {
      el.textContent = code;
    }
  }, [code, lang]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  }

  return (
    <div className="code-block">
      <div className="code-head">
        <span className="code-lang">{lang || "código"}</span>
        <button className="code-copy" onClick={copy} type="button">
          {copied ? (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Copiado
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
                <path d="M5 15V5a2 2 0 012-2h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              Copiar
            </>
          )}
        </button>
      </div>
      <pre><code ref={ref} className="hljs">{code}</code></pre>
    </div>
  );
});
