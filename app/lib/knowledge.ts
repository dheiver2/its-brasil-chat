// Knowledge base — arquivos .md com informações da empresa
// Busca simples por palavra-chave para injetar no contexto do LLM

import fs from "fs";
import path from "path";

const KNOWLEDGE_DIR = path.join(process.cwd(), "app/knowledge");
const cache: { content: string; terms: string[] }[] = [];

function loadAll(): { content: string; terms: string[] }[] {
  if (cache.length) return cache;
  try {
    const files = fs.readdirSync(KNOWLEDGE_DIR).filter((f) => f.endsWith(".md"));
    for (const file of files) {
      const content = fs.readFileSync(path.join(KNOWLEDGE_DIR, file), "utf-8");
      const terms = content
        .toLowerCase()
        .split(/[\s\n\r,.!?;:()\[\]{}""''|]+/)
        .filter((w) => w.length > 2);
      cache.push({ content, terms: [...new Set(terms)] });
    }
  } catch {}
  return cache;
}

export function searchKnowledge(query: string): string {
  if (!query.trim()) return "";
  const docs = loadAll();
  if (!docs.length) return "";

  const qTerms = query
    .toLowerCase()
    .split(/[\s\n\r,.!?;:()\[\]{}""''|]+/)
    .filter((w) => w.length > 2);

  if (!qTerms.length) return "";

  const scored = docs.map((doc) => {
    const matches = qTerms.filter((t) => doc.terms.includes(t)).length;
    return { content: doc.content, score: matches / qTerms.length };
  });

  const best = scored.filter((s) => s.score > 0.3).sort((a, b) => b.score - a.score);

  if (!best.length) return "";

  return best
    .slice(0, 2)
    .map((d) => d.content)
    .join("\n\n---\n\n");
}
