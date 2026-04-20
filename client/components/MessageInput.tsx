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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingWorkspaceIdRef = useRef<string | null>(null);
  const isTypingRef = useRef(false);

  function emitTypingStatus(workspaceId: string, isTyping: boolean) {
    const socket = connectSocket(
      window.localStorage.getItem("collabx_token") ?? "",
    );

    socket.emit("typing-status", { workspaceId, isTyping });

    isTypingRef.current = isTyping;
    typingWorkspaceIdRef.current = isTyping ? workspaceId : null;
  }

  function stopTyping(workspaceId?: string | null) {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    const targetWorkspaceId = workspaceId ?? typingWorkspaceIdRef.current;
    if (!targetWorkspaceId || !isTypingRef.current) return;

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

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;

    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 96) + "px"; // max ~4 lines
  }

  function handleTextChange(nextValue: string) {
    setText(nextValue);
    setError("");
    autoResize();

    if (!activeWorkspace) return;

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

    if (!text.trim() || !activeWorkspace || isSending) return;

    formRef.current?.requestSubmit();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeWorkspace || !text.trim()) return;

    setIsSending(true);
    setError("");

    const socket = connectSocket(
      window.localStorage.getItem("collabx_token") ?? "",
    );

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

        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
        }
      },
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="shrink-0  bg-white px-3 py-2 -mt-24"
    >
      {/* Input Container */}
      <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-xl px-2 py-2 focus-within:ring-2 focus-within:ring-emerald-400 transition">
        <textarea
          ref={textareaRef}
          rows={1}
          className="flex-1 resize-none bg-transparent outline-none text-sm placeholder:text-gray-400 max-h-24 overflow-y-auto px-1"
          placeholder={
            activeWorkspace
              ? `Message ${activeWorkspace.name}...`
              : "Select a workspace to begin chatting"
          }
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!activeWorkspace || isSending}
        />

        <button
          type="submit"
          disabled={!activeWorkspace || isSending}
          className="h-9 px-4 rounded-lg bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 active:scale-95 transition disabled:opacity-50 flex items-center justify-center"
        >
          {isSending ? <span className="animate-pulse">...</span> : "Send"}
        </button>
      </div>

      {/* Bottom Info */}
      <div className="flex items-center justify-between text-[11px] mt-1 px-1">
        {error ? (
          <span className="text-red-500">{error}</span>
        ) : (
          <span className="text-gray-400">
            Press Enter to send • Shift + Enter for new line
          </span>
        )}
      </div>
    </form>
  );
}
