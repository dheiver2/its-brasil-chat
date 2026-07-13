"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ENGINE_NAME } from "../lib/mangaba";
import { APP_BUILD } from "../lib/build";
import { VoiceInput } from "./components/VoiceInput";
import { ImageUpload, type ImageAttach } from "./components/ImageUpload";
import { CustomInstructions } from "./components/CustomInstructions";
import { Reactions } from "./components/Reactions";
import { MessageSearch } from "./components/MessageSearch";
import { ConversationShare } from "./components/ConversationShare";
import { KnowledgeManager } from "./components/KnowledgeManager";
import { TokenCounter } from "./components/TokenCounter";
import { SkeletonLoading } from "./components/SkeletonLoading";
import { Sidebar } from "./components/Sidebar";
import { MessageContent, stripThink } from "./components/MessageContent";
import { Sources } from "./components/Sources";
import { ArtifactContext, type OpenArtifact } from "./components/ArtifactContext";
import { ArtifactPanel } from "./components/ArtifactPanel";
import type { Message, Conversation, Folder } from "./components/types";
import { createFolder, moveConversationToFolder } from "./components/folder-utils";
import { buildDataBackupPayload, importDataBackupPayload } from "./components/data-utils";
import { prepareHistoryForModel } from "./components/context-utils";

const SUGGESTIONS = [
  "Quais serviços a ITS Brasil oferece?",
  "Faça uma proposta comercial de internet dedicada",
  "Monte uma planilha de orçamento de projeto",
  "Como configurar NAT/Masquerade no MikroTik?",
  "Explique fibra óptica monomodo vs multimodo",
  "Crie uma página HTML de boas-vindas (artifact)",
];

const storageKeyFor = (user: string) => `its-conversations:${user}`;
const FOLDERS_KEY = "its-folders";
const STYLE_KEY = "its-writing-style";

// Estilos de escrita (estilo claude.ai "styles") — injetados como diretiva.
const STYLES: { id: string; label: string; prompt: string }[] = [
  { id: "", label: "Padrão", prompt: "" },
  { id: "formal", label: "Formal", prompt: "Escreva em tom formal e profissional, com vocabulário corporativo e estrutura clara." },
  { id: "conciso", label: "Conciso", prompt: "Seja o mais direto e enxuto possível: respostas curtas, sem rodeios, em tópicos quando útil." },
  { id: "explicativo", label: "Explicativo", prompt: "Explique em detalhe, com didática, exemplos e passo a passo, como se ensinasse alguém leigo." },
  { id: "comercial", label: "Comercial", prompt: "Use tom comercial persuasivo, focado em benefícios e valor para o cliente, com chamada para ação ao final." },
];
const INSTRUCTIONS_KEY = "its-custom-instructions";

function uid() {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {}
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

type EngineStatus = "checking" | "online" | "offline";

export default function ChatPage() {
  const [user, setUser] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [authChecking, setAuthChecking] = useState(true);
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [status, setStatus] = useState<EngineStatus>("checking");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentId, setCurrentId] = useState<string>("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const autoScrollRef = useRef(true);

  const [copiedMsg, setCopiedMsg] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [convSearch, setConvSearch] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [syncWarning, setSyncWarning] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);

  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [attachedFile, setAttachedFile] = useState<{ name: string; content: string } | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupImportInputRef = useRef<HTMLInputElement>(null);
  const [webSearch, setWebSearch] = useState(false);
  const [globalModel, setGlobalModel] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const syncTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const generatingIdRef = useRef<string | null>(null);
  const [currentFolder, setCurrentFolder] = useState("");
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [folderRenameText, setFolderRenameText] = useState("");
  const msgListRef = useRef<HTMLDivElement>(null);

  // Image attachment
  const [attachedImage, setAttachedImage] = useState<ImageAttach | null>(null);
  const [imageAnalyzing, setImageAnalyzing] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Custom instructions
  const [customInstructions, setCustomInstructions] = useState("");
  const [writingStyle, setWritingStyle] = useState("");
  const [openArtifact, setOpenArtifact] = useState<OpenArtifact | null>(null);

  // Folders
  const [folders, setFolders] = useState<Folder[]>([]);

  // Model list from server
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [focusMode, setFocusMode] = useState(false);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [enterSends, setEnterSends] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("a1-theme") as "light" | "dark" | null;
    const preferred = saved || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(preferred);
    document.documentElement.setAttribute("data-theme", preferred);
    setSidebarCollapsed(localStorage.getItem("a1-sidebar-collapsed") === "1");
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(INSTRUCTIONS_KEY);
    if (saved) setCustomInstructions(saved);
    const savedStyle = localStorage.getItem(STYLE_KEY);
    if (savedStyle) setWritingStyle(savedStyle);
    const savedFolders = localStorage.getItem(FOLDERS_KEY);
    if (savedFolders) try { setFolders(JSON.parse(savedFolders)); } catch {}
    const savedPins = localStorage.getItem("a1-pins");
    if (savedPins) try { setPinnedIds(new Set(JSON.parse(savedPins))); } catch {}
    setEnterSends(localStorage.getItem("a1-enter-sends") !== "0");
    setSoundEnabled(localStorage.getItem("a1-sound") === "1");
  }, []);

  useEffect(() => {
    if (!syncWarning) return;
    const t = setTimeout(() => setSyncWarning(false), 6000);
    return () => clearTimeout(t);
  }, [syncWarning]);

  // Auto-dismiss error após 6s
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(""), 6000);
    return () => clearTimeout(t);
  }, [error]);

  useEffect(() => {
    let stop = false;
    async function check() {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!stop && data.build && data.build !== APP_BUILD) setUpdateReady(true);
      } catch {}
    }
    check();
    const onVisible = () => { if (!document.hidden) check(); };
    document.addEventListener("visibilitychange", onVisible);
    const t = setInterval(check, 5 * 60 * 1000);
    return () => { stop = true; clearInterval(t); document.removeEventListener("visibilitychange", onVisible); };
  }, []);

  useEffect(() => {
    if (updateReady && !loading && !input.trim()) {
      const t = setTimeout(() => window.location.reload(), 1500);
      return () => clearTimeout(t);
    }
  }, [updateReady, loading, input]);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("a1-theme", next);
  }

  function toggleSidebarCollapsed() {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("a1-sidebar-collapsed", next ? "1" : "0");
      return next;
    });
  }

  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((d) => { setUser(d.user ?? null); setUserName(d.name || ""); })
      .catch(() => setUser(null))
      .finally(() => setAuthChecking(false));
  }, []);

  useEffect(() => {
    if (!user) {
      setConversations([]);
      setCurrentId("");
      return;
    }
    async function loadConversations() {
      try {
        const res = await fetch("/api/conversations", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          const serverConvs: Conversation[] = (data.conversations || []).map(
            (c: any) => ({
              id: c.id, title: c.title, messages: c.messages || [], model: c.model,
              folder: c.folder, sharedId: c.shared_id || c.sharedId,
              client: c.client ?? undefined,
              sharedWith: c.shared_with ?? c.sharedWith ?? undefined,
              updatedAt: c.updated_at ?? c.updatedAt ?? undefined,
            })
          );
          if (serverConvs.length > 0) {
            setConversations(serverConvs);
            setCurrentId(serverConvs[0].id);
            try { localStorage.setItem(storageKeyFor(user!), JSON.stringify(serverConvs)); } catch {}
            return;
          }
        }
      } catch {}
      try {
        const raw = localStorage.getItem(storageKeyFor(user!));
        if (raw) {
          const data: Conversation[] = JSON.parse(raw);
          if (data.length) { setConversations(data); setCurrentId(data[0].id); return; }
        }
      } catch {}
      // Injeta memória de conversas anteriores como contexto
      const memKey = `a1-memory-${user}`;
      let memoryMsg: Message | null = null;
      try {
        const raw = localStorage.getItem(memKey);
        if (raw) {
          const mems = JSON.parse(raw).slice(0, 5);
          if (mems.length) {
            const memText = "Conversas anteriores:\n" + mems.map((m: any) => `- ${m.date}: ${m.title} (${m.msgCount} msgs)`).join("\n");
            memoryMsg = { role: "assistant", content: memText };
          }
        }
      } catch {}

      const fresh: Conversation = {
        id: uid(), title: "Nova conversa",
        messages: memoryMsg ? [memoryMsg] : [] as Message[],
      };
      setConversations([fresh]);
      setCurrentId(fresh.id);
    }
    loadConversations();
  }, [user]);

  async function checkEngine() {
    setStatus("checking");
    try {
      const res = await fetch("/api/status", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.online) {
          const models = data.models || [];
          setAvailableModels(models.map((m: any) => m.id));
          setGlobalModel((prev) => prev || data.defaultModelId || models[0]?.id || "");
          setStatus("online");
          return;
        }
      }
    } catch {}
    setStatus("offline");
  }

  useEffect(() => {
    if (!user) return;
    let t: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (t) return;
      checkEngine();
      t = setInterval(checkEngine, 8000);
    };
    const stop = () => {
      if (t) { clearInterval(t); t = null; }
    };
    const onVisibility = () => (document.hidden ? stop() : start());
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [user]);

  useEffect(() => {
    if (!user || !conversations.length) return;
    const timeoutId = window.setTimeout(() => {
      try { localStorage.setItem(storageKeyFor(user), JSON.stringify(conversations)); } catch {}
    }, 250);
    return () => window.clearTimeout(timeoutId);
  }, [conversations, user]);

  async function persistConversation(url: string, method: "POST" | "PATCH", body: unknown) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) return true;
      } catch {}
      if (attempt === 0) await new Promise((r) => setTimeout(r, 600));
    }
    setSyncWarning(true);
    return false;
  }

  function syncConversationToServer(conv: Conversation) {
    const timers = syncTimersRef.current;
    const existing = timers.get(conv.id);
    if (existing) clearTimeout(existing);
    timers.set(
      conv.id,
      setTimeout(() => {
        timers.delete(conv.id);
        persistConversation(`/api/conversations/${conv.id}`, "PATCH", {
          title: conv.title, messages: conv.messages, model: conv.model ?? null,
          folder: conv.folder ?? null, client: conv.client ?? null,
          sharedWith: conv.sharedWith ?? null,
        });
      }, 800)
    );
  }

  function createConversationOnServer(conv: Conversation) {
    persistConversation("/api/conversations", "POST", {
      id: conv.id, title: conv.title, messages: conv.messages, model: conv.model ?? null,
      folder: conv.folder ?? null, client: conv.client ?? null,
      sharedWith: conv.sharedWith ?? null,
    });
  }

  function deleteConversationOnServer(id: string) {
    fetch(`/api/conversations/${id}`, { method: "DELETE" }).catch(() => {});
  }

  const current = conversations.find((c) => c.id === currentId);
  const messages = current?.messages ?? [];

  useEffect(() => {
    if (generatingIdRef.current && generatingIdRef.current !== currentId) {
      abortRef.current?.abort();
    }
  }, [currentId]);

  useEffect(() => {
    if (autoScrollRef.current) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, loading]);

  function onThreadScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    autoScrollRef.current = nearBottom;
    setShowScrollDown(!nearBottom);
  }

  function scrollToBottom() {
    autoScrollRef.current = true;
    setShowScrollDown(false);
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }

  function autoGrow() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }

  function updateCurrent(updater: (c: Conversation) => Conversation) {
    const now = new Date().toISOString();
    setConversations((prev) => prev.map((c) => (c.id === currentId ? { ...updater(c), updatedAt: now } : c)));
  }

  function updateConv(id: string, updater: (c: Conversation) => Conversation) {
    const now = new Date().toISOString();
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...updater(c), updatedAt: now } : c)));
  }

  function newChat() {
    const existingEmpty = conversations.find((c) => c.messages.length === 0);
    if (existingEmpty) { setCurrentId(existingEmpty.id); }
    else {
      let memoryMsg: Message | null = null;
      try {
        const raw = localStorage.getItem(`a1-memory-${user}`);
        if (raw) {
          const mems = JSON.parse(raw).slice(0, 3);
          if (mems.length) {
            const memText = "Conversas anteriores:\n" + mems.map((m: any) => `- ${m.date}: ${m.title} (${m.msgCount} msgs)`).join("\n");
            memoryMsg = { role: "assistant", content: memText };
          }
        }
      } catch {}
      const fresh: Conversation = {
        id: uid(), title: "Nova conversa", messages: memoryMsg ? [memoryMsg] : [],
        model: selectedModel || globalModel || undefined, folder: currentFolder || undefined,
      };
      setConversations((prev) => [fresh, ...prev.slice(0, 49)]);
      setCurrentId(fresh.id);
      createConversationOnServer(fresh);
    }
    setSidebarOpen(false);
    setError("");
  }

  function deleteChat(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    deleteConversationOnServer(id);
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (next.length === 0) {
        const fresh: Conversation = { id: uid(), title: "Nova conversa", messages: [] };
        setCurrentId(fresh.id);
        createConversationOnServer(fresh);
        return [fresh];
      }
      if (id === currentId) setCurrentId(next[0].id);
      return next;
    });
  }

  // Branching: cria uma nova conversa como fork a partir de um ponto do histórico
  function forkConversation(fromIndex: number) {
    if (!current) return;
    const baseMsgs = current.messages.slice(0, fromIndex + 1);
    const fresh: Conversation = {
      id: uid(),
      title: `↳ ${current.title}`,
      messages: baseMsgs,
      model: current.model,
      folder: current.folder,
      parentId: current.id,
    };
    setConversations((prev) => [fresh, ...prev]);
    setCurrentId(fresh.id);
    createConversationOnServer(fresh);
    setError("");
  }

  // Memória: carrega resumos de conversas anteriores
  useEffect(() => {
    if (!user) return;
    try {
      const raw = localStorage.getItem(`a1-memory-${user}`);
      if (raw) {
        try { JSON.parse(raw); } catch {}
        // Injeta no início como mensagem de sistema (oculta)
        // Apenas armazena para uso futuro
      }
    } catch {}
  }, [user]);

  // Memória: salva resumo automático ao finalizar uma conversa com 3+ mensagens
  function saveMemory() {
    if (!current || current.messages.length < 6 || !user) return;
    try {
      const existing = JSON.parse(localStorage.getItem(`a1-memory-${user}`) || "[]");
      const lastMsgs = current.messages.slice(-4).map((m) => `${m.role}: ${m.content.slice(0, 100)}`).join("\n");
      const mem = {
        id: current.id,
        title: current.title,
        snippet: lastMsgs.slice(0, 300),
        date: new Date().toISOString().slice(0, 10),
        msgCount: current.messages.length,
      };
      existing.unshift(mem);
      if (existing.length > 12) existing.length = 12;
      localStorage.setItem(`a1-memory-${user}`, JSON.stringify(existing));
    } catch {}
  }

  async function login(e: React.FormEvent) {
    e.preventDefault();
    const username = usernameInput.trim().toLowerCase();
    const password = passwordInput;
    if (!username || !password || loggingIn) return;
    setLoginError("");
    setLoggingIn(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setLoginError(d.error || "Não foi possível entrar.");
        return;
      }
      const d = await res.json();
      setPasswordInput("");
      setUser(d.user);
      setUserName(d.name || "");
    } catch {
      setLoginError("Falha de conexão. Tente novamente.");
    } finally {
      setLoggingIn(false);
    }
  }

  async function register(e: React.FormEvent) {
    e.preventDefault();
    const username = usernameInput.trim().toLowerCase();
    const password = passwordInput;
    if (!username || !password || loggingIn) return;
    if (password.length < 8) {
      setLoginError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    setLoginError("");
    setLoggingIn(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: username, password }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoginError(d.error || "Não foi possível criar a conta.");
        return;
      }
      setPasswordInput("");
      setUser(d.user);
      setUserName(d.name || "");
    } catch {
      setLoginError("Falha de conexão. Tente novamente.");
    } finally {
      setLoggingIn(false);
    }
  }

  async function logout() {
    try { await fetch("/api/logout", { method: "POST" }); } catch {}
    abortRef.current?.abort();
    if (user) { try { localStorage.removeItem(storageKeyFor(user)); } catch {} }
    setConversations([]);
    setCurrentId("");
    setUser(null);
    setUserName("");
    setUsernameInput("");
    setPasswordInput("");
  }

  async function runCompletion(history: Message[], modelOverride?: string) {
    setError("");
    setLoading(true);
    autoScrollRef.current = true;
    const controller = new AbortController();
    abortRef.current = controller;
    const targetId = currentId;
    generatingIdRef.current = targetId;
    const modelId = modelOverride || selectedModel || current?.model || globalModel || undefined;

    try {
      let searchResults: Array<{ title: string; url: string; description: string; content?: string }> = [];
      let searchQuery = "";
      const lastUser = [...history].reverse().find((m) => m.role === "user");

      // Busca na base de conhecimento interna (RAG simples)
      if (lastUser) {
        const kq = lastUser.content.replace(/```[\s\S]*?```/g, "").trim().slice(0, 300);
        try {
          const kr = await fetch(`/api/knowledge?q=${encodeURIComponent(kq)}`, { signal: controller.signal });
          if (kr.ok) {
            const kd = await kr.json();
            if (kd.results?.length) {
              searchResults = kd.results.map((c: string, i: number) => ({
                title: `Base de conhecimento #${i + 1}`,
                url: "",
                description: "",
                content: c,
              }));
            }
          }
        } catch {}
      }

      // Busca na web (se ativada)
      if (webSearch && lastUser) {
        searchQuery = lastUser.content.replace(/```[\s\S]*?```/g, "").trim().slice(0, 500);
        try {
          const sr = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`, { signal: controller.signal });
          if (sr.ok) {
            const sd = await sr.json();
            const webResults = (sd.results || []).map((r: any) => ({ ...r }));
            searchResults = [...searchResults, ...webResults];
          }
        } catch {}
      }

      const modelContext = prepareHistoryForModel(history, 24);
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: modelContext,
          model: modelId,
          searchResults,
          searchQuery,
          customInstructions: [STYLES.find((s) => s.id === writingStyle)?.prompt, customInstructions]
            .filter(Boolean).join("\n\n") || undefined,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        let msg = `Falha ao gerar resposta no ${ENGINE_NAME}.`;
        try { const e = await res.json(); if (e?.error) msg = e.error; } catch {}
        throw new Error(msg);
      }

      const sources = searchResults
        .filter((r) => r.url)
        .slice(0, 4)
        .map((r) => ({ title: r.title || r.url, url: r.url }));

      const guidanceHint = `Se quiser, peça para a Ítala: continuar, resumir, transformar em tabela/Word/e-mail, ou extrair apenas os pontos mais importantes.`;

      updateConv(targetId, (c) => ({
        ...c,
        messages: [...c.messages, { role: "assistant", content: "", ...(sources.length ? { sources } : {}) }],
      }));

      let pending = "";
      let rafId: number | null = null;
      const flush = () => {
        rafId = null;
        if (!pending) return;
        const add = pending;
        pending = "";
        updateConv(targetId, (c) => {
          const msgs = [...c.messages];
          const last = msgs[msgs.length - 1];
          if (!last || last.role !== "assistant") return c;
          msgs[msgs.length - 1] = { ...last, content: last.content + add };
          return { ...c, messages: msgs };
        });
      };
      const scheduleFlush = () => {
        if (rafId != null) return;
        rafId = typeof requestAnimationFrame !== "undefined"
          ? requestAnimationFrame(flush)
          : (setTimeout(flush, 16) as unknown as number);
      };

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          if (chunk) { pending += chunk; scheduleFlush(); }
        }
      } finally {
        if (rafId != null && typeof cancelAnimationFrame !== "undefined") cancelAnimationFrame(rafId);
        flush();
      }
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === "AbortError";
      if (!aborted) {
        setError(err instanceof Error ? err.message : "Erro inesperado.");
      }
      updateConv(targetId, (c) => {
        const msgs = [...c.messages];
        if (msgs.length && msgs[msgs.length - 1].role === "assistant" && msgs[msgs.length - 1].content === "") {
          msgs.pop();
        }
        return { ...c, messages: msgs };
      });
      // Memória: salva resumo quando a conversa tem 3+ trocas
      saveMemory();
      playBeep();
    } finally {
      setLoading(false);
      abortRef.current = null;
      generatingIdRef.current = null;
      setConversations((prev) => {
        const conv = prev.find((c) => c.id === targetId);
        if (conv) syncConversationToServer(conv);
        return prev;
      });
    }
  }

  /** Descreve a imagem anexada no modelo de visão Mangaba e retorna o texto. */
  async function describeAttachedImage(img: ImageAttach, question: string): Promise<string> {
    const blob = await (await fetch(img.dataUrl)).blob();
    const fd = new FormData();
    fd.append("file", blob, img.name || "imagem.png");
    fd.append("prompt", question || "Descreva esta imagem em detalhes.");
    const res = await fetch("/api/image", { method: "POST", body: fd });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || "Falha ao analisar a imagem.");
    return stripThink((data?.description || "").trim()).trim();
  }

  /** Gera uma miniatura leve (JPEG, máx. 360px) da imagem para exibir na bolha. */
  async function makeThumb(dataUrl: string): Promise<string> {
    try {
      const img = new Image();
      await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; img.src = dataUrl; });
      const max = 360;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return dataUrl;
      ctx.drawImage(img, 0, 0, w, h);
      return canvas.toDataURL("image/jpeg", 0.8);
    } catch {
      return dataUrl;
    }
  }

  async function send(text: string) {
    const rawContent = text.trim();
    if ((!rawContent && !attachedFile && !attachedImage) || loading) return;
    if (status !== "online") {
      setError(`O ${ENGINE_NAME} não está conectado.`);
      return;
    }

    let fullContent = "";
    if (attachedFile) {
      fullContent = `Arquivo: ${attachedFile.name}\n\`\`\`\n${attachedFile.content.slice(0, 24_000)}\n\`\`\`\n\n${rawContent || "Resuma o conteúdo acima."}`;
    } else if (attachedImage) {
      // Dá "olhos" ao chat de texto: descreve a imagem no modelo de visão e
      // injeta a descrição no contexto enviado à Ítala.
      setImageAnalyzing(true);
      let description = "";
      try {
        description = await describeAttachedImage(attachedImage, rawContent);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao analisar a imagem.");
        setImageAnalyzing(false);
        return;
      }
      setImageAnalyzing(false);
      fullContent = description
        ? `[Imagem anexada: ${attachedImage.name}]\n\nDescrição visual (Mangaba Vision):\n${description}\n\n${rawContent || "Comente sobre a imagem acima."}`
        : `[Imagem anexada: ${attachedImage.name}]\n\n${rawContent || "Descreva esta imagem."}`;
    } else {
      fullContent = rawContent;
    }

    const isFirst = messages.length === 0;
    const userMsg: Message = { role: "user", content: fullContent };
    if (attachedImage) userMsg.image = await makeThumb(attachedImage.dataUrl);
    const history = prepareHistoryForModel([...messages, userMsg], 24);
    updateCurrent((c) => ({
      ...c,
      title: isFirst ? (rawContent || attachedFile?.name || attachedImage?.name || "Nova conversa").slice(0, 40) : c.title,
      messages: [...c.messages, userMsg],
    }));
    setInput("");
    setAttachedFile(null);
    setAttachedImage(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    runCompletion(history);
  }

  function stop() { abortRef.current?.abort(); }

  function regenerate() {
    if (loading || status !== "online") return;
    let lastUser = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") { lastUser = i; break; }
    }
    if (lastUser === -1) return;
    const history = messages.slice(Math.max(0, lastUser - 20), lastUser + 1);
    updateCurrent((c) => ({ ...c, messages: history }));
    runCompletion(history);
  }

  function startEdit(index: number, content: string) {
    setEditingIndex(index);
    setEditText(content);
  }

  function submitEdit(index: number) {
    const content = editText.trim();
    if (!content || loading || status !== "online") return;
    const history: Message[] = prepareHistoryForModel([...messages.slice(Math.max(0, index - 20), index), { role: "user", content }], 20);
    updateCurrent((c) => ({ ...c, messages: history }));
    setEditingIndex(null);
    runCompletion(history);
  }

  async function copyMessage(index: number, content: string) {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMsg(index);
      setTimeout(() => setCopiedMsg((v) => (v === index ? null : v)), 1600);
    } catch {}
  }

  function commitRename(id: string) {
    const t = renameText.trim();
    setConversations((prev) => prev.map((c) => {
      if (c.id !== id) return c;
      const updated = { ...c, title: t || c.title };
      syncConversationToServer(updated);
      return updated;
    }));
    setRenamingId(null);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter") {
      if (enterSends && !e.shiftKey) { e.preventDefault(); send(input); }
      else if (!enterSends && e.shiftKey) { e.preventDefault(); send(input); }
    }
  }

  const handleGlobalKey = useCallback((e: KeyboardEvent) => {
    const tag = (document.activeElement as HTMLElement)?.tagName;
    const inInput = tag === "INPUT" || tag === "TEXTAREA";
    const mod = e.metaKey || e.ctrlKey;

    if (e.key === "Escape" && loading) { stop(); return; }
    if (e.key === "Escape" && focusMode) { setFocusMode(false); return; }
    if (e.key === "ArrowUp" && !inInput && !loading && messages.length > 0) {
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === "user") { startEdit(i, messages[i].content); break; }
      }
      return;
    }
    if (mod && e.key === "k") {
      e.preventDefault();
      const search = document.querySelector<HTMLInputElement>(".history-search input");
      if (search) { setSidebarOpen(true); setTimeout(() => search.focus(), 80); }
    }
    if (mod && e.shiftKey && e.key === "L") {
      e.preventDefault();
      toggleTheme();
    }
    if (mod && e.shiftKey && e.key === "F") {
      e.preventDefault();
      setFocusMode((v) => !v);
    }
  }, [loading, messages, focusMode]);

  useEffect(() => {
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, [handleGlobalKey]);

  function exportMarkdown() {
    if (!current) return;
    const lines = [`# ${current.title}\n`];
    for (const m of current.messages) {
      lines.push(m.role === "user" ? `**Você:** ${m.content}` : `**Ítala:** ${m.content}`);
      lines.push("");
    }
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${current.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function exportPrint() { window.print(); }

  function exportJSON() {
    if (!current) return;
    const safeCurrent = { ...current, messages: current.messages.slice(-40) };
    const blob = new Blob([JSON.stringify(safeCurrent, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${current.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function togglePin(id: string) {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem("a1-pins", JSON.stringify([...next]));
      return next;
    });
  }

  function archiveAll() {
    const keep = conversations.filter((c) => c.messages.length > 0 || pinnedIds.has(c.id));
    const deleted = conversations.filter((c) => c.messages.length === 0 && !pinnedIds.has(c.id));
    for (const d of deleted) deleteConversationOnServer(d.id);
    if (keep.length === 0) {
      const fresh = { id: uid(), title: "Nova conversa", messages: [] as Message[] };
      keep.push(fresh);
      createConversationOnServer(fresh);
    }
    setConversations(keep);
    if (!keep.find((c) => c.id === currentId)) setCurrentId(keep[0].id);
  }

  function playBeep() {
    if (!soundEnabled) return;
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      osc.frequency.value = 520;
      osc.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {}
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!e.target.files) return;
    e.target.value = "";
    if (!file) return;
    setFileLoading(true);
    try {
      const content = await extractFileContent(file);
      setAttachedFile({ name: file.name, content });
    } catch {
      setAttachedFile({ name: file.name, content: `[Não foi possível extrair o conteúdo de ${file.name}]` });
    } finally {
      setFileLoading(false);
    }
  }

  async function extractFileContent(file: File): Promise<string> {
    const textTypes = ["text/", "application/json", "application/xml", "application/javascript", "application/typescript"];
    if (textTypes.some(t => file.type.startsWith(t)) || /\.(txt|md|csv|json|xml|js|ts|py|html|css|sql|yaml|yml|sh|log)$/i.test(file.name)) {
      return new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result as string);
        reader.onerror = rej;
        reader.readAsText(file);
      });
    }
    if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) return extractPdfText(file);
    if (/\.docx$/i.test(file.name) || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return extractDocxText(file);
    if (/\.xlsx$/i.test(file.name) || file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") return extractXlsxText(file);
    throw new Error("Tipo não suportado");
  }

  async function extractDocxText(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const mammoth = await import("mammoth/mammoth.browser");
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value || "";
  }

  async function extractXlsxText(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const ExcelJS = (await import("exceljs")).default as typeof import("exceljs");
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(arrayBuffer);
    const MAX_ROWS = 200;
    const out: string[] = [];
    wb.eachSheet((ws) => {
      const rows: string[][] = [];
      ws.eachRow({ includeEmpty: false }, (row) => {
        if (rows.length >= MAX_ROWS) return;
        const cells: string[] = [];
        row.eachCell({ includeEmpty: true }, (cell) => {
          const v = cell.value as unknown;
          let text = "";
          if (v == null) text = "";
          else if (typeof v === "object" && "text" in (v as Record<string, unknown>)) text = String((v as { text: unknown }).text ?? "");
          else if (typeof v === "object" && "result" in (v as Record<string, unknown>)) text = String((v as { result: unknown }).result ?? "");
          else text = String(v);
          cells.push(text.replace(/\|/g, "\\|").replace(/\n/g, " ").trim());
        });
        rows.push(cells);
      });
      if (!rows.length) return;
      out.push(`## ${ws.name}`);
      const width = Math.max(...rows.map((r) => r.length));
      const pad = (r: string[]) => { while (r.length < width) r.push(""); return r; };
      const header = pad([...rows[0]]);
      out.push(`| ${header.join(" | ")} |`);
      out.push(`| ${header.map(() => "---").join(" | ")} |`);
      for (const r of rows.slice(1)) out.push(`| ${pad([...r]).join(" | ")} |`);
      out.push("");
    });
    return out.join("\n") || "[Planilha vazia]";
  }

  async function extractPdfText(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages: string[] = [];
    const maxPages = Math.min(pdf.numPages, 30);
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => ("str" in item ? (item as { str: string }).str : "")).join(" "));
    }
    return pages.join("\n\n");
  }

  // ---- Folders ----
  function handleCreateFolder(name: string) {
    const updated = createFolder(folders, name);
    if (updated.length === folders.length) return;
    setFolders(updated);
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(updated));
  }

  function handleDeleteFolder(id: string) {
    const updated = folders.filter((f) => f.id !== id);
    setFolders(updated);
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(updated));
    setConversations((prev) => prev.map((c) => c.folder === id ? { ...c, folder: undefined } : c));
    if (currentFolder === id) setCurrentFolder("");
  }

  function handleSelectFolder(id: string) {
    setCurrentFolder(id);
  }

  function handleRenameFolder(id: string, name: string) {
    setRenamingFolderId(id);
    setFolderRenameText(name);
  }

  function handleCommitFolderRename(id: string) {
    const nextName = folderRenameText.trim();
    if (!nextName) {
      setRenamingFolderId(null);
      setFolderRenameText("");
      return;
    }
    const updated = folders.map((folder) => folder.id === id ? { ...folder, name: nextName } : folder);
    setFolders(updated);
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(updated));
    setRenamingFolderId(null);
    setFolderRenameText("");
  }

  function handleCancelFolderRename() {
    setRenamingFolderId(null);
    setFolderRenameText("");
  }

  function handleMoveConversationToFolder(id: string, folderId: string | undefined) {
    setConversations((prev) => {
      const updated = moveConversationToFolder(prev, id, folderId);
      const conv = updated.find((c) => c.id === id);
      if (conv) syncConversationToServer(conv as Conversation);
      return updated;
    });
  }

  function handleExportData() {
    const payload = buildDataBackupPayload(
      folders.map((folder) => ({ id: folder.id, name: folder.name, icon: folder.icon })),
      conversations.map((conversation) => ({
        id: conversation.id,
        title: conversation.title,
        messages: conversation.messages,
        model: conversation.model,
        folder: conversation.folder,
        sharedId: conversation.sharedId,
        parentId: conversation.parentId,
        client: conversation.client,
        sharedWith: conversation.sharedWith,
      }))
    );
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `its-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportData(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const imported = importDataBackupPayload(parsed, folders, conversations);
        const nextFolders = imported.folders as Folder[];
        const nextConversations = imported.conversations as Conversation[];
        setFolders(nextFolders);
        setConversations(nextConversations);
        localStorage.setItem(FOLDERS_KEY, JSON.stringify(nextFolders));
        if (user) {
          localStorage.setItem(storageKeyFor(user), JSON.stringify(nextConversations));
        }
        if (nextConversations.length) {
          setCurrentId(nextConversations[0].id);
        }
        nextConversations.forEach((conversation) => {
          if (conversation.id) createConversationOnServer(conversation);
        });
        setError("Backup importado com sucesso.");
      } catch {
        setError("Não foi possível importar o backup.");
      }
    };
    reader.readAsText(file);
  }

  function handleImportInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    handleImportData(file);
    event.target.value = "";
  }

  // ---- Custom instructions ----
  function handleSaveInstructions(text: string) {
    setCustomInstructions(text);
    localStorage.setItem(INSTRUCTIONS_KEY, text);
  }

  // ---- Voice input ----
  function handleVoiceResult(text: string) {
    setInput((prev) => prev ? prev + " " + text : text);
    setTimeout(() => textareaRef.current?.focus(), 100);
  }

  // ---- Reactions ----
  function handleReact(msgIndex: number, type: "like" | "dislike") {
    updateCurrent((c) => {
      const msgs = [...c.messages];
      if (!msgs[msgIndex]) return c;
      const msg = { ...msgs[msgIndex] };
      const reactions = { ...(msg.reactions || {}) };
      if (type === "like") reactions.like = !reactions.like;
      else reactions.dislike = !reactions.dislike;
      msgs[msgIndex] = { ...msg, reactions };
      return { ...c, messages: msgs };
    });
  }

  function updateClient(client: string) {
    updateCurrent((c) => ({ ...c, client: client || undefined }));
  }

  // ---- Message search ----
  function handleSearchJump(index: number) {
    // Scroll to message
    const el = document.querySelector(`[data-msg-index="${index}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // ---- Login screen ----
  if (authChecking) {
    return (
      <SkeletonLoading />
    );
  }

  if (user === null) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <img src="/logo-its.png" alt="ITS Brasil" />
          <h1>{authMode === "login" ? "Entrar" : "Criar conta"}</h1>
          <p>
            {authMode === "login"
              ? "Entre com seu e-mail e senha para usar a Ítala."
              : "Crie sua conta com e-mail e senha para usar a Ítala."}
          </p>
          <form onSubmit={authMode === "login" ? login : register}>
            <input
              type="email"
              value={usernameInput}
              onChange={(e) => { setUsernameInput(e.target.value); setLoginError(""); }}
              placeholder="E-mail"
              autoComplete="email"
              autoFocus
            />
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => { setPasswordInput(e.target.value); setLoginError(""); }}
              placeholder={authMode === "login" ? "Senha" : "Senha (mín. 8 caracteres)"}
              autoComplete={authMode === "login" ? "current-password" : "new-password"}
              minLength={authMode === "register" ? 8 : undefined}
            />
            <button type="submit" disabled={!usernameInput.trim() || !passwordInput || loggingIn}>
              {loggingIn
                ? (authMode === "login" ? "Entrando…" : "Criando…")
                : (authMode === "login" ? "Entrar" : "Criar conta")}
            </button>
          </form>
          {loginError && <div className="login-error">{loginError}</div>}
          <p className="login-help">
            {authMode === "login" ? (
              <>Ainda não tem conta?{" "}
                <button type="button" className="login-link" onClick={() => { setAuthMode("register"); setLoginError(""); }}>
                  Criar conta
                </button>
              </>
            ) : (
              <>Já tem conta?{" "}
                <button type="button" className="login-link" onClick={() => { setAuthMode("login"); setLoginError(""); }}>
                  Entrar
                </button>
              </>
            )}
          </p>
          <a className="login-back" href="/manual">📘 Como usar a Ítala (manual)</a>
          <a className="login-back" href="/">← Voltar ao início</a>
        </div>
      </div>
    );
  }

  const waitingForFirstToken = loading && (messages.length === 0 || messages[messages.length - 1].role === "user");
  const displayLabel = userName || user;
  const firstName = (userName || user).split(/[\s@.]/)[0];
  const initial = displayLabel.trim().charAt(0).toUpperCase() || "U";

  const composer = (
    <div className="composer">
      {error && <div className="error">{error}</div>}
      {fileLoading && (
        <div className="file-loading">
          <span className="typing"><span/><span/><span/></span>
          Extraindo conteúdo do arquivo…
        </div>
      )}
      {webSearch && (
        <div className="web-search-badge">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          Busca na web ativa
          <button onClick={() => setWebSearch(false)}>✕</button>
        </div>
      )}
      {attachedFile && (
        <div className="file-chip">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          <span>{attachedFile.name}</span>
          <button onClick={() => setAttachedFile(null)} aria-label="Remover arquivo">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      )}
      {attachedImage && (
        <div className="file-chip image-chip">
          <img src={attachedImage.dataUrl} alt={attachedImage.name} className="image-preview-thumb" />
          <span>{attachedImage.name}</span>
          <button onClick={() => setAttachedImage(null)} aria-label="Remover imagem">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      )}
      <div className="input-box">
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.csv,.json,.xml,.js,.ts,.py,.html,.css,.sql,.yaml,.yml,.sh,.log,.pdf,.docx,.xlsx"
          style={{ display: "none" }}
          onChange={handleFileSelect}
        />
        <button
          className={`attach-btn${webSearch ? " active" : ""}`}
          onClick={() => setWebSearch((v) => !v)}
          disabled={loading}
          aria-label="Buscar na internet"
          title={webSearch ? "Busca na web ativa" : "Ativar busca na web"}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            <path d="M11 8v6M8 11h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </button>

        <select
          className="style-select"
          value={writingStyle}
          onChange={(e) => { setWritingStyle(e.target.value); localStorage.setItem(STYLE_KEY, e.target.value); }}
          title="Estilo de escrita"
          aria-label="Estilo de escrita"
          disabled={loading}
        >
          {STYLES.map((s) => (
            <option key={s.id} value={s.id}>{s.id ? `Estilo: ${s.label}` : "Estilo"}</option>
          ))}
        </select>

        <button
          className="attach-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          aria-label="Anexar arquivo"
          title="Anexar arquivo (PDF, Word, Excel, texto…)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <ImageUpload
          attached={attachedImage}
          onAttach={setAttachedImage}
          onRemove={() => setAttachedImage(null)}
        />

        <VoiceInput onResult={handleVoiceResult} />

        <textarea
          ref={textareaRef}
          value={input}
          placeholder={imageAnalyzing ? "Analisando a imagem…" : attachedFile || attachedImage ? "Adicione uma pergunta ou envie para processar…" : "Envie uma mensagem para a Ítala"}
          rows={1}
          onChange={(e) => { setInput(e.target.value); autoGrow(); }}
          onKeyDown={onKeyDown}
        />
        {loading ? (
          <button className="send stop" onClick={stop} aria-label="Parar geração">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" />
            </svg>
          </button>
        ) : (
          <button className="send" onClick={() => send(input)} disabled={imageAnalyzing || (!input.trim() && !attachedFile && !attachedImage)} aria-label="Enviar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 19V5M12 5l-6 6M12 5l6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
      <div className="disclaimer">Ítala pode cometer erros. Confira informações importantes.</div>
      <div className="kbd-hint">
        <span><kbd>↑</kbd> editar última mensagem</span>
        <span><kbd>Esc</kbd> parar</span>
        <span><kbd>⌘K</kbd> buscar</span>
      </div>
    </div>
  );

  return (
    <ArtifactContext.Provider value={{ open: setOpenArtifact }}>
    <div className={`layout${sidebarOpen ? " sidebar-open" : ""}${sidebarCollapsed ? " sidebar-collapsed" : ""}${focusMode ? " focus-mode" : ""}${openArtifact ? " artifact-open" : ""}`}>
      {!focusMode && <div className="overlay" onClick={() => setSidebarOpen(false)} />}

      {!focusMode && <Sidebar
        conversations={conversations}
        currentId={currentId}
        sidebarOpen={sidebarOpen}
        sidebarCollapsed={sidebarCollapsed}
        user={user || ""}
        userName={userName}
        displayLabel={displayLabel}
        initial={initial}
        convSearch={convSearch}
        folders={folders}
        activeFolder={currentFolder}
        renamingId={renamingId}
        renameText={renameText}
        pinnedIds={pinnedIds}
        onNewChat={newChat}
        onSelectConversation={(id) => setCurrentId(id)}
        onDeleteChat={deleteChat}
        onSearchChange={setConvSearch}
        onStartRename={(id, title) => { setRenamingId(id); setRenameText(title); }}
        onRenameChange={setRenameText}
        onCommitRename={commitRename}
        onCancelRename={() => setRenamingId(null)}
        onToggleCollapsed={toggleSidebarCollapsed}
        onCloseSidebar={() => setSidebarOpen(false)}
        onLogout={logout}
        onCreateFolder={handleCreateFolder}
        onDeleteFolder={handleDeleteFolder}
        onSelectFolder={handleSelectFolder}
        onStartRenameFolder={handleRenameFolder}
        onRenameFolderChange={setFolderRenameText}
        onCommitRenameFolder={handleCommitFolderRename}
        onCancelRenameFolder={handleCancelFolderRename}
        renamingFolderId={renamingFolderId}
        folderRenameText={folderRenameText}
        onMoveConversationToFolder={handleMoveConversationToFolder}
      />}

      <main className="main">
        {!focusMode && <header className="topbar">
          <button className="icon-btn menu-toggle" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <button className="icon-btn expand-toggle" onClick={toggleSidebarCollapsed} aria-label="Expandir menu" title="Expandir menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M9 4v16" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M12 9l2 3-2 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <input
            ref={backupImportInputRef}
            type="file"
            accept="application/json"
            style={{ display: "none" }}
            onChange={handleImportInputChange}
          />
          <div className="model">
            <span className="brand-name">Ítala</span>
            <small>{status === "online" ? "online" : "offline"}</small>
          </div>

          <CustomInstructions
            instructions={customInstructions}
            onSave={handleSaveInstructions}
          />

          <input className="client-input" value={current?.client || ""} onChange={(e) => updateClient(e.target.value)} placeholder="Cliente / Projeto" title="Cliente ou projeto associado" />

          <div className={`conn ${status}`} title={`Status do ${ENGINE_NAME}`}>
            <span className="dot" />
            {status === "online" ? "Online" : status === "checking" ? "..." : "Offline"}
          </div>

          {messages.length > 0 && (
            <div style={{ display: "flex", gap: 2 }}>
              <MessageSearch messages={messages} onJump={handleSearchJump} />
              <ConversationShare conversationId={currentId} sharedId={current?.sharedId} />
              <button className="export-btn" onClick={exportMarkdown} title="Exportar como Markdown">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="btn-label">.md</span>
              </button>
              <button className="export-btn" onClick={exportPrint} title="Exportar como PDF">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <rect x="6" y="14" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1.8"/>
                </svg>
                <span className="btn-label">PDF</span>
              </button>
              <button className="export-btn" onClick={exportJSON} title="Exportar como JSON">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="1.8"/><path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.8"/>
                </svg>
                <span className="btn-label">JSON</span>
              </button>
              <button className="export-btn" onClick={handleExportData} title="Backup de dados">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M12 3v12M12 15l-4-4M12 15l4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M5 16v2a2 2 0 002 2h10a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
                <span className="btn-label">Backup</span>
              </button>
              <button className="export-btn" onClick={() => backupImportInputRef.current?.click()} title="Restaurar backup">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M12 21v-12M12 9l4 4M12 9l-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M19 8V6a2 2 0 00-2-2H7a2 2 0 00-2 2v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
                <span className="btn-label">Restaurar</span>
              </button>
              <TokenCounter messages={messages} />
            </div>
          )}

          <KnowledgeManager />
          <button className="icon-btn" onClick={() => setFocusMode((v) => !v)} title={focusMode ? "Sair do modo foco" : "Modo foco (⌘⇧F)"}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
          <button className={`icon-btn${soundEnabled ? " active" : ""}`} onClick={() => { setSoundEnabled((v) => { localStorage.setItem("a1-sound", v ? "0" : "1"); return !v; }); }} title={soundEnabled ? "Som ligado" : "Som desligado"}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              {soundEnabled ? (
                <><path d="M11 5L6 9H2v6h4l5 4V5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></>
              ) : (
                <><path d="M11 5L6 9H2v6h4l5 4V5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M23 9l-6 6M17 9l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></>
              )}
            </svg>
          </button>
          <button className={`icon-btn${!enterSends ? " active" : ""}`} onClick={() => { setEnterSends((v) => { localStorage.setItem("a1-enter-sends", v ? "0" : "1"); return !v; }); }} title={enterSends ? "Enter=enviar, Shift+Enter=linha nova" : "Shift+Enter=enviar, Enter=linha nova"}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M22 12H4M4 12l4-4M4 12l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {messages.length > 0 && (
            <button className="icon-btn" onClick={archiveAll} title="Arquivar conversas vazias">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M21 8v13H3V8M1 3h22v5H1z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                <path d="M10 12h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          )}

          <button className="theme-toggle" onClick={toggleTheme} aria-label="Alternar tema" title={theme === "dark" ? "Modo claro (⌘⇧L)" : "Modo escuro (⌘⇧L)"}>
            {theme === "dark" ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.8"/>
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        </header>}

        {syncWarning && (
          <div className="engine-banner" role="status">
            <strong>Não foi possível salvar no servidor.</strong> Sua conversa está
            guardada neste dispositivo e tentaremos sincronizar novamente.
          </div>
        )}

        {updateReady && (
          <div className="engine-banner" role="status">
            <strong>Nova versão disponível.</strong> Será atualizada automaticamente quando você terminar.
            <span className="engine-retry">
              <button onClick={() => window.location.reload()}>Atualizar agora</button>
            </span>
          </div>
        )}

        {status === "offline" && (
          <div className="engine-banner">
            <strong>O serviço de IA está indisponível no momento.</strong>
            <span className="engine-retry">
              <button onClick={checkEngine}>Tentar novamente</button>
            </span>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="greeting">
            <img src="/logo-its.png" alt="ITS Brasil" />
            <h1>Olá, {firstName} 👋</h1>
            <div className="composer-wrap">
              {composer}
              <div className="chips">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)}>{s}</button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="scroll" ref={scrollRef} onScroll={onThreadScroll}>
              <div className="thread">
                {messages.map((m, i) =>
                  m.role === "user" ? (
                    <div className="row user" key={i} data-msg-index={i}>
                      {editingIndex === i ? (
                        <div className="msg-edit">
                          <textarea
                            value={editText}
                            autoFocus
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitEdit(i); }
                              else if (e.key === "Escape") setEditingIndex(null);
                            }}
                          />
                          <div className="msg-edit-actions">
                            <button className="ghost" onClick={() => setEditingIndex(null)}>Cancelar</button>
                            <button className="primary" onClick={() => submitEdit(i)} disabled={!editText.trim()}>Enviar</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="bubble">
                            {m.image && (
                              <img src={m.image} alt="Imagem anexada" className="msg-image" />
                            )}
                            {stripThink(m.content)}
                          </div>
                          {!loading && (
                            <button className="msg-action edit" onClick={() => startEdit(i, m.content)} aria-label="Editar mensagem">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                <path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="row assistant" key={i} data-msg-index={i}>
                      <div className="avatar">
                        <img src="/logo-its.png" alt="A1" />
                      </div>
                      <div className="content">
                        <div className="name">Ítala</div>
                        {m.content === "" ? (
                          <span className="typing"><span/><span/><span/></span>
                        ) : (
                          <>
                            <MessageContent content={m.content} sources={m.sources} />
                            {m.sources && m.sources.length > 0 && <Sources sources={m.sources} />}
                            <Reactions
                              reactions={m.reactions}
                              onReact={(type) => handleReact(i, type)}
                            />
                            {loading && i === messages.length - 1 && (
                              <span className="stream-caret" aria-hidden="true" />
                            )}
                            {!loading && (
                              <div className="msg-actions">
                                <button className="msg-action" onClick={() => copyMessage(i, m.content)} aria-label="Copiar resposta">
                                  {copiedMsg === i ? (
                                    <>
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                        <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                                      </svg>
                                      Copiado
                                    </>
                                  ) : (
                                    <>
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                        <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
                                        <path d="M5 15V5a2 2 0 012-2h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                      </svg>
                                      Copiar
                                    </>
                                  )}
                                </button>
                                {i === messages.length - 1 && (
                                  <button className="msg-action" onClick={regenerate} aria-label="Regenerar resposta">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                      <path d="M23 4v6h-6M1 20v-6h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    Regenerar
                                  </button>
                                )}
                                {!loading && (
                                  <button className="msg-action" onClick={() => forkConversation(i)} aria-label="Criar ramo" title="Criar ramo a partir daqui">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                      <path d="M6 3v12a3 3 0 003 3h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                                      <path d="M15 21l3-3-3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                      <path d="M18 18h-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                                    </svg>
                                    Ramificar
                                  </button>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )
                )}
                {waitingForFirstToken && (
                  <div className="row assistant">
                    <div className="avatar"><img src="/logo-its.png" alt="A1" /></div>
                    <div className="content">
                      <div className="name">Ítala</div>
                      <span className="typing"><span/><span/><span/></span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {showScrollDown && (
              <button className="scroll-down" onClick={scrollToBottom} aria-label="Rolar para o fim">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            <div className="composer-outer">{composer}</div>
          </>
        )}
      </main>
      {openArtifact && <ArtifactPanel artifact={openArtifact} onClose={() => setOpenArtifact(null)} />}
    </div>
    </ArtifactContext.Provider>
  );
}
