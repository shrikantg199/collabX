"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import MessageInput from "@/components/MessageInput";
import { connectSocket } from "@/lib/socket";
import type { Message, TypingUser, Workspace } from "@/types";

type ChatBoxProps = {
  activeWorkspace: Workspace | null;
  messages: Message[];
  currentUserId: string;
  typingUsers: TypingUser[];
};

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitials(name?: string) {
  return (name || "A")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export default function ChatBox({
  activeWorkspace,
  messages,
  currentUserId,
  typingUsers,
}: ChatBoxProps) {
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const [editingMessageId, setEditingMessageId] = useState("");
  const [editingText, setEditingText] = useState("");
  const [error, setError] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState("");

  const typingText = useMemo(() => {
    if (typingUsers.length === 0) return "";
    if (typingUsers.length === 1) return `${typingUsers[0].name} is typing...`;
    if (typingUsers.length === 2)
      return `${typingUsers[0].name} and ${typingUsers[1].name} are typing...`;
    return `${typingUsers[0].name} and ${typingUsers.length - 1} others are typing...`;
  }, [typingUsers]);

  useEffect(() => {
    const container = messagesRef.current;
    if (!container) return;
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 120;
    if (isNearBottom) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (!editingMessageId) { setEditingText(""); setError(""); return; }
    const msg = messages.find((m) => m._id === editingMessageId);
    if (!msg) { setEditingMessageId(""); setEditingText(""); return; }
    setEditingText(msg.text);
  }, [editingMessageId, messages]);

  function startEditing(message: Message) {
    setEditingMessageId(message._id);
    setEditingText(message.text);
    setError("");
  }

  function cancelEditing() {
    setEditingMessageId("");
    setEditingText("");
    setError("");
  }

  function saveEdit() {
    if (!activeWorkspace || !editingText.trim()) {
      setError("Message text cannot be empty.");
      return;
    }
    setIsSavingEdit(true);
    const socket = connectSocket(window.localStorage.getItem("collabx_token") ?? "");
    socket.emit(
      "update-message",
      { workspaceId: activeWorkspace._id, messageId: editingMessageId, text: editingText.trim() },
      (res: { error?: string; ok?: boolean }) => {
        setIsSavingEdit(false);
        if (res.error || !res.ok) { setError(res.error ?? "Update failed."); return; }
        cancelEditing();
      },
    );
  }

  function deleteMessage(messageId: string) {
    if (!activeWorkspace || !confirm("Delete this message?")) return;
    setDeletingMessageId(messageId);
    const socket = connectSocket(window.localStorage.getItem("collabx_token") ?? "");
    socket.emit(
      "delete-message",
      { workspaceId: activeWorkspace._id, messageId },
      (res: { error?: string; ok?: boolean }) => {
        setDeletingMessageId("");
        if (res.error || !res.ok) setError(res.error ?? "Delete failed.");
      },
    );
  }

  return (
    <section className="flex flex-col h-full min-h-0 bg-[#0f0f14]">

      {/* MESSAGES */}
      <div
        ref={messagesRef}
        className="flex-1 overflow-y-auto px-5 py-5 space-y-5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/[0.06]"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-[#111118] border border-white/[0.06] flex items-center justify-center text-2xl">
              💬
            </div>
            <p className="text-sm text-[#4a4a5a] font-medium">
              {activeWorkspace ? "No messages yet. Start the conversation." : "Select a workspace to start chatting."}
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.user?._id === currentUserId;
            return (
              <div key={message._id} className={`flex gap-3 group ${isOwn ? "flex-row-reverse" : ""}`}>

                {/* Avatar */}
                {message.user?.photoUrl ? (
                  <img
                    src={message.user.photoUrl}
                    alt={message.user.name}
                    className="w-8 h-8 rounded-full object-cover ring-1 ring-white/[0.08] shrink-0 mt-0.5"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 flex items-center justify-center text-[#060d0a] text-[11px] font-black shrink-0 mt-0.5">
                    {getInitials(message.user?.name)}
                  </div>
                )}

                {/* Bubble */}
                <div className={`flex flex-col max-w-[85%] sm:max-w-[72%] ${isOwn ? "items-end" : "items-start"}`}>
                  {/* Meta */}
                  <div className={`flex items-center gap-2 mb-1 ${isOwn ? "flex-row-reverse" : ""}`}>
                    <span className="text-[11px] font-semibold text-[#6b6b7a]">
                      {isOwn ? "You" : (message.user?.name || "Anonymous")}
                    </span>
                    <span className="text-[10px] text-[#3a3a4a]">{formatTime(message.createdAt)}</span>
                    {message.updatedAt !== message.createdAt && (
                      <span className="text-[10px] text-[#3a3a4a] italic">edited</span>
                    )}
                  </div>

                  {/* Edit mode */}
                  {editingMessageId === message._id ? (
                    <div className="w-full space-y-2">
                      <textarea
                        className="w-full min-w-[260px] px-3 py-2.5 text-sm rounded-xl border border-emerald-500/30 bg-[#111118] text-[#d0cec8] placeholder:text-[#3a3a4a] focus:outline-none focus:ring-2 focus:ring-emerald-500/40 resize-none transition-all duration-150"
                        rows={3}
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(); }
                          if (e.key === "Escape") cancelEditing();
                        }}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={saveEdit}
                          disabled={isSavingEdit}
                          className="px-3 py-1.5 rounded-lg bg-emerald-400 text-[#060d0a] text-xs font-bold hover:bg-emerald-300 disabled:opacity-50 transition-all duration-150"
                        >
                          {isSavingEdit ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="px-3 py-1.5 rounded-lg bg-[#18181f] border border-white/[0.08] text-[#9898a8] text-xs font-semibold hover:text-white transition-all duration-150"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div
                        className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words flex flex-col gap-2 ${
                          isOwn
                            ? "bg-emerald-500/15 border border-emerald-500/20 text-[#d0cec8] rounded-tr-sm"
                            : "bg-[#111118] border border-white/[0.06] text-[#d0cec8] rounded-tl-sm"
                        }`}
                      >
                        {message.fileUrl && (
                          <div className="mb-1">
                            {message.fileType?.startsWith("image/") ? (
                              <a href={message.fileUrl} target="_blank" rel="noopener noreferrer" className="block relative group overflow-hidden rounded-xl border border-white/[0.06] bg-black/20">
                                <img 
                                  src={message.fileUrl} 
                                  alt="Attachment" 
                                  className="max-w-full h-auto max-h-[300px] object-contain transition-transform duration-300 group-hover:scale-[1.02]" 
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <span className="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-xs font-bold text-white border border-white/20">View Full Size</span>
                                </div>
                              </a>
                            ) : (
                              <a 
                                href={message.fileUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 rounded-xl bg-black/20 border border-white/[0.06] hover:bg-black/30 transition-all group"
                              >
                                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xl shrink-0">
                                  📄
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-[#d0cec8] truncate">Download Attachment</p>
                                  <p className="text-[10px] text-[#4a4a5a] font-bold uppercase tracking-widest">{message.fileType?.split("/")[1] || "FILE"}</p>
                                </div>
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6b6b7a] group-hover:text-emerald-400 transition-colors">
                                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              </a>
                            )}
                          </div>
                        )}
                        {message.text && <span>{message.text}</span>}
                      </div>

                      {/* Actions — show on hover, own messages only */}
                      {isOwn && (
                        <div className="flex gap-1.5 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          <button
                            onClick={() => startEditing(message)}
                            className="px-2.5 py-1 rounded-lg bg-[#18181f] border border-white/[0.06] text-[#6b6b7a] hover:text-[#d0cec8] hover:border-white/[0.1] text-[10px] font-semibold transition-all duration-150"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteMessage(message._id)}
                            disabled={deletingMessageId === message._id}
                            className="px-2.5 py-1 rounded-lg bg-red-500/[0.07] border border-red-500/20 text-red-400 hover:bg-red-500/15 text-[10px] font-semibold transition-all duration-150 disabled:opacity-50"
                          >
                            {deletingMessageId === message._id ? "..." : "Delete"}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* TYPING + ERROR */}
      <div className="px-5 shrink-0">
        {typingText && (
          <div className="flex items-center gap-2 py-2">
            <div className="flex gap-0.5 items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <span className="text-[11px] text-[#6b6b7a]">{typingText}</span>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 py-2 text-red-400 text-xs">
            <span>⚠</span> {error}
          </div>
        )}
      </div>

      {/* INPUT */}
      <div className="shrink-0 px-4 pb-4">
        <MessageInput activeWorkspace={activeWorkspace} />
      </div>
    </section>
  );
}