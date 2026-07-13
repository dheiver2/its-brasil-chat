// ============================================================
// Banco de dados — Supabase Postgres
// Pool global singleton: reutilizado entre invocações warm do
// serverless (evita nova conexão TCP a cada request).
// Usa o POOLER do Supabase (porta 6543 / PgBouncer) que é
// projetado para alta concorrência serverless.
// ============================================================
import { Pool, QueryResultRow } from "pg";

// Singleton global — persiste entre requests na mesma instância warm.
const g = globalThis as typeof globalThis & { _a1pool?: Pool };

function getPool(): Pool {
  if (!g._a1pool) {
    const url = (
      process.env.POSTGRES_URL ||           // pooler (preferencial)
      process.env.POSTGRES_URL_NON_POOLING  // fallback direto
    )?.replace("sslmode=require", "sslmode=no-verify");

    if (!url) throw new Error("POSTGRES_URL não configurada.");

    g._a1pool = new Pool({
      connectionString: url,
      // max pequeno por instância: o PgBouncer gerencia o pool real.
      // Com Vercel auto-scaling (N instâncias × max:3 = N×3 conexões ao PgBouncer).
      max: 3,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });

    g._a1pool.on("error", (err) => {
      console.error("Pool error:", err.message);
      // Força recriação no próximo request
      g._a1pool = undefined;
    });
  }
  return g._a1pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: unknown[] = []
) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    return await client.query<T>(sql, params);
  } finally {
    client.release();
  }
}

// Cria a tabela de usuários (idempotente). Chame uma vez, não em cada request.
export async function migrateDb() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      username      TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function createUser(username: string, passwordHash: string) {
  await query(
    "INSERT INTO users (username, password_hash) VALUES ($1, $2)",
    [username, passwordHash]
  );
}

export async function findUser(username: string): Promise<{ password_hash: string } | null> {
  const res = await query<{ password_hash: string }>(
    "SELECT password_hash FROM users WHERE username = $1 LIMIT 1",
    [username]
  );
  return res.rows[0] ?? null;
}

export async function updatePasswordHash(username: string, newHash: string) {
  await query(
    "UPDATE users SET password_hash = $1 WHERE username = $2",
    [newHash, username]
  );
}

export async function userExists(username: string): Promise<boolean> {
  const res = await query(
    "SELECT 1 FROM users WHERE username = $1 LIMIT 1",
    [username]
  );
  return res.rows.length > 0;
}

// ============================================================
// Conversas — sync server-side
// ============================================================

export interface ConversationRow {
  id: string;
  title: string;
  model: string | null;
  messages: Array<{ role: string; content: string }>;
  folder: string | null;
  shared_id: string | null;
  client: string | null;
  shared_with: string | null;
  updated_at: string;
}

export async function migrateConversations() {
  await query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id          TEXT PRIMARY KEY,
      username    TEXT NOT NULL,
      title       TEXT NOT NULL DEFAULT 'Nova conversa',
      model       TEXT,
      messages    JSONB NOT NULL DEFAULT '[]',
      folder      TEXT,
      shared_id   TEXT,
      client      TEXT,
      shared_with TEXT[] DEFAULT '{}',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query(
    `CREATE INDEX IF NOT EXISTS conv_user_idx ON conversations(username, updated_at DESC)`
  );
  await query(
    `CREATE INDEX IF NOT EXISTS conv_shared_idx ON conversations(shared_id) WHERE shared_id IS NOT NULL`
  );
  await query(`
    CREATE TABLE IF NOT EXISTS knowledge (
      id         SERIAL PRIMARY KEY,
      title      TEXT NOT NULL,
      content    TEXT NOT NULL,
      tags       TEXT[] DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function listConversations(username: string): Promise<ConversationRow[]> {
  const res = await query<ConversationRow>(
    `SELECT id, title, model, messages, folder, shared_id, client, shared_with, updated_at
     FROM conversations WHERE username = $1 OR $1 = ANY(shared_with)
     ORDER BY updated_at DESC LIMIT 200`,
    [username]
  );
  return res.rows;
}

export async function upsertConversation(
  id: string,
  username: string,
  title: string,
  messages: unknown[],
  model: string | null,
  folder?: string | null,
  sharedId?: string | null,
  client?: string | null,
  sharedWith?: string[]
) {
  await query(
    `INSERT INTO conversations (id, username, title, messages, model, folder, shared_id, client, shared_with, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
     ON CONFLICT (id) DO UPDATE SET
       title      = EXCLUDED.title,
       messages   = EXCLUDED.messages,
       model      = EXCLUDED.model,
       folder     = COALESCE(EXCLUDED.folder, conversations.folder),
       shared_id  = COALESCE(EXCLUDED.shared_id, conversations.shared_id),
       client     = COALESCE(EXCLUDED.client, conversations.client),
       shared_with = CASE WHEN EXCLUDED.shared_with IS NOT NULL THEN EXCLUDED.shared_with ELSE conversations.shared_with END,
       updated_at = NOW()
     WHERE conversations.username = EXCLUDED.username`,
    [id, username, title, JSON.stringify(messages), model, folder ?? null, sharedId ?? null, client ?? null, sharedWith ?? null]
  );
}

export async function deleteConversationDb(id: string, username: string) {
  await query(
    "DELETE FROM conversations WHERE id = $1 AND username = $2",
    [id, username]
  );
}

// ---- Knowledge Base ----

export interface KnowledgeRow {
  id: number;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
}

export async function listKnowledge(): Promise<KnowledgeRow[]> {
  const res = await query<KnowledgeRow>(
    "SELECT id, title, content, tags, created_at FROM knowledge ORDER BY title LIMIT 500"
  );
  return res.rows;
}

export async function searchKnowledge(terms: string[]): Promise<{ content: string }[]> {
  if (!terms.length) return [];
  const wordQuery = terms.map((t) => `content ILIKE '%' || $${terms.indexOf(t) + 1} || '%'`).join(" OR ");
  const res = await query<{ content: string }>(
    `SELECT content FROM knowledge WHERE ${wordQuery} LIMIT 3`,
    terms.map((t) => `%${t}%`)
  );
  return res.rows;
}

export async function createKnowledge(title: string, content: string, tags: string[]) {
  await query(
    "INSERT INTO knowledge (title, content, tags) VALUES ($1, $2, $3)",
    [title.trim(), content.trim(), tags]
  );
}

export async function deleteKnowledge(id: number) {
  await query("DELETE FROM knowledge WHERE id = $1", [id]);
}

/**
 * Define o shared_id (link público) de uma conversa do usuário.
 * Se a conversa já tem um shared_id, mantém o existente (link estável).
 * Retorna o shared_id vigente, ou null se a conversa não existe no banco.
 */
export async function setSharedId(id: string, username: string, sharedId: string): Promise<string | null> {
  const res = await query<{ shared_id: string }>(
    `UPDATE conversations SET shared_id = COALESCE(shared_id, $3), updated_at = NOW()
     WHERE id = $1 AND username = $2
     RETURNING shared_id`,
    [id, username, sharedId]
  );
  return res.rows[0]?.shared_id ?? null;
}

/** Revoga o link público de uma conversa do usuário. Retorna true se algo foi revogado. */
export async function clearSharedId(id: string, username: string): Promise<boolean> {
  const res = await query(
    `UPDATE conversations SET shared_id = NULL, updated_at = NOW()
     WHERE id = $1 AND username = $2 AND shared_id IS NOT NULL`,
    [id, username]
  );
  return (res.rowCount ?? 0) > 0;
}

export async function findConversationBySharedId(sharedId: string): Promise<ConversationRow | null> {
  const res = await query<ConversationRow>(
    `SELECT id, title, model, messages, folder, shared_id, client, shared_with, updated_at
     FROM conversations WHERE shared_id = $1 LIMIT 1`,
    [sharedId]
  );
  return res.rows[0] ?? null;
}

export async function shareConversation(id: string, username: string, targetUser: string) {
  await query(
    "UPDATE conversations SET shared_with = array_append(COALESCE(shared_with, '{}'), $3) WHERE id = $1 AND username = $2",
    [id, username, targetUser]
  );
}
