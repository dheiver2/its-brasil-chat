export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { readSession } from "../../lib/auth";
import { migrateConversations, listKnowledge, searchKnowledge, createKnowledge, deleteKnowledge } from "../../lib/db";
import { isAllowedEmail } from "../../lib/allowlist";
import { KNOWLEDGE_BASE } from "../../lib/knowledge-base";

/** Remove acentos e baixa caixa — casamento de termos robusto a acentuação. */
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const FALLBACK: { title: string; content: string }[] = [
  {
    title: "Serviços da ITS Brasil",
    content: `A ITS Brasil oferece:\n- Internet residencial 100% fibra óptica (FTTH), de 60 Mbps a 600 Mbps, com Wi-Fi incluso\n- Internet empresarial de alta performance, com prioridade de atendimento e suporte dedicado\n- Link dedicado corporativo: banda simétrica, IP fixo válido e SLA garantido em contrato\n- Rede própria e equipes técnicas locais\n- Cobertura em mais de 40 municípios da Bahia`,
  },
  {
    title: "Banda Simétrica (Link Dedicado)",
    content: "No link dedicado, a velocidade de download é igual à de upload (banda simétrica). É essencial para empresas que enviam muitos dados para a nuvem, fazem videoconferências, usam VoIP ou hospedam servidores. Diferente da internet compartilhada, a banda do link dedicado é exclusiva da empresa.",
  },
  {
    title: "Atendimento ITS Brasil",
    content: "Canais da ITS Brasil — Salvador: (71) 3402-0800, Caminho das Árvores, Ed. Liz Corporate, 111, 5º andar. Ilhéus: (73) 3199-9000 (também WhatsApp), Rua Visconde de Mauá, 200, Cidade Nova. Site: www.itsbrasil.net.",
  },
  {
    title: "Sobre a ITS Brasil",
    content: "A ITS Brasil (ITS Telecomunicações Ltda, CNPJ 08.772.214/0001-98) é uma provedora de internet com mais de 17 anos de atuação no mercado corporativo. Lema: 'A internet para você'. Rede 100% de fibra óptica, com presença em mais de 40 municípios da Bahia, incluindo Salvador, Ilhéus, Feira de Santana e Vitória da Conquista.",
  },
];

export async function GET(req: Request) {
  const username = readSession(req.headers.get("cookie"));
  if (!username) return Response.json({ error: "Não autorizado" }, { status: 401 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q") || "";
  const raw = url.searchParams.get("raw") === "1";

  if (raw) {
    await migrateConversations();
    const articles = await listKnowledge();
    return Response.json({ articles });
  }

  if (!q.trim()) return Response.json({ results: [] });

  const qTerms = Array.from(
    new Set(norm(q).split(/[^a-z0-9]+/).filter((w) => w.length > 2))
  );
  if (!qTerms.length) return Response.json({ results: [] });

  // 1) Conhecimento adicionado pela equipe (banco) — prioridade.
  await migrateConversations();
  const dbResults = await searchKnowledge(qTerms);
  const dbTexts = dbResults.map((r) => r.content);

  // 2) Conhecimento dos documentos institucionais (base estática) + FALLBACK.
  //    Ranqueia por nº de termos distintos casados (relevância), com bônus de
  //    título e leve peso por frequência — top chunks, não blocões.
  const corpus = [...KNOWLEDGE_BASE, ...FALLBACK];
  const scored = corpus.map((doc) => {
    const body = norm(doc.content);
    const title = norm(doc.title);
    let distinct = 0, occ = 0, titleHits = 0;
    for (const t of qTerms) {
      const n = body.split(t).length - 1;
      if (n > 0) { distinct += 1; occ += n; }
      if (title.includes(t)) titleHits += 1;
    }
    const score = distinct + titleHits * 0.5 + Math.min(occ, 10) * 0.1;
    return { doc, score, distinct };
  })
    .filter((s) => s.distinct >= 1)
    .sort((a, b) => b.score - a.score);

  const topDocs = scored.slice(0, 4).map((s) => s.doc.content.slice(0, 1200));

  // Banco primeiro, depois os melhores chunks dos documentos; teto de 5.
  const results = [...dbTexts, ...topDocs].slice(0, 5);
  return Response.json({ results });
}

export async function POST(req: Request) {
  const username = readSession(req.headers.get("cookie"));
  if (!username) return Response.json({ error: "Não autorizado" }, { status: 401 });

  const { title, content, tags } = await req.json();
  if (!title?.trim() || !content?.trim()) {
    return Response.json({ error: "title e content obrigatórios" }, { status: 400 });
  }
  await migrateConversations();
  await createKnowledge(title, content, tags || []);
  return Response.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: Request) {
  const username = readSession(req.headers.get("cookie"));
  if (!username) return Response.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return Response.json({ error: "id obrigatório" }, { status: 400 });
  await deleteKnowledge(id);
  return Response.json({ ok: true });
}
