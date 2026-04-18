"use client";

import { useEffect, useRef } from "react";
import MessageInput from "@/components/MessageInput";
import type { Message, Workspace } from "@/types";

type ChatBoxProps = {
  activeWorkspace: Workspace | null;
  messages: Message[];
};

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ChatBox({
  activeWorkspace,
  messages,
}: ChatBoxProps) {
  const messagesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = messagesRef.current;
    if (!container) {
      return;
    }

    container.scrollTop = container.scrollHeight;
  }, [messages]);

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
              <div className="message-meta">
                <span>{message.user?.name ?? "Anonymous"}</span>
                <span>{formatTime(message.createdAt)}</span>
              </div>
              <div>{message.text}</div>
            </article>
          ))
        )}
      </div>

      <MessageInput activeWorkspace={activeWorkspace} />
    </section>
  );
}
