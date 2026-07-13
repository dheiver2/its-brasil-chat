"use client";
import { useEffect, useState } from "react";
import { MessageContent } from "../../components/MessageContent";

export default function SharedConversationPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<{ title: string; messages: Array<{ role: string; content: string }> } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/share?id=${params.id}`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then(setData)
      .catch(() => setError("Conversa não encontrada ou link inválido."));
  }, [params.id]);

  if (error) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <h1>Conversa não encontrada</h1>
          <p>{error}</p>
          <a className="login-back" href="/chat">← Ir para o chat</a>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <p>Carregando conversa compartilhada…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="shared-page">
      <div className="shared-header">
        <a href="/chat" className="shared-back">← Voltar ao chat</a>
        <h1>{data.title}</h1>
        <p className="shared-meta">Conversa compartilhada • {data.messages.length} mensagens</p>
      </div>
      <div className="shared-thread">
        {data.messages.map((m, i) => (
          <div key={i} className={`row ${m.role}`}>
            {m.role === "assistant" && (
              <div className="avatar">
                <img src="/logo-its.png" alt="A1" />
              </div>
            )}
            <div className="content">
              {m.role === "assistant" ? (
                <>
                  <div className="name">Ítala</div>
                  <MessageContent content={m.content} />
                </>
              ) : (
                <div className="bubble">{m.content}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
