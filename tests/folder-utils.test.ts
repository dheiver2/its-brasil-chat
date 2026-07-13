import { describe, expect, it } from "vitest";
import { createFolder, moveConversationToFolder, renameFolder } from "../app/chat/components/folder-utils";

describe("folder helpers", () => {
  it("cria uma pasta com nome limpo e id único", () => {
    const folders = [{ id: "folder-1", name: "Projetos" }];
    const result = createFolder(folders, "  Nova pasta  ");

    expect(result).toHaveLength(2);
    expect(result[1]).toMatchObject({ name: "Nova pasta" });
    expect(result[1].id).toBeTruthy();
  });

  it("move uma conversa para a pasta escolhida sem alterar as demais", () => {
    const conversations = [
      { id: "c1", title: "Conversa 1", folder: undefined },
      { id: "c2", title: "Conversa 2", folder: "folder-1" },
    ];

    const result = moveConversationToFolder(conversations, "c1", "folder-2");

    expect(result[0].folder).toBe("folder-2");
    expect(result[1].folder).toBe("folder-1");
  });

  it("renomeia uma pasta sem alterar as demais", () => {
    const folders = [{ id: "folder-1", name: "Projetos" }, { id: "folder-2", name: "Pessoal" }];

    const result = renameFolder(folders, "folder-1", "  Clientes  ");

    expect(result[0].name).toBe("Clientes");
    expect(result[1].name).toBe("Pessoal");
  });
});
