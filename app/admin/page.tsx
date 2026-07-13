"use client";
import { useEffect, useState } from "react";

export default function AdminPage() {
  const [users, setUsers] = useState<Array<{ username: string; created_at: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPass, setNewPass] = useState("");
  // Status do gateway Mangaba (health-check)
  const [gw, setGw] = useState<any>(null);
  const [gwLoading, setGwLoading] = useState(true);

  async function loadGateway() {
    setGwLoading(true);
    try {
      const res = await fetch("/api/admin/gateway", { cache: "no-store" });
      setGw(res.ok ? await res.json() : { online: false });
    } catch { setGw({ online: false }); }
    finally { setGwLoading(false); }
  }

  async function loadUsers() {
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      if (res.ok) setUsers((await res.json()).users || []);
      else setError("Sem permissão de admin");
    } catch { setError("Erro ao carregar"); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadUsers(); loadGateway(); }, []);

  async function createUser() {
    if (!newEmail || !newPass) return;
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newEmail, password: newPass }),
      });
      if (res.ok) { setNewEmail(""); setNewPass(""); loadUsers(); }
      else { const d = await res.json(); alert(d.error || "Erro"); }
    } catch { alert("Erro de conexão"); }
  }

  async function deleteUser(username: string) {
    if (!confirm(`Excluir ${username}?`)) return;
    try {
      await fetch(`/api/admin/users`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      loadUsers();
    } catch {}
  }

  if (loading) return <div className="login-screen"><p>Carregando…</p></div>;

  return (
    <div className="manual" style={{ maxWidth: 600 }}>
      <div className="manual-head">
        <img src="/logo-its.png" alt="A1" />
        <h1>Admin</h1>
      </div>
      {error && <div style={{ color: "#c0392b", marginBottom: 16 }}>{error}</div>}

      <section>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Status do Gateway</h2>
          <button onClick={loadGateway} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid var(--borda)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: "0.8rem" }}>Atualizar</button>
        </div>
        <div style={{ margin: "12px 0 24px", padding: 14, borderRadius: 10, border: "1px solid var(--borda)", background: "var(--fundo-suave, transparent)" }}>
          {gwLoading ? (
            <p style={{ margin: 0, color: "var(--texto-suave)" }}>Consultando…</p>
          ) : !gw?.online ? (
            <p style={{ margin: 0, color: "#c0392b" }}>Gateway indisponível</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: "0.9rem" }}>
              <div><strong>Modelos carregados:</strong> {(gw.loaded_models?.length ? gw.loaded_models.join(", ") : "—")}</div>
              <div><strong>Memória:</strong> {gw.used_gb ?? "?"} / {gw.budget_gb ?? "?"} GB</div>
              <div><strong>Ready:</strong> {gw.ready ? "sim" : "não"}</div>
              <div><strong>Fila:</strong> {gw.queue_depth ?? 0} / {gw.queue_capacity ?? 0}</div>
              <div><strong>Total de modelos:</strong> {gw.total_models ?? "—"}</div>
            </div>
          )}
        </div>
      </section>

      <section>
        <h2>Criar usuário</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="E-mail" style={{ padding: 10, borderRadius: 8, border: "1px solid var(--borda)", fontFamily: "inherit" }} />
          <input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="Senha" style={{ padding: 10, borderRadius: 8, border: "1px solid var(--borda)", fontFamily: "inherit" }} />
          <button onClick={createUser} style={{ padding: 10, borderRadius: 8, border: "none", background: "var(--verde-vivo)", color: "#fff", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Criar</button>
        </div>
      </section>

      <section>
        <h2>Usuários ({users.length})</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--borda)", textAlign: "left" }}>
              <th style={{ padding: 8 }}>Email</th>
              <th style={{ padding: 8 }}>Criado em</th>
              <th style={{ padding: 8 }}></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.username} style={{ borderBottom: "1px solid var(--borda)" }}>
                <td style={{ padding: 8 }}>{u.username}</td>
                <td style={{ padding: 8, fontSize: "0.85rem", color: "var(--texto-suave)" }}>{new Date(u.created_at).toLocaleDateString("pt-BR")}</td>
                <td style={{ padding: 8 }}>
                  <button onClick={() => deleteUser(u.username)} style={{ border: "none", background: "transparent", color: "#c0392b", cursor: "pointer", fontFamily: "inherit", fontSize: "0.85rem" }}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <a href="/chat" style={{ display: "block", marginTop: 24, color: "var(--verde-vivo)" }}>← Voltar ao chat</a>
    </div>
  );
}
