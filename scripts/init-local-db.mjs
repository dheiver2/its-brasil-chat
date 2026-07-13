// ============================================================
// Init do banco LOCAL (Postgres em Docker) — cria as tabelas e
// semeia uma conta admin. Uso 100% local, SEM SSL.
//
//   node scripts/init-local-db.mjs [email] [senha]
//   (padrão: dheiver.santos@gmail.com / its@2026)
//
// Lê POSTGRES_URL do .env.local se não estiver no ambiente.
// ============================================================
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";

// Carrega variáveis de um arquivo .env (ordem: .env.local → .env.production → .env).
// Funciona igual em Windows/Linux/macOS.
if (!process.env.POSTGRES_URL) {
  for (const name of [".env.local", ".env.production", ".env"]) {
    try {
      const envPath = path.resolve(process.cwd(), name);
      if (!fs.existsSync(envPath)) continue;
      for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    } catch { /* tenta o próximo */ }
  }
}

const url = process.env.POSTGRES_URL;
if (!url) { console.error("POSTGRES_URL não definida (ponha no .env.local)."); process.exit(1); }

const email = (process.argv[2] || "dheiver.santos@gmail.com").trim().toLowerCase();
const senha = process.argv[3] || "its@2026";

// Local = sem SSL.
const pool = new Pool({ connectionString: url, ssl: false });

try {
  // --- Schema (espelha app/lib/db.ts) ---
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      username      TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
  await pool.query(`
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
    )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS conv_user_idx ON conversations(username, updated_at DESC)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS conv_shared_idx ON conversations(shared_id) WHERE shared_id IS NOT NULL`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS knowledge (
      id         SERIAL PRIMARY KEY,
      title      TEXT NOT NULL,
      content    TEXT NOT NULL,
      tags       TEXT[] DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);

  // --- Conta admin (upsert) ---
  const hash = await bcrypt.hash(senha, 12);
  await pool.query(
    `INSERT INTO users (username, password_hash) VALUES ($1, $2)
     ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    [email, hash]
  );

  const t = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`);
  console.log("Tabelas:", t.rows.map((r) => r.table_name).join(", "));
  console.log(`Conta pronta → e-mail: ${email} | senha: ${senha}`);
} catch (e) {
  console.error("Falha no init:", e.message);
  process.exit(1);
} finally {
  await pool.end();
}
