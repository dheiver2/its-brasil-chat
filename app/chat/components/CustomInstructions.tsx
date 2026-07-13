"use client";
import { useState, useEffect, useRef } from "react";

export function CustomInstructions({
  instructions,
  onSave,
}: {
  instructions: string;
  onSave: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(instructions);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setText(instructions);
  }, [instructions]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function save() {
    setSaving(true);
    onSave(text);
    await new Promise((r) => setTimeout(r, 300));
    setSaving(false);
    setOpen(false);
  }

  return (
    <div className="instructions-wrap" ref={ref}>
      <button
        className={`icon-btn${instructions ? " has-instructions" : ""}`}
        onClick={() => setOpen(!open)}
        type="button"
        aria-label="Instruções personalizadas"
        title={instructions ? "Instruções personalizadas ativas" : "Adicionar instruções personalizadas"}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {instructions && <span className="instructions-dot" />}
      </button>
      {open && (
        <div className="instructions-panel">
          <div className="instructions-header">
            <strong>Instruções personalizadas</strong>
            <button className="instructions-close" onClick={() => setOpen(false)} type="button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          <p className="instructions-hint">
            A IA seguirá estas instruções em todas as conversas.
          </p>
          <textarea
            className="instructions-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ex: Responda sempre de forma técnica e detalhada. Prefira listas e exemplos de código."
            rows={5}
          />
          <div className="instructions-actions">
            <button className="instructions-clear" onClick={() => { setText(""); }} type="button">
              Limpar
            </button>
            <button className="instructions-save" onClick={save} disabled={saving} type="button">
              {saving ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
