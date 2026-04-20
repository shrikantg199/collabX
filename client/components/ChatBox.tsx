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
    .map((part) => part[0]?.toUpperCase() ?? "")
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

  // ✅ typing indicator
  const typingText = useMemo(() => {
    if (typingUsers.length === 0) return "";
    if (typingUsers.length === 1) return `${typingUsers[0].name} is typing...`;
    if (typingUsers.length === 2)
      return `${typingUsers[0].name} and ${typingUsers[1].name} are typing...`;
    return `${typingUsers[0].name} and ${typingUsers.length - 1} others are typing...`;
  }, [typingUsers]);

  // ✅ Smart auto-scroll (WhatsApp-like)
  useEffect(() => {
    const container = messagesRef.current;
    if (!container) return;

    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      120;

    if (isNearBottom) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  // ✅ sync editing text
  useEffect(() => {
    if (!editingMessageId) {
      setEditingText("");
      setError("");
      return;
    }

    const msg = messages.find((m) => m._id === editingMessageId);
    if (!msg) {
      setEditingMessageId("");
      setEditingText("");
      return;
    }

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

    const socket = connectSocket(
      window.localStorage.getItem("collabx_token") ?? "",
    );

    socket.emit(
      "update-message",
      {
        workspaceId: activeWorkspace._id,
        messageId: editingMessageId,
        text: editingText.trim(),
      },
      (res: { error?: string; ok?: boolean }) => {
        setIsSavingEdit(false);
        if (res.error || !res.ok) {
          setError(res.error ?? "Update failed.");
          return;
        }
        cancelEditing();
      },
    );
  }

  function deleteMessage(messageId: string) {
    if (!activeWorkspace || !confirm("Delete this message?")) return;

    setDeletingMessageId(messageId);

    const socket = connectSocket(
      window.localStorage.getItem("collabx_token") ?? "",
    );

    socket.emit(
      "delete-message",
      {
        workspaceId: activeWorkspace._id,
        messageId,
      },
      (res: { error?: string; ok?: boolean }) => {
        setDeletingMessageId("");
        if (res.error || !res.ok) {
          setError(res.error ?? "Delete failed.");
        }
      },
    );
  }

  return (
    <section className="flex flex-col h-full min-h-0 bg-white rounded-xl ">
      {/* HEADER */}
      <div className="p-4 shrink-0">
        <h2 className="font-semibold text-lg">
          {activeWorkspace ? activeWorkspace.name : "Pick a workspace"}
        </h2>
        <p className="text-sm text-gray-500">
          {activeWorkspace
            ? "Messages sync live in this room."
            : "Select a workspace to start chatting."}
        </p>
      </div>

      {/* MESSAGES */}
      <div
        ref={messagesRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-4 pb-28"
      >
        {messages.length === 0 ? (
          <div className="text-sm text-gray-500">
            {activeWorkspace ? "No messages yet." : "Chat will appear here."}
          </div>
        ) : (
          messages.map((message) => (
            <div key={message._id} className="flex gap-3">
              {/* Avatar */}
              {message.user?.photoUrl ? (
                <img
                  src={message.user.photoUrl}
                  className="w-9 h-9 rounded-full"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                  {getInitials(message.user?.name)}
                </div>
              )}

              {/* Content */}
              <div className="flex-1">
                <div className="text-xs text-gray-500 flex justify-between">
                  <span>
                    {message.user?.name || "Anonymous"}
                    {message.updatedAt !== message.createdAt && " (edited)"}
                  </span>
                  <span>{formatTime(message.createdAt)}</span>
                </div>

                {editingMessageId === message._id ? (
                  <div className="mt-2">
                    <textarea
                      className="w-full border rounded-md p-2 text-sm"
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                    />

                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={saveEdit}
                        className="px-3 py-1 text-xs bg-green-500 text-white rounded"
                      >
                        {isSavingEdit ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="px-3 py-1 text-xs bg-gray-200 rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mt-1">{message.text}</div>

                    {message.user?._id === currentUserId && (
                      <div className="flex gap-2 mt-1 text-xs">
                        <button onClick={() => startEditing(message)}>
                          Edit
                        </button>
                        <button
                          onClick={() => deleteMessage(message._id)}
                          disabled={deletingMessageId === message._id}
                        >
                          {deletingMessageId === message._id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* TYPING */}
      {typingText && (
        <div className="px-4 py-2 text-xs text-gray-500 border-t">
          {typingText}
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div className="px-4 py-2 text-xs text-red-500 border-t">{error}</div>
      )}

      {/* INPUT (sticky) */}
      <div className="sticky bottom-0 bg-white border-t p-3">
        <MessageInput activeWorkspace={activeWorkspace} />
      </div>
    </section>
  );
}
