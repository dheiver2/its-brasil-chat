"use client";
import { useState, useRef, useEffect } from "react";

const AVAILABLE_MODELS = [
  { id: "", label: "Automático (padrão)", description: "Melhor modelo disponível" },
  { id: "mangaba-pro", label: "Mangaba Pro", description: "Máxima qualidade" },
  { id: "mangaba-mini", label: "Mangaba Mini", description: "Rápido e leve" },
  { id: "llama3.2", label: "Llama 3.2", description: "Alta performance" },
  { id: "mistral", label: "Mistral", description: "Bom equilíbrio" },
];

export function ModelSelector({
  currentModel,
  onSelect,
}: {
  currentModel: string;
  onSelect: (model: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selected = AVAILABLE_MODELS.find((m) => m.id === currentModel) || AVAILABLE_MODELS[0];

  return (
    <div className="model-selector" ref={ref}>
      <button className="model-selector-btn" onClick={() => setOpen(!open)} type="button">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
          <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
        </svg>
        <span className="model-selector-label">{selected.label}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="model-chevron">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div className="model-selector-dropdown">
          {AVAILABLE_MODELS.map((m) => (
            <button
              key={m.id}
              className={`model-option${m.id === currentModel ? " active" : ""}`}
              onClick={() => { onSelect(m.id); setOpen(false); }}
              type="button"
            >
              <span className="model-option-label">{m.label}</span>
              <span className="model-option-desc">{m.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
