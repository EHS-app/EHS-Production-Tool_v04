import React, { useState, useRef, useEffect, KeyboardEvent } from "react";
import { useProjectChat, type ChatRole } from "../hooks/use-project-chat";
import { useT } from "../lib/i18n/I18nContext";
import { Send, Users, X, UserPlus, Trash2, AlertCircle, RefreshCw, MessageSquare } from "lucide-react";
import { format, parseISO } from "date-fns";

interface Props {
  projectId: string | null;
}

export function ProjectChat({ projectId }: Props) {
  const {
    messages,
    members,
    currentRole,
    isInitializing,
    isSending,
    error,
    sendMessage,
    inviteMember,
    removeMember,
    retry,
  } = useProjectChat(projectId);

  const [composerText, setComposerText] = useState("");
  const [showMembers, setShowMembers] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<ChatRole>("editor");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState(false);
  const [memberActionError, setMemberActionError] = useState<string | null>(null);
  const [showNewMessageAffordance, setShowNewMessageAffordance] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);

  const t = useT();

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const fromBottom = scrollHeight - scrollTop - clientHeight;
    isNearBottomRef.current = fromBottom < 100;
    
    if (isNearBottomRef.current && showNewMessageAffordance) {
      setShowNewMessageAffordance(false);
    }
  };

  useEffect(() => {
    if (!scrollRef.current) return;
    if (isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } else {
      setShowNewMessageAffordance(true);
    }
  }, [messages.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowNewMessageAffordance(false);
    isNearBottomRef.current = true;
  };

  const handleSend = async () => {
    const text = composerText.trim();
    if (!text || isSending) return;
    
    setComposerText("");
    inputRef.current?.focus();
    isNearBottomRef.current = true; 
    
    try {
      await sendMessage(text);
      scrollToBottom();
    } catch (err) {
      // Revert composer on error if we want, or keep it in a retry queue.
      // For simplicity, we just put it back.
      setComposerText(text);
      console.error(err);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setIsInviting(true);
    setInviteError(null);
    try {
      await inviteMember(inviteEmail.trim(), inviteRole);
      setInviteEmail("");
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to invite member");
    } finally {
      setIsInviting(false);
    }
  };

  if (!projectId) {
    return (
      <div className="chat-empty-state">
        <MessageSquare size={32} />
        <h3>No Project Active</h3>
        <p>Please save the project first before using team chat.</p>
      </div>
    );
  }

  const isViewer = currentRole === "viewer";
  const isOwner = currentRole === "owner";
  const canSend = currentRole === "owner" || currentRole === "editor";

  return (
    <div className="project-chat-container">
      <div className="chat-main">
        <div className="chat-header">
          <div className="chat-header-title">
            <MessageSquare size={16} />
            {t("shell.nav.chat") || "Discussion"}
          </div>
          <button 
            className={`btn-icon ${showMembers ? "is-active" : ""}`}
            onClick={() => setShowMembers(!showMembers)}
            title="Team members"
          >
            <Users size={16} />
          </button>
        </div>

        <div className="chat-messages-area" ref={scrollRef} onScroll={handleScroll}>
          {isInitializing && messages.length === 0 ? (
            <div className="chat-loading">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="chat-empty-messages">
              No messages yet. Start the conversation!
            </div>
          ) : (
            <div className="chat-messages-list">
              {messages.map((msg, i) => {
                const showHeader = i === 0 || messages[i-1].authorUserId !== msg.authorUserId;
                const date = parseISO(msg.createdAt);
                
                return (
                  <div key={msg.id} className="chat-message-row">
                    {showHeader && (
                      <div className="chat-message-author-row">
                        <div className="chat-avatar">
                          {(msg.authorName || msg.authorEmail || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="chat-author-name">{msg.authorName || msg.authorEmail || "Unknown"}</div>
                        <div className="chat-timestamp">{format(date, "HH:mm")}</div>
                      </div>
                    )}
                    <div className="chat-bubble">
                      {msg.body.split('\n').map((line, j) => (
                        <React.Fragment key={j}>
                          {line}
                          {j < msg.body.split('\n').length - 1 && <br />}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}

          {showNewMessageAffordance && (
            <button className="chat-new-message-pill" onClick={scrollToBottom}>
              New messages ↓
            </button>
          )}
        </div>

        {error && (
          <div className="chat-error-bar">
            <AlertCircle size={14} />
            <span>{error}</span>
            <button type="button" className="btn-icon" onClick={() => void retry()} title="Retry">
              <RefreshCw size={13} />
            </button>
          </div>
        )}

        <div className="chat-composer">
          {!canSend ? (
            <div className="chat-composer-viewer-msg">
              {isViewer
                ? "You have view-only access to this project discussion."
                : "Loading your project access…"}
            </div>
          ) : (
            <>
              <textarea
                ref={inputRef}
                className="chat-textarea"
                placeholder="Type a message... (Shift+Enter for newline)"
                value={composerText}
                onChange={e => setComposerText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isSending}
                rows={1}
                style={{
                  height: composerText.split('\n').length > 1 ? `${Math.min(5, composerText.split('\n').length) * 20 + 24}px` : '44px'
                }}
              />
              <button 
                className="chat-send-btn" 
                onClick={handleSend}
                disabled={!composerText.trim() || isSending}
                title="Send message"
              >
                <Send size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      {showMembers && (
        <div className="chat-sidebar">
          <div className="chat-sidebar-header">
            <h3>Team Members</h3>
            <button className="btn-icon" onClick={() => setShowMembers(false)}>
              <X size={16} />
            </button>
          </div>
          
          <div className="chat-members-list">
            {members.map(member => (
              <div key={member.userId} className="chat-member-item">
                <div className="chat-avatar sm">
                  {(member.name || member.email || "?").charAt(0).toUpperCase()}
                </div>
                <div className="chat-member-info">
                  <div className="chat-member-name">{member.name || member.email || "Unknown user"}</div>
                  <div className="chat-member-role">{member.role}</div>
                </div>
                {isOwner && member.role !== "owner" && (
                  <button 
                    className="btn-icon-danger" 
                    onClick={async () => {
                      setMemberActionError(null);
                      try {
                        await removeMember(member.userId);
                      } catch (err) {
                        setMemberActionError(
                          err instanceof Error ? err.message : "Failed to remove member",
                        );
                      }
                    }}
                    title="Remove member"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {memberActionError && (
            <div className="chat-invite-error">{memberActionError}</div>
          )}

          {isOwner && (
            <div className="chat-invite-section">
              <h4>Invite Colleague</h4>
              <form onSubmit={handleInvite} className="chat-invite-form">
                <input
                  type="email"
                  placeholder="Email address"
                  className="chat-invite-input"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  disabled={isInviting}
                />
                <div className="chat-invite-row">
                  <select 
                    className="chat-invite-select"
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value as ChatRole)}
                    disabled={isInviting}
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={!inviteEmail.trim() || isInviting}>
                    {isInviting ? "..." : <UserPlus size={14} />}
                  </button>
                </div>
                {inviteError && <div className="chat-invite-error">{inviteError}</div>}
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
