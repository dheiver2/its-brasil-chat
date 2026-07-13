export interface BackupFolder {
  id?: string;
  name: string;
  icon?: string;
}

export interface BackupConversation {
  id?: string;
  title: string;
  messages: unknown[];
  model?: string;
  folder?: string;
  sharedId?: string;
  parentId?: string;
  client?: string;
  sharedWith?: string[];
}

export interface DataBackupPayload {
  version: number;
  folders: BackupFolder[];
  conversations: BackupConversation[];
}

function uid() {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {}
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function buildDataBackupPayload(folders: BackupFolder[], conversations: BackupConversation[]): DataBackupPayload {
  return {
    version: 1,
    folders: folders.map((folder) => ({ ...folder, id: folder.id || uid() })),
    conversations: conversations.map((conversation) => ({ ...conversation, id: conversation.id || uid() })),
  };
}

export function importDataBackupPayload(
  payload: Partial<DataBackupPayload> | null | undefined,
  existingFolders: BackupFolder[] = [],
  existingConversations: BackupConversation[] = []
) {
  const folders = Array.isArray(payload?.folders) ? payload.folders : [];
  const conversations = Array.isArray(payload?.conversations) ? payload.conversations : [];

  const mergedFolders = [...existingFolders, ...folders.map((folder) => ({ ...folder, id: folder.id || uid() }))];
  // Importadas primeiro (topo da lista); existentes preservadas em seguida.
  const mergedConversations = [
    ...conversations.map((conversation) => ({
      ...conversation,
      id: conversation.id && !existingConversations.some((item) => item.id === conversation.id) ? conversation.id : uid(),
    })),
    ...existingConversations,
  ];

  return {
    folders: mergedFolders,
    conversations: mergedConversations,
  };
}
