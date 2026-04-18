"use client";

import { FormEvent, useState } from "react";
import { connectSocket } from "@/lib/socket";
import type { Workspace } from "@/types";

type MessageInputProps = {
  activeWorkspace: Workspace | null;
};

export default function MessageInput({ activeWorkspace }: MessageInputProps) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeWorkspace || !text.trim()) {
      return;
    }

    setIsSending(true);
    setError("");

    const socket = connectSocket(window.localStorage.getItem("collabx_token") ?? "");

    socket.emit(
      "send-message",
      {
        workspaceId: activeWorkspace._id,
        text: text.trim(),
      },
      (response: { error?: string; ok?: boolean }) => {
        setIsSending(false);

        if (response.error || !response.ok) {
          setError(response.error ?? "Message could not be delivered.");
          return;
        }

        setText("");
      }
    );
  }

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <textarea
        className="textarea"
        placeholder={
          activeWorkspace
            ? `Message ${activeWorkspace.name}...`
            : "Select a workspace to begin chatting"
        }
        value={text}
        onChange={(event) => setText(event.target.value)}
        disabled={!activeWorkspace || isSending}
      />
      <div className="row wrap" style={{ justifyContent: "space-between" }}>
        {error ? <span className="error">{error}</span> : <span className="muted">Live via Socket.IO</span>}
        <button className="button" type="submit" disabled={!activeWorkspace || isSending}>
          {isSending ? "Sending..." : "Send Message"}
        </button>
      </div>
    </form>
  );
}
