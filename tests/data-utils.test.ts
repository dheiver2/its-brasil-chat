import { describe, expect, it } from "vitest";
import { buildDataBackupPayload, importDataBackupPayload } from "../app/chat/components/data-utils";

describe("data backup helpers", () => {
  it("monta um payload de backup com pastas e conversas", () => {
    const payload = buildDataBackupPayload(
      [{ id: "f1", name: "Projetos" }],
      [{ id: "c1", title: "Conversa", messages: [] }]
    );

    expect(payload.folders).toHaveLength(1);
    expect(payload.conversations).toHaveLength(1);
    expect(payload.version).toBe(1);
  });

  it("importa dados preservando pastas existentes e gerando ids novos para conflitos", () => {
    const result = importDataBackupPayload(
      {
        folders: [{ name: "Novos Clientes" }],
        conversations: [{ id: "c1", title: "Importada", messages: [] }],
      },
      [{ id: "f1", name: "Geral" }],
      [{ id: "c1", title: "Existente", messages: [] }]
    );

    expect(result.folders.some((folder) => folder.name === "Novos Clientes")).toBe(true);
    expect(result.conversations[0].title).toBe("Importada");
    expect(result.conversations[0].id).not.toBe("c1");
  });
});
