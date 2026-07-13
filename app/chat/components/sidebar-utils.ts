type SidebarConv = {
  id: string;
  title?: string;
  folder?: string;
  updatedAt?: string;
  messages?: { content?: string }[];
};

/**
 * Filtra por pasta e por busca. A busca casa com o TÍTULO e também com o
 * CONTEÚDO das mensagens (como ChatGPT/Claude).
 */
export function filterConversationsForSidebar<T extends SidebarConv>(
  conversations: T[],
  search: string,
  activeFolder: string
) {
  const q = search.trim().toLowerCase();
  return conversations.filter((c) => {
    if (activeFolder && c.folder !== activeFolder) return false;
    if (!q) return true;
    if ((c.title || "Nova conversa").toLowerCase().includes(q)) return true;
    return (c.messages || []).some((m) => (m.content || "").toLowerCase().includes(q));
  });
}

export interface SidebarGroup<T> {
  key: string;
  label: string;
  items: T[];
}

/**
 * Monta os grupos exibidos no sidebar: "Fixadas" no topo e o restante em
 * faixas de data (Hoje / Ontem / Últimos 7 dias / Mais antigas), preservando
 * a ordem por updatedAt desc que vem do servidor.
 */
export function buildSidebarGroups<T extends SidebarConv>(
  conversations: T[],
  search: string,
  activeFolder: string,
  pinnedIds: Set<string>,
  now: number = Date.now()
): SidebarGroup<T>[] {
  const filtered = filterConversationsForSidebar(conversations, search, activeFolder);

  const pinned = filtered.filter((c) => pinnedIds.has(c.id));
  const rest = filtered.filter((c) => !pinnedIds.has(c.id));

  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const todayMs = startToday.getTime();
  const dayMs = 86_400_000;

  const today: T[] = [], yesterday: T[] = [], week: T[] = [], older: T[] = [];
  for (const c of rest) {
    const t = c.updatedAt ? Date.parse(c.updatedAt) : NaN;
    if (Number.isNaN(t)) older.push(c);
    else if (t >= todayMs) today.push(c);
    else if (t >= todayMs - dayMs) yesterday.push(c);
    else if (t >= todayMs - 7 * dayMs) week.push(c);
    else older.push(c);
  }

  const groups: SidebarGroup<T>[] = [];
  if (pinned.length) groups.push({ key: "pinned", label: "Fixadas", items: pinned });
  if (today.length) groups.push({ key: "today", label: "Hoje", items: today });
  if (yesterday.length) groups.push({ key: "yesterday", label: "Ontem", items: yesterday });
  if (week.length) groups.push({ key: "week", label: "Últimos 7 dias", items: week });
  if (older.length) groups.push({ key: "older", label: "Mais antigas", items: older });
  return groups;
}
