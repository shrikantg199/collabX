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
    const socket = connectSocket(window.localStorage.getItem("collabx_token") ?? "");
    socket.emit("typing-status", { workspaceId, isTyping });
    isTypingRef.current = isTyping;
    typingWorkspaceIdRef.current = isTyping ? workspaceId : null;
  }

  function stopTyping(workspaceId?: string | null) {
    if (typingTimeoutRef.current) { clearTimeout(typingTimeoutRef.current); typingTimeoutRef.current = null; }
    const target = workspaceId ?? typingWorkspaceIdRef.current;
    if (!target || !isTypingRef.current) return;
    emitTypingStatus(target, false);
  }

  function scheduleTypingStop(workspaceId: string) {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => stopTyping(workspaceId), 1500);
  }

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 96) + "px";
  }

  function handleTextChange(nextValue: string) {
    setText(nextValue);
    setError("");
    autoResize();
    if (!activeWorkspace) return;
    if (!nextValue.trim()) { stopTyping(activeWorkspace._id); return; }
    if (!isTypingRef.current || typingWorkspaceIdRef.current !== activeWorkspace._id) {
      emitTypingStatus(activeWorkspace._id, true);
    }
    scheduleTypingStop(activeWorkspace._id);
  }

  useEffect(() => {
    const currentId = activeWorkspace?._id ?? null;
    if (typingWorkspaceIdRef.current && typingWorkspaceIdRef.current !== currentId) {
      stopTyping(typingWorkspaceIdRef.current);
    }
  }, [activeWorkspace?._id]);

  useEffect(() => () => { stopTyping(); }, []);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
    e.preventDefault();
    if (!text.trim() || !activeWorkspace || isSending) return;
    formRef.current?.requestSubmit();
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!activeWorkspace || !text.trim()) return;
    setIsSending(true);
    setError("");
    const socket = connectSocket(window.localStorage.getItem("collabx_token") ?? "");
    socket.emit(
      "send-message",
      { workspaceId: activeWorkspace._id, text: text.trim() },
      (response: { error?: string; ok?: boolean }) => {
        setIsSending(false);
        if (response.error || !response.ok) { setError(response.error ?? "Message could not be delivered."); return; }
        stopTyping(activeWorkspace._id);
        setText("");
        if (textareaRef.current) textareaRef.current.style.height = "auto";
      },
    );
  }

  const isDisabled = !activeWorkspace || isSending;

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-2">
      {/* Input container */}
      <div className={`flex items-end gap-2 bg-[#111118] border rounded-2xl px-3 py-2.5 transition-all duration-150 ${
        isDisabled ? "border-white/[0.04] opacity-60" : "border-white/[0.08] focus-within:border-emerald-500/30 focus-within:ring-2 focus-within:ring-emerald-500/20"
      }`}>
        <textarea
          ref={textareaRef}
          rows={1}
          className="flex-1 resize-none bg-transparent outline-none text-sm text-[#d0cec8] placeholder:text-[#3a3a4a] max-h-24 overflow-y-auto leading-relaxed"
          placeholder={
            activeWorkspace
              ? `Message ${activeWorkspace.name}...`
              : "Select a workspace to begin chatting"
          }
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isDisabled}
        />

        <button
          type="submit"
          disabled={isDisabled || !text.trim()}
          className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-400 text-[#060d0a] hover:bg-emerald-300 hover:shadow-lg hover:shadow-emerald-500/25 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
          title="Send message"
        >
          {isSending ? (
            <span className="w-3.5 h-3.5 border-2 border-[#060d0a]/30 border-t-[#060d0a] rounded-full animate-spin" />
          ) : (
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
            </svg>
          )}
        </button>
      </div>

      {/* Bottom hint / error */}
      <div className="px-1 min-h-[16px]">
        {error ? (
          <span className="text-[11px] text-red-400 flex items-center gap-1">
            <span>⚠</span> {error}
          </span>
        ) : (
          <span className="text-[11px] text-[#3a3a4a]">
            Enter to send · Shift+Enter for new line
          </span>
        )}
      </div>
    </form>
  );
}