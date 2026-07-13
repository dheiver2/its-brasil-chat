"use client";
import { useState } from "react";
import type { Folder } from "./types";

export function FolderManager({
  folders,
  activeFolder,
  onSelectFolder,
  onCreateFolder,
  onDeleteFolder,
  onStartRenameFolder,
  onRenameFolderChange,
  onCommitRenameFolder,
  onCancelRenameFolder,
  renamingFolderId,
  folderRenameText,
  onMoveConversationToFolder,
  draggedConversationId,
}: {
  folders: Folder[];
  activeFolder: string;
  onSelectFolder: (id: string) => void;
  onCreateFolder: (name: string) => void;
  onDeleteFolder: (id: string) => void;
  onStartRenameFolder?: (id: string, name: string) => void;
  onRenameFolderChange?: (v: string) => void;
  onCommitRenameFolder?: (id: string) => void;
  onCancelRenameFolder?: () => void;
  renamingFolderId?: string | null;
  folderRenameText?: string;
  onMoveConversationToFolder?: (id: string, folderId: string | undefined) => void;
  draggedConversationId?: string | null;
}) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  function create() {
    const name = newName.trim();
    if (!name) return;
    onCreateFolder(name);
    setNewName("");
    setCreating(false);
  }

  function handleDrop(folderId: string | undefined) {
    return (event: React.DragEvent) => {
      event.preventDefault();
      const conversationId = event.dataTransfer.getData("text/plain");
      if (conversationId && onMoveConversationToFolder) {
        onMoveConversationToFolder(conversationId, folderId);
      }
    };
  }

  return (
    <div className="folders">
      <div className="folders-header">
        <span className="history-label">Pastas</span>
        <button className="folders-add" onClick={() => setCreating(true)} type="button" aria-label="Criar pasta">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <button
        className={`folder-item${activeFolder === "" ? " active" : ""}${draggedConversationId ? " drop-target" : ""}`}
        onClick={() => onSelectFolder("")}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop(undefined)}
        type="button"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
        </svg>
        Todas as conversas
      </button>
      {folders.map((f) => (
        renamingFolderId === f.id ? (
          <div key={f.id} className="folder-create">
            <input
              value={folderRenameText}
              autoFocus
              onChange={(e) => onRenameFolderChange?.(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); onCommitRenameFolder?.(f.id); }
                else if (e.key === "Escape") { e.preventDefault(); onCancelRenameFolder?.(); }
              }}
              onBlur={() => onCommitRenameFolder?.(f.id)}
              placeholder="Novo nome da pasta"
            />
          </div>
        ) : (
          <div key={f.id} className="folder-item-wrap">
            <button
              className={`folder-item${activeFolder === f.id ? " active" : ""}${draggedConversationId ? " drop-target" : ""}`}
              onClick={() => onSelectFolder(f.id)}
              onDoubleClick={() => onStartRenameFolder?.(f.id, f.name)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop(f.id)}
              type="button"
            >
              <span className="folder-icon">{f.icon || "📁"}</span>
              <span className="folder-name">{f.name}</span>
            </button>
            <button
              className="folder-rename"
              onClick={() => onStartRenameFolder?.(f.id, f.name)}
              type="button"
              aria-label="Renomear pasta"
            >
              ✎
            </button>
            <button
              className="folder-del"
              onClick={() => onDeleteFolder(f.id)}
              type="button"
              aria-label="Excluir pasta"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        )
      ))}
      {creating && (
        <div className="folder-create">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome da pasta"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") create(); if (e.key === "Escape") setCreating(false); }}
            onBlur={() => { if (!newName.trim()) setCreating(false); }}
          />
        </div>
      )}
    </div>
  );
}
