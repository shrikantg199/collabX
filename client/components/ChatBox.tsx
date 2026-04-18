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
  const typingText = useMemo(() => {
    if (typingUsers.length === 0) {
      return "";
    }

    if (typingUsers.length === 1) {
      return `${typingUsers[0].name} is typing...`;
    }

    if (typingUsers.length === 2) {
      return `${typingUsers[0].name} and ${typingUsers[1].name} are typing...`;
    }

    return `${typingUsers[0].name} and ${typingUsers.length - 1} others are typing...`;
  }, [typingUsers]);

  useEffect(() => {
    const container = messagesRef.current;
    if (!container) {
      return;
    }

    container.scrollTop = container.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (!editingMessageId) {
      setEditingText("");
      setError("");
      return;
    }

    const message = messages.find((entry) => entry._id === editingMessageId);
    if (!message) {
      setEditingMessageId("");
      setEditingText("");
      return;
    }

    setEditingText(message.text);
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
    if (!activeWorkspace || !editingMessageId || !editingText.trim()) {
      setError("Message text cannot be empty.");
      return;
    }

    setIsSavingEdit(true);
    setError("");

    const socket = connectSocket(window.localStorage.getItem("collabx_token") ?? "");
    socket.emit(
      "update-message",
      {
        workspaceId: activeWorkspace._id,
        messageId: editingMessageId,
        text: editingText.trim(),
      },
      (response: { error?: string; ok?: boolean }) => {
        setIsSavingEdit(false);

        if (response.error || !response.ok) {
          setError(response.error ?? "Message could not be updated.");
          return;
        }

        cancelEditing();
      }
    );
  }

  function deleteMessage(messageId: string) {
    if (!activeWorkspace || !window.confirm("Delete this message?")) {
      return;
    }

    setDeletingMessageId(messageId);
    setError("");

    const socket = connectSocket(window.localStorage.getItem("collabx_token") ?? "");
    socket.emit(
      "delete-message",
      {
        workspaceId: activeWorkspace._id,
        messageId,
      },
      (response: { error?: string; ok?: boolean }) => {
        setDeletingMessageId("");

        if (response.error || !response.ok) {
          setError(response.error ?? "Message could not be deleted.");
        }
      }
    );
  }

  return (
    <section className="panel chat-shell">
      <div className="row wrap" style={{ justifyContent: "space-between" }}>
        <div>
          <h2 style={{ marginBottom: 6 }}>
            {activeWorkspace ? activeWorkspace.name : "Pick a workspace"}
          </h2>
          <p className="muted" style={{ margin: 0 }}>
            {activeWorkspace
              ? "Messages sync live with everyone in this room."
              : "Create or select a workspace to start chatting."}
          </p>
        </div>
      </div>

      <div className="messages" ref={messagesRef}>
        {messages.length === 0 ? (
          <div className="message">
            <div className="message-meta">
              <span>CollabX Bot</span>
              <span>Now</span>
            </div>
            <div>
              {activeWorkspace
                ? "No messages yet. Send the first update to bring the room to life."
                : "Your live chat will appear here once you join a workspace."}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <article className="message" key={message._id}>
              <div className="message-row">
                {message.user?.photoUrl ? (
                  <img
                    className="message-avatar"
                    src={message.user.photoUrl}
                    alt={`${message.user.name ?? "User"} avatar`}
                  />
                ) : (
                  <div className="message-avatar message-avatar-fallback">
                    {getInitials(message.user?.name)}
                  </div>
                )}
                <div className="message-body">
                  <div className="message-meta">
                    <span>
                      {message.user?.name ?? "Anonymous"}
                      {message.updatedAt !== message.createdAt ? " (edited)" : ""}
                    </span>
                    <span>{formatTime(message.createdAt)}</span>
                  </div>
                  {editingMessageId === message._id ? (
                    <div className="stack">
                      <textarea
                        className="textarea message-edit-input"
                        value={editingText}
                        onChange={(event) => setEditingText(event.target.value)}
                        disabled={isSavingEdit}
                      />
                      <div className="message-actions">
                        <button
                          className="message-action"
                          type="button"
                          onClick={saveEdit}
                          disabled={isSavingEdit}
                        >
                          {isSavingEdit ? "Saving..." : "Save"}
                        </button>
                        <button
                          className="message-action secondary"
                          type="button"
                          onClick={cancelEditing}
                          disabled={isSavingEdit}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>{message.text}</div>
                      {message.user?._id === currentUserId ? (
                        <div className="message-actions">
                          <button
                            className="message-action secondary"
                            type="button"
                            onClick={() => startEditing(message)}
                          >
                            Edit
                          </button>
                          <button
                            className="message-action danger"
                            type="button"
                            onClick={() => deleteMessage(message._id)}
                            disabled={deletingMessageId === message._id}
                          >
                            {deletingMessageId === message._id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      {typingText ? <div className="typing-indicator">{typingText}</div> : null}
      {error ? <div className="error">{error}</div> : null}

      <MessageInput activeWorkspace={activeWorkspace} />
    </section>
  );
}
