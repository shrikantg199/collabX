"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { connectSocket } from "@/lib/socket";
import type { Workspace } from "@/types";

type MessageInputProps = {
  activeWorkspace: Workspace | null;
};

export default function MessageInput({ activeWorkspace }: MessageInputProps) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingWorkspaceIdRef = useRef<string | null>(null);
  const isTypingRef = useRef(false);

  function emitTypingStatus(workspaceId: string, isTyping: boolean) {
    const socket = connectSocket(window.localStorage.getItem("collabx_token") ?? "");

    socket.emit("typing-status", {
      workspaceId,
      isTyping,
    });

    isTypingRef.current = isTyping;
    typingWorkspaceIdRef.current = isTyping ? workspaceId : null;
  }

  function stopTyping(workspaceId?: string | null) {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    const targetWorkspaceId = workspaceId ?? typingWorkspaceIdRef.current;
    if (!targetWorkspaceId || !isTypingRef.current) {
      return;
    }

    emitTypingStatus(targetWorkspaceId, false);
  }

  function scheduleTypingStop(workspaceId: string) {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      stopTyping(workspaceId);
    }, 1500);
  }

  function handleTextChange(nextValue: string) {
    setText(nextValue);
    setError("");

    if (!activeWorkspace) {
      return;
    }

    if (!nextValue.trim()) {
      stopTyping(activeWorkspace._id);
      return;
    }

    if (
      !isTypingRef.current ||
      typingWorkspaceIdRef.current !== activeWorkspace._id
    ) {
      emitTypingStatus(activeWorkspace._id, true);
    }

    scheduleTypingStop(activeWorkspace._id);
  }

  useEffect(() => {
    const currentWorkspaceId = activeWorkspace?._id ?? null;

    if (
      typingWorkspaceIdRef.current &&
      typingWorkspaceIdRef.current !== currentWorkspaceId
    ) {
      stopTyping(typingWorkspaceIdRef.current);
    }
  }, [activeWorkspace?._id]);

  useEffect(() => {
    return () => {
      stopTyping();
    };
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    ) {
      return;
    }

    event.preventDefault();

    if (!text.trim() || !activeWorkspace || isSending) {
      return;
    }

    formRef.current?.requestSubmit();
  }

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

        stopTyping(activeWorkspace._id);
        setText("");
      }
    );
  }

  return (
    <form className="stack" onSubmit={handleSubmit} ref={formRef}>
      <textarea
        className="textarea"
        placeholder={
          activeWorkspace
            ? `Message ${activeWorkspace.name}...`
            : "Select a workspace to begin chatting"
        }
        value={text}
        onChange={(event) => handleTextChange(event.target.value)}
        onKeyDown={handleKeyDown}
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
