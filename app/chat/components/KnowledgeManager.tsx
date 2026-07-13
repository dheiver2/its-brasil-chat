"use client";
import { useState, useEffect, useCallback } from "react";

interface Article {
  id: number;
  title: string;
  content: string;
  tags: string[];
}

export function KnowledgeManager() {
  const [open, setOpen] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/knowledge?raw=1");
      if (!res.ok) return;
      const data = await res.json();
      setArticles(data.articles || []);
    } catch {}
  }, []);

  useEffect(() => { if (open) load(); }, [open, load]);

  async function add() {
    if (!title.trim() || !content.trim()) return;
    const res = await fetch("/api/knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, tags: tags.split(",").map((t) => t.trim()).filter(Boolean) }),
    });
    if (res.ok) { setTitle(""); setContent(""); setTags(""); load(); }
  }

  async function remove(id: number) {
    const res = await fetch("/api/knowledge", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) load();
  }

  return (
    <>
      <button className="icon-btn" onClick={() => setOpen(true)} title="Gerenciar base de conhecimento">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M4 19.5A2.5 2.5 0 016.5 17H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" stroke="currentColor" strokeWidth="1.8"/>
        </svg>
      </button>
      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Base de Conhecimento</h3>
              <button className="modal-close" onClick={() => setOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="kb-form">
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título do artigo" />
                <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Conteúdo…" rows={4} />
                <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags (separadas por vírgula)" />
                <button className="primary" onClick={add}>Adicionar</button>
              </div>
              <div className="kb-search">
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar na base de conhecimento" />
              </div>
              <div className="kb-list">
                {articles.length === 0 && <p className="kb-empty">Nenhum artigo cadastrado.</p>}
                {articles.filter((a) => `${a.title} ${a.content} ${a.tags.join(" ")}`.toLowerCase().includes(search.toLowerCase())).map((a) => (
                  <div key={a.id} className="kb-item">
                    <strong>{a.title}</strong>
                    <p>{a.content.slice(0, 200)}{a.content.length > 200 ? "…" : ""}</p>
                    {a.tags?.length > 0 && <small>{a.tags.join(", ")}</small>}
                    <button className="kb-del" onClick={() => remove(a.id)} aria-label="Excluir">Excluir</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
