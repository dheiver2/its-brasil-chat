"use client";
import { useRef, useState } from "react";

interface ImageAttach {
  dataUrl: string;
  name: string;
  type: string;
}

export function ImageUpload({ onAttach, onRemove, attached }: {
  onAttach: (img: ImageAttach) => void;
  onRemove: () => void;
  attached: ImageAttach | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  async function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!e.target.files) return;
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return;

    setLoading(true);
    try {
      const dataUrl = await new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result as string);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      onAttach({ dataUrl, name: file.name, type: file.type });
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleSelect} />
      {attached ? (
        <div className="file-chip image-chip">
          <img src={attached.dataUrl} alt={attached.name} className="image-preview-thumb" />
          <span>{attached.name}</span>
          <button onClick={onRemove} aria-label="Remover imagem">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      ) : (
        <button
          className="attach-btn"
          onClick={() => inputRef.current?.click()}
          type="button"
          aria-label="Anexar imagem"
          title="Anexar imagem"
          disabled={loading}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8"/>
            <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
    </>
  );
}

export type { ImageAttach };
