"use client";

import axios from "axios";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { connectSocket } from "@/lib/socket";
import type { Workspace } from "@/types";

type EditorProps = {
  activeWorkspace: Workspace | null;
};

type DocumentUpdatedPayload = {
  workspaceId: string;
  content: string;
  updatedAt: string;
  userId: string;
  socketId?: string;
};

type DocumentTypingPayload = {
  workspaceId: string;
  isTyping: boolean;
  user: { _id: string; name: string; photoUrl?: string };
  socketId?: string;
};

function getRequestErrorMessage(error: unknown, fallbackMessage: string) {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    const msg = error.response?.data?.message?.trim();
    if (msg) return msg;
  }
  return fallbackMessage;
}

const statusConfig: Record<string, { dot: string; label: string }> = {
  Ready:                    { dot: "bg-emerald-400",         label: "Ready" },
  "Saving...":              { dot: "bg-yellow-400 animate-pulse", label: "Saving..." },
  Saved:                    { dot: "bg-emerald-400",         label: "Saved" },
  Synced:                   { dot: "bg-emerald-400",         label: "Synced" },
  "Remote changes waiting...": { dot: "bg-yellow-400 animate-pulse", label: "Incoming..." },
  "Save failed":            { dot: "bg-red-400",             label: "Save failed" },
  Offline:                  { dot: "bg-red-400",             label: "Offline" },
};

export default function Editor({ activeWorkspace }: EditorProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Ready");
  const [typingNotice, setTypingNotice] = useState("");

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queuedRemoteContentRef = useRef<string | null>(null);
  const isTypingRef = useRef(false);
  const activeWorkspaceIdRef = useRef("");
  const lastSavedContentRef = useRef("");

  useEffect(() => { activeWorkspaceIdRef.current = activeWorkspace?._id ?? ""; }, [activeWorkspace?._id]);

  useEffect(() => {
    const token = window.localStorage.getItem("collabx_token");
    if (!token || !activeWorkspace?._id) {
      setContent(""); setTypingNotice(""); setStatus("Ready"); return;
    }

    const workspaceId = activeWorkspace._id;
    const socket = connectSocket(token);

    async function loadDocument() {
      setLoading(true); setError(""); setTypingNotice("");
      queuedRemoteContentRef.current = null; isTypingRef.current = false;
      try {
        const { data } = await api.get(`/document/${workspaceId}`);
        if (activeWorkspaceIdRef.current !== workspaceId) return;
        const initial = data.document?.content ?? "";
        setContent(initial); lastSavedContentRef.current = initial; setStatus("Ready");
        socket.emit("join-document", { workspaceId }, (res: { error?: string }) => {
          if (res?.error && activeWorkspaceIdRef.current === workspaceId) setError(res.error);
        });
      } catch (e) {
        if (activeWorkspaceIdRef.current === workspaceId) {
          setError(getRequestErrorMessage(e, "We could not load the collaborative document."));
          setStatus("Offline");
        }
      } finally {
        if (activeWorkspaceIdRef.current === workspaceId) setLoading(false);
      }
    }

    function handleDocumentUpdated(payload: DocumentUpdatedPayload) {
      if (payload.workspaceId !== workspaceId || payload.socketId === socket.id) return;
      lastSavedContentRef.current = payload.content;
      if (isTypingRef.current) {
        queuedRemoteContentRef.current = payload.content;
        setStatus("Remote changes waiting...");
        return;
      }
      setContent(payload.content); setStatus("Synced");
    }

    function handleDocumentTyping(payload: DocumentTypingPayload) {
      if (payload.workspaceId !== workspaceId || payload.socketId === socket.id || !payload.user?._id) return;
      if (remoteTypingTimeoutRef.current) clearTimeout(remoteTypingTimeoutRef.current);
      if (!payload.isTyping) { setTypingNotice(""); return; }
      setTypingNotice(`${payload.user.name} is typing...`);
      remoteTypingTimeoutRef.current = setTimeout(() => setTypingNotice(""), 1200);
    }

    socket.on("document-updated", handleDocumentUpdated);
    socket.on("document-typing-updated", handleDocumentTyping);
    void loadDocument();

    return () => {
      socket.off("document-updated", handleDocumentUpdated);
      socket.off("document-typing-updated", handleDocumentTyping);
      socket.emit("leave-document", { workspaceId });
      [saveTimeoutRef, typingTimeoutRef, remoteTypingTimeoutRef].forEach((r) => {
        if (r.current) { clearTimeout(r.current); r.current = null; }
      });
      queuedRemoteContentRef.current = null; isTypingRef.current = false; setTypingNotice("");
    };
  }, [activeWorkspace?._id]);

  function flushQueuedRemoteContent() {
    if (queuedRemoteContentRef.current === null) return;
    setContent(queuedRemoteContentRef.current); queuedRemoteContentRef.current = null; setStatus("Synced");
  }

  function scheduleTypingStop(workspaceId: string) {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      const token = window.localStorage.getItem("collabx_token");
      if (!token) return;
      const socket = connectSocket(token);
      isTypingRef.current = false;
      socket.emit("document-typing", { workspaceId, isTyping: false });
      flushQueuedRemoteContent();
    }, 900);
  }

  function scheduleSave(workspaceId: string, nextContent: string) {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setStatus("Saving...");
    saveTimeoutRef.current = setTimeout(() => {
      const token = window.localStorage.getItem("collabx_token");
      if (!token) { setStatus("Offline"); return; }
      const socket = connectSocket(token);
      socket.emit(
        "edit-document",
        { workspaceId, content: nextContent },
        (res: { error?: string }) => {
          if (res?.error) { setError(res.error); setStatus("Save failed"); return; }
          lastSavedContentRef.current = nextContent; setStatus("Saved");
        },
      );
    }, 500);
  }

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    if (!activeWorkspace?._id) return;
    const nextContent = e.target.value;
    const token = window.localStorage.getItem("collabx_token");
    if (!token) return;
    const socket = connectSocket(token);
    setError(""); setContent(nextContent);
    isTypingRef.current = true;
    socket.emit("document-typing", { workspaceId: activeWorkspace._id, isTyping: true });
    scheduleTypingStop(activeWorkspace._id);
    scheduleSave(activeWorkspace._id, nextContent);
  }

  const statusMeta = statusConfig[status] ?? { dot: "bg-[#4a4a5a]", label: status };

  return (
    <section className="flex flex-col h-full bg-[#0f0f14]">

      {/* Editor header */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-white/[0.06] shrink-0">
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-bold text-white truncate">
            {activeWorkspace ? activeWorkspace.name : "No workspace selected"}
          </p>
          <p className="text-[9px] sm:text-[11px] text-[#4a4a5a] mt-0.5 truncate">
            {activeWorkspace ? "Collaborative document · autosaves" : "Select a workspace to load its shared document."}
          </p>
        </div>

        {/* Status chip */}
        <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-[#111118] border border-white/[0.06] shrink-0">
          <span className={`w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full shrink-0 ${statusMeta.dot}`} />
          <span className="text-[9px] sm:text-[11px] font-semibold text-[#9898a8]">{statusMeta.label}</span>
        </div>
      </div>

      {/* Typing notice */}
      {typingNotice && (
        <div className="px-5 py-2 shrink-0 flex items-center gap-2 border-b border-white/[0.04]">
          <div className="flex gap-0.5 items-center">
            <span className="w-1 h-1 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-1 h-1 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-1 h-1 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <span className="text-[11px] text-[#6b6b7a]">{typingNotice}</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-5 mt-3 shrink-0 flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-500/[0.07] border border-red-500/20 text-red-400 text-xs">
          <span className="shrink-0 mt-0.5">⚠</span> {error}
        </div>
      )}

      {/* Textarea or empty state */}
      {!activeWorkspace ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
          <div className="w-14 h-14 rounded-2xl bg-[#111118] border border-white/[0.06] flex items-center justify-center text-2xl">
            📝
          </div>
          <p className="text-sm text-[#4a4a5a] font-medium max-w-xs leading-relaxed">
            Choose a workspace to load its shared collaborative document.
          </p>
        </div>
      ) : (
        <textarea
          className="flex-1 w-full bg-transparent text-sm text-[#d0cec8] placeholder:text-[#3a3a4a] resize-none outline-none px-5 py-4 leading-relaxed font-mono scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/[0.06]"
          placeholder={loading ? "Loading document..." : "Start typing to collaborate in real time..."}
          value={content}
          onChange={handleChange}
          disabled={loading}
          spellCheck={false}
        />
      )}
    </section>
  );
}