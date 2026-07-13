import { describe, expect, it } from "vitest";
import { filterConversationsForSidebar, buildSidebarGroups } from "../app/chat/components/sidebar-utils";

describe("sidebar helpers", () => {
  it("filtra por busca e pasta sem alterar o array original", () => {
    const conversations = [
      { id: "1", title: "Contrato", folder: "folder-a" },
      { id: "2", title: "Relatório", folder: "folder-b" },
    ];

    const result = filterConversationsForSidebar(conversations, "contr", "folder-a");

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("busca também no conteúdo das mensagens, não só no título", () => {
    const conversations = [
      { id: "1", title: "Sem relação", messages: [{ content: "preciso do orçamento detalhado" }] },
      { id: "2", title: "Outro", messages: [{ content: "nada aqui" }] },
    ];

    const result = filterConversationsForSidebar(conversations, "orçamento", "");

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("agrupa por data e coloca fixadas no topo", () => {
    const now = Date.parse("2026-06-29T12:00:00Z");
    const iso = (offsetDays: number) => new Date(now - offsetDays * 86_400_000).toISOString();
    const conversations = [
      { id: "hoje", title: "Hoje", updatedAt: iso(0) },
      { id: "ontem", title: "Ontem", updatedAt: iso(1) },
      { id: "semana", title: "Semana", updatedAt: iso(4) },
      { id: "antiga", title: "Antiga", updatedAt: iso(30) },
      { id: "fix", title: "Fixada antiga", updatedAt: iso(40) },
    ];

    const groups = buildSidebarGroups(conversations, "", "", new Set(["fix"]), now);
    const labels = groups.map((g) => g.label);

    expect(labels[0]).toBe("Fixadas");
    expect(groups[0].items[0].id).toBe("fix");
    expect(labels).toEqual(["Fixadas", "Hoje", "Ontem", "Últimos 7 dias", "Mais antigas"]);
  });
});
