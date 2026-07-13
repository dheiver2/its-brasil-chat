import { describe, it, expect } from "vitest";
import { validateConversationInput, MAX_TITLE_LENGTH, MAX_MESSAGES, MAX_MESSAGE_LENGTH } from "../app/lib/conversation-validate";

describe("validateConversationInput", () => {
  it("aceita conversa vazia", () => {
    const result = validateConversationInput("Teste", [], null);
    expect(result.title).toBe("Teste");
    expect(result.messages).toEqual([]);
    expect(result.model).toBeNull();
  });

  it("usa título padrão quando vazio", () => {
    expect(validateConversationInput("", [], null).title).toBe("Nova conversa");
    expect(validateConversationInput("   ", [], null).title).toBe("Nova conversa");
    expect(validateConversationInput(123, [], null).title).toBe("Nova conversa");
  });

  it("trunca título longo", () => {
    const long = "a".repeat(MAX_TITLE_LENGTH + 50);
    const result = validateConversationInput(long, [], null);
    expect(result.title.length).toBe(MAX_TITLE_LENGTH);
  });

  it("sanitiza mensagens válidas", () => {
    const messages = [
      { role: "user", content: "Olá" },
      { role: "assistant", content: "Oi!" },
    ];
    const result = validateConversationInput("Chat", messages, null);
    expect(result.messages).toHaveLength(2);
    expect(result.messages[0].role).toBe("user");
    expect(result.messages[0].content).toBe("Olá");
  });

  it("rejeita mensagem sem role ou content", () => {
    expect(() => validateConversationInput("T", [{ role: "user" }], null)).toThrow("Mensagem inválida.");
    expect(() => validateConversationInput("T", [{ content: "x" }], null)).toThrow("Mensagem inválida.");
    expect(() => validateConversationInput("T", ["string"], null)).toThrow("Mensagem inválida.");
    expect(() => validateConversationInput("T", [null], null)).toThrow("Mensagem inválida.");
  });

  it("rejeita mensagem muito longa", () => {
    const long = "x".repeat(MAX_MESSAGE_LENGTH + 1);
    expect(() => validateConversationInput("T", [{ role: "user", content: long }], null)).toThrow("Mensagem muito longa.");
  });

  it("rejeita messages que não é array", () => {
    expect(() => validateConversationInput("T", "não-array", null)).toThrow("deve ser uma lista");
  });

  it("rejeita excesso de mensagens", () => {
    const many = Array.from({ length: MAX_MESSAGES + 1 }, (_, i) => ({
      role: "user" as const, content: `msg ${i}`
    }));
    expect(() => validateConversationInput("T", many, null)).toThrow("excede o limite");
  });

  it("preserva fontes (sources) válidas", () => {
    const messages = [{
      role: "assistant",
      content: "Resposta com fonte",
      sources: [
        { title: "Artigo", url: "https://exemplo.com/artigo" },
        { title: "Outro", url: "https://exemplo.com/outro" },
      ],
    }];
    const result = validateConversationInput("T", messages, null);
    expect(result.messages[0].sources).toHaveLength(2);
    expect(result.messages[0].sources![0].title).toBe("Artigo");
  });

  it("filtra fontes sem url", () => {
    const messages = [{
      role: "assistant", content: "x",
      sources: [
        { title: "Sem URL", url: "" },
        { title: "Com URL", url: "https://valido.com" },
      ],
    }];
    const result = validateConversationInput("T", messages, null);
    expect(result.messages[0].sources).toHaveLength(1);
    expect(result.messages[0].sources![0].title).toBe("Com URL");
  });

  it("limita fontes a 20", () => {
    const manySources = Array.from({ length: 30 }, (_, i) => ({
      title: `Fonte ${i}`, url: `https://exemplo.com/${i}`,
    }));
    const messages = [{ role: "assistant", content: "x", sources: manySources }];
    const result = validateConversationInput("T", messages, null);
    expect(result.messages[0].sources!.length).toBe(20);
  });

  it("ignora sources inválidas (não array)", () => {
    const messages = [{ role: "assistant", content: "x", sources: "invalido" }];
    const result = validateConversationInput("T", messages, null);
    expect(result.messages[0].sources).toBeUndefined();
  });

  it("preserva reações (like/dislike)", () => {
    const messages = [{
      role: "user", content: "teste",
      reactions: { like: true, dislike: false },
    }];
    const result = validateConversationInput("T", messages, null);
    expect(result.messages[0].reactions).toBeDefined();
    expect(result.messages[0].reactions!.like).toBe(true);
    expect(result.messages[0].reactions!.dislike).toBe(false);
  });

  it("ignora reações malformadas", () => {
    const messages = [
      { role: "user", content: "a", reactions: "invalido" },
      { role: "user", content: "b", reactions: null },
      { role: "user", content: "c", reactions: 42 },
    ];
    const result = validateConversationInput("T", messages, null);
    expect(result.messages[0].reactions).toBeUndefined();
    expect(result.messages[1].reactions).toBeUndefined();
    expect(result.messages[2].reactions).toBeUndefined();
  });

  it("model é opcional e truncado", () => {
    const long = "x".repeat(200);
    expect(validateConversationInput("T", [], long).model!.length).toBe(120);
    expect(validateConversationInput("T", [], null).model).toBeNull();
    expect(validateConversationInput("T", [], "gpt-4").model).toBe("gpt-4");
  });
});
