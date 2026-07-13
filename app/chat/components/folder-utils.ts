export interface FolderLike {
  id: string;
  name: string;
  icon?: string;
}

export interface ConversationLike {
  id: string;
  folder?: string;
}

function uid() {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {}
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function createFolder(folders: FolderLike[], name: string) {
  const cleaned = name.trim();
  if (!cleaned) return folders;
  return [...folders, { id: uid(), name: cleaned }];
}

export function moveConversationToFolder<T extends ConversationLike>(conversations: T[], conversationId: string, folderId: string | undefined) {
  return conversations.map((conversation) => conversation.id === conversationId ? { ...conversation, folder: folderId } : conversation);
}

export function renameFolder<T extends FolderLike>(folders: T[], folderId: string, name: string) {
  const cleaned = name.trim();
  if (!cleaned) return folders;
  return folders.map((folder) => folder.id === folderId ? { ...folder, name: cleaned } : folder);
}
