// ============================================================
// Provedor de busca na web (server-side, Node).
// Preferência: TAVILY (confiável em serverless e já devolve o conteúdo da
// página) quando TAVILY_API_KEY está configurada. Caso contrário, cai para o
// DuckDuckGo (duck-duck-scrape) — que pode ser bloqueado em IPs de datacenter.
// ============================================================
import { search as ddgSearch, SafeSearchType } from "duck-duck-scrape";

export interface RawResult {
  title: string;
  url: string;
  description: string;
  /** Conteúdo já extraído pelo provedor (Tavily). Quando ausente, o chamador lê a página. */
  content?: string;
}

const TAVILY_TIMEOUT_MS = 8000;

async function tavily(query: string, limit: number): Promise<RawResult[] | null> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TAVILY_TIMEOUT_MS);
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        query,
        max_results: limit,
        search_depth: "basic",
        include_answer: false,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: Array<{ title?: string; url?: string; content?: string }> };
    return (data.results || []).map((r) => ({
      title: r.title || "",
      url: r.url || "",
      description: (r.content || "").slice(0, 300),
      content: r.content || "",
    }));
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function ddg(query: string, limit: number): Promise<RawResult[]> {
  try {
    const raw = await ddgSearch(query, { safeSearch: SafeSearchType.OFF });
    return (raw.results || []).slice(0, limit).map((r) => ({
      title: r.title || "",
      url: r.url || "",
      description: r.description || "",
    }));
  } catch {
    return [];
  }
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/122.0 Safari/537.36";

/** Fallback robusto: endpoint HTML do DuckDuckGo (sem o token vqd que dispara
 *  o "anomaly detected" do duck-duck-scrape). Faz o parse dos links da SERP. */
async function ddgHtml(query: string, limit: number): Promise<RawResult[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch("https://html.duckduckgo.com/html/", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA },
      body: new URLSearchParams({ q: query }),
    });
    if (!res.ok) return [];
    const html = await res.text();
    const out: RawResult[] = [];
    const linkRe = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
    const snipRe = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    const strip = (s: string) => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    const snippets: string[] = [];
    let sm: RegExpExecArray | null;
    while ((sm = snipRe.exec(html))) snippets.push(strip(sm[1]));
    let m: RegExpExecArray | null;
    let i = 0;
    while ((m = linkRe.exec(html)) && out.length < limit) {
      let url = m[1];
      const uddg = url.match(/[?&]uddg=([^&]+)/);
      if (uddg) url = decodeURIComponent(uddg[1]);
      if (!/^https?:\/\//.test(url)) { i++; continue; }
      out.push({ title: strip(m[2]), url, description: snippets[i] || "" });
      i++;
    }
    return out;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/** Busca uma query no provedor preferencial; cai para o DuckDuckGo se preciso.
 *  Ordem: Tavily (se houver key) → duck-duck-scrape → endpoint HTML do DDG. */
export async function searchWeb(query: string, limit = 4): Promise<RawResult[]> {
  const t = await tavily(query, limit);
  if (t && t.length) return t;
  const d = await ddg(query, limit);
  if (d.length) return d;
  return ddgHtml(query, limit);
}
