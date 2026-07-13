"use client";
import { useState } from "react";

export function ConversationShare({ conversationId, sharedId }: { conversationId: string; sharedId?: string }) {
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState(sharedId ? `${window.location.origin}/chat/shared/${sharedId}` : "");
  const [copied, setCopied] = useState(false);
  const [targetUser, setTargetUser] = useState("");
  const [showUserInput, setShowUserInput] = useState(false);

  async function shareWithUser() {
    if (!targetUser.trim()) return;
    setSharing(true);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, targetUser: targetUser.trim().toLowerCase() }),
      });
      if (res.ok) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        setShowUserInput(false);
        setTargetUser("");
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao compartilhar");
      }
    } catch { alert("Erro de conexão"); }
    finally { setSharing(false); }
  }

  async function revokePublic() {
    setSharing(true);
    try {
      const res = await fetch("/api/share", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId }),
      });
      if (res.ok) {
        setShareUrl("");
        setShowUserInput(false);
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Erro ao revogar o link");
      }
    } catch { alert("Erro de conexão"); }
    finally { setSharing(false); }
  }

  async function sharePublic() {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return;
    }
    setSharing(true);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId }),
      });
      if (res.ok) {
        const { id } = await res.json();
        const url = `${window.location.origin}/chat/shared/${id}`;
        setShareUrl(url);
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch { /* ignore */ }
    finally { setSharing(false); }
  }

  return (
    <div className="share-wrap">
      <button className="export-btn" onClick={() => setShowUserInput(!showUserInput)} type="button" title="Compartilhar" disabled={sharing}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
          <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="1.8"/>
          <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/>
          <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="1.8"/>
          <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
        <span className="btn-label">{copied ? "Copiado!" : "Compartilhar"}</span>
      </button>
      {showUserInput && (
        <div className="share-user-form">
          <input value={targetUser} onChange={(e) => setTargetUser(e.target.value)} placeholder="Email do colega…" />
          <button className="primary" onClick={shareWithUser} disabled={sharing || !targetUser.trim()}>Enviar</button>
          <button className="ghost" onClick={sharePublic} disabled={sharing}>{shareUrl ? "Copiar link" : "Criar link"}</button>
          {shareUrl && (
            <button className="ghost" onClick={revokePublic} disabled={sharing} title="O link público deixa de funcionar">
              Parar de compartilhar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
