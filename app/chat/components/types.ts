export type Role = "user" | "assistant";
export interface Source { title: string; url: string; }
export interface Message {
  role: Role;
  content: string;
  sources?: Source[];
  reactions?: { like?: boolean; dislike?: boolean };
  /** Miniatura (dataURL) de imagem anexada, exibida na bolha do usuário. Não vai ao modelo. */
  image?: string;
}
export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  model?: string;
  folder?: string;
  sharedId?: string;
  parentId?: string;
  client?: string;
  sharedWith?: string[];
  updatedAt?: string;
}

export interface Folder {
  id: string;
  name: string;
  icon?: string;
}
