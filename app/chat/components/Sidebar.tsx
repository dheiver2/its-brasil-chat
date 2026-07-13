"use client";
import { Fragment, useState } from "react";
import type { Conversation, Folder } from "./types";
import { FolderManager } from "./FolderManager";
import { buildSidebarGroups } from "./sidebar-utils";

export function Sidebar({
  conversations,
  currentId,
  sidebarOpen,
  sidebarCollapsed,
  user,
  userName,
  displayLabel,
  initial,
  convSearch,
  folders,
  activeFolder,
  renamingId,
  renameText,
  onNewChat,
  onSelectConversation,
  onDeleteChat,
  onSearchChange,
  onStartRename,
  onRenameChange,
  onCommitRename,
  onCancelRename,
  onToggleCollapsed,
  onCloseSidebar,
  onLogout,
  onCreateFolder,
  onDeleteFolder,
  onSelectFolder,
  onStartRenameFolder,
  onRenameFolderChange,
  onCommitRenameFolder,
  onCancelRenameFolder,
  renamingFolderId,
  folderRenameText,
  onMoveConversationToFolder,
  pinnedIds,
}: {
  conversations: Conversation[];
  currentId: string;
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  user: string;
  userName: string;
  displayLabel: string;
  initial: string;
  convSearch: string;
  folders: Folder[];
  activeFolder: string;
  renamingId: string | null;
  renameText: string;
  pinnedIds: Set<string>;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteChat: (id: string, e: React.MouseEvent) => void;
  onSearchChange: (v: string) => void;
  onStartRename: (id: string, title: string) => void;
  onRenameChange: (v: string) => void;
  onCommitRename: (id: string) => void;
  onCancelRename: () => void;
  onToggleCollapsed: () => void;
  onCloseSidebar: () => void;
  onLogout: () => void;
  onCreateFolder: (name: string) => void;
  onDeleteFolder: (id: string) => void;
  onSelectFolder: (id: string) => void;
  onStartRenameFolder: (id: string, name: string) => void;
  onRenameFolderChange: (v: string) => void;
  onCommitRenameFolder: (id: string) => void;
  onCancelRenameFolder: () => void;
  renamingFolderId: string | null;
  folderRenameText: string;
  onMoveConversationToFolder: (id: string, folderId: string | undefined) => void;
}) {
  const [draggedConversationId, setDraggedConversationId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const closeMenu = () => { setMenuId(null); setConfirmId(null); };

  const folderLookup = Object.fromEntries(folders.map((folder) => [folder.id, folder.name]));
  const groups = buildSidebarGroups(conversations, convSearch, activeFolder, pinnedIds);
  const totalFiltered = groups.reduce((n, g) => n + g.items.length, 0);
  const filteredLabel = totalFiltered === 1 ? "1 conversa" : `${totalFiltered} conversas`;

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="brand-card">
          <div className="brand">
            <img src="/logo-its.png" alt="ITS Brasil" />
            <div className="brand-copy">
              <span>Ítala</span>
              <small>Workspace</small>
            </div>
            <button
              className="collapse-btn"
              onClick={onToggleCollapsed}
              aria-label="Recolher menu"
              title="Recolher menu"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8"/>
                <path d="M9 4v16" stroke="currentColor" strokeWidth="1.8"/>
                <path d="M14 9l-2 3 2 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
        <button className="new-chat" onClick={onNewChat} title="Nova conversa">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="btn-label">Nova conversa</span>
        </button>
      </div>

      <FolderManager
        folders={folders}
        activeFolder={activeFolder}
        onSelectFolder={onSelectFolder}
        onCreateFolder={onCreateFolder}
        onDeleteFolder={onDeleteFolder}
        onStartRenameFolder={onStartRenameFolder}
        onRenameFolderChange={onRenameFolderChange}
        onCommitRenameFolder={onCommitRenameFolder}
        onCancelRenameFolder={onCancelRenameFolder}
        renamingFolderId={renamingFolderId}
        folderRenameText={folderRenameText}
        onMoveConversationToFolder={onMoveConversationToFolder}
        draggedConversationId={draggedConversationId}
      />

      <div className="history">
        <div className="history-search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
            <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            value={convSearch}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar conversas"
          />
          {convSearch && (
            <button className="clear" onClick={() => onSearchChange("")} aria-label="Limpar busca">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
        <div className="history-section-header">
          <span>Conversas recentes</span>
          <span className="history-count">{filteredLabel}</span>
        </div>
        {groups.map((g) => (
          <Fragment key={g.key}>
            <div className="history-group-label">{g.label}</div>
            {g.items.map((c) =>
          renamingId === c.id ? (
            <div className="history-item renaming" key={c.id}>
              <input
                className="history-rename"
                value={renameText}
                autoFocus
                onChange={(e) => onRenameChange(e.target.value)}
                onBlur={() => onCommitRename(c.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); onCommitRename(c.id); }
                  else if (e.key === "Escape") onCancelRename();
                }}
              />
            </div>
          ) : (
            <div
              className={`history-item-row${menuId === c.id ? " menu-open" : ""}`}
              key={c.id}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData("text/plain", c.id);
                event.dataTransfer.effectAllowed = "move";
                setDraggedConversationId(c.id);
              }}
              onDragEnd={() => setDraggedConversationId(null)}
            >
              <button
                className={`history-item${c.id === currentId ? " active" : ""}`}
                onClick={() => { onSelectConversation(c.id); onCloseSidebar(); }}
                onDoubleClick={() => onStartRename(c.id, c.title || "")}
              >
                <div className="history-item-main">
                  <div className="history-item-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                      <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="history-item-copy">
                    <span className="title">{c.title || "Nova conversa"}</span>
                    <span className="subtitle">
                      {c.folder ? folderLookup[c.folder] || "Pasta" : "Sem pasta"} • {c.messages.length} {c.messages.length === 1 ? "mensagem" : "mensagens"}
                    </span>
                  </div>
                </div>
                <div className="history-item-badges">
                  {(c as any).parentId && (
                    <span className="row-badge" title="Ramificação" aria-label="Ramificação">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M6 3v6a4 4 0 004 4h4M18 8V5m0 0a2 2 0 10-2 2 2 2 0 002-2zM6 3a2 2 0 10-2 2 2 2 0 002-2zM18 19a2 2 0 10-2 2 2 2 0 002-2z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </span>
                  )}
                  {c.sharedId && (
                    <span className="row-badge" title="Compartilhada" aria-label="Compartilhada">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M7 17L17 7M9 7h8v8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </span>
                  )}
                  {(c.sharedWith?.length ?? 0) > 0 && (
                    <span className="row-badge" title="Compartilhada com a equipe" aria-label="Compartilhada com a equipe">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M16 19a4 4 0 00-8 0M12 11a3 3 0 100-6 3 3 0 000 6zM20 19a3 3 0 00-3-3M4 19a3 3 0 013-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </span>
                  )}
                  {c.client && <span className="row-badge client-badge" title={c.client}>{c.client.slice(0, 12)}</span>}
                  {pinnedIds.has(c.id) && (
                    <span className="row-badge pin" title="Fixada" aria-label="Fixada">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M9 4h6l-1 6 3 3v2H7v-2l3-3-1-6zM12 15v5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </span>
                  )}
                </div>
              </button>

              <div className="row-actions">
                <button
                  className="row-menu-btn"
                  aria-haspopup="menu"
                  aria-expanded={menuId === c.id}
                  aria-label="Mais ações"
                  onClick={(e) => { e.stopPropagation(); setConfirmId(null); setMenuId(menuId === c.id ? null : c.id); }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="5" cy="12" r="1.6" fill="currentColor" /><circle cx="12" cy="12" r="1.6" fill="currentColor" /><circle cx="19" cy="12" r="1.6" fill="currentColor" /></svg>
                </button>
                {menuId === c.id && (
                  <>
                    <div className="row-menu-backdrop" onClick={closeMenu} />
                    <div className="row-menu" role="menu">
                      <button role="menuitem" onClick={() => { onStartRename(c.id, c.title || ""); closeMenu(); }}>
                        Renomear
                      </button>
                      <label className="row-menu-folder">
                        Mover para pasta
                        <select
                          value={c.folder ?? ""}
                          onChange={(e) => { onMoveConversationToFolder(c.id, e.target.value || undefined); closeMenu(); }}
                          aria-label="Mover para pasta"
                        >
                          <option value="">Sem pasta</option>
                          {folders.map((folder) => (
                            <option key={folder.id} value={folder.id}>{folder.name}</option>
                          ))}
                        </select>
                      </label>
                      {confirmId === c.id ? (
                        <button role="menuitem" className="danger" onClick={(e) => { onDeleteChat(c.id, e); closeMenu(); }}>
                          Confirmar exclusão
                        </button>
                      ) : (
                        <button role="menuitem" className="danger" onClick={() => setConfirmId(c.id)}>
                          Excluir
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )
            )}
          </Fragment>
        ))}
        {totalFiltered === 0 && (
          <div className="history-empty">Nenhuma conversa corresponde à busca</div>
        )}
      </div>

      <div className="sidebar-bottom">
        <div className="user-pill">
          <span className="ava">{initial}</span>
          <span className="txt">
            <span className="name-line" title={displayLabel}>{displayLabel}</span>
            <small title={userName ? user : undefined}>{userName ? user : "Funcionário ITS Brasil"}</small>
          </span>
          <button className="logout-btn" onClick={onLogout} aria-label="Sair" title="Sair">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
