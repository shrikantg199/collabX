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
  user: {
    _id: string;
    name: string;
    photoUrl?: string;
  };
  socketId?: string;
};

function getRequestErrorMessage(error: unknown, fallbackMessage: string) {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    const serverMessage = error.response?.data?.message?.trim();

    if (serverMessage) {
      return serverMessage;
    }
  }

  return fallbackMessage;
}

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

  useEffect(() => {
    activeWorkspaceIdRef.current = activeWorkspace?._id ?? "";
  }, [activeWorkspace?._id]);

  useEffect(() => {
    const token = window.localStorage.getItem("collabx_token");

    if (!token || !activeWorkspace?._id) {
      setContent("");
      setTypingNotice("");
      setStatus("Ready");
      return;
    }

    const workspaceId = activeWorkspace._id;
    const socket = connectSocket(token);

    async function loadDocument() {
      setLoading(true);
      setError("");
      setTypingNotice("");
      queuedRemoteContentRef.current = null;
      isTypingRef.current = false;

      try {
        const { data } = await api.get(`/document/${workspaceId}`);

        if (activeWorkspaceIdRef.current !== workspaceId) {
          return;
        }

        const initialContent = data.document?.content ?? "";
        setContent(initialContent);
        lastSavedContentRef.current = initialContent;
        setStatus("Ready");

        socket.emit("join-document", { workspaceId }, (response: { error?: string }) => {
          if (response?.error && activeWorkspaceIdRef.current === workspaceId) {
            setError(response.error);
          }
        });
      } catch (loadError) {
        if (activeWorkspaceIdRef.current === workspaceId) {
          setError(
            getRequestErrorMessage(loadError, "We could not load the collaborative document."),
          );
          setStatus("Offline");
        }
      } finally {
        if (activeWorkspaceIdRef.current === workspaceId) {
          setLoading(false);
        }
      }
    }

    function handleDocumentUpdated(payload: DocumentUpdatedPayload) {
      if (payload.workspaceId !== workspaceId || payload.socketId === socket.id) {
        return;
      }

      lastSavedContentRef.current = payload.content;

      if (isTypingRef.current) {
        queuedRemoteContentRef.current = payload.content;
        setStatus("Remote changes waiting...");
        return;
      }

      setContent(payload.content);
      setStatus("Synced");
    }

    function handleDocumentTyping(payload: DocumentTypingPayload) {
      if (
        payload.workspaceId !== workspaceId ||
        payload.socketId === socket.id ||
        !payload.user?._id
      ) {
        return;
      }

      if (remoteTypingTimeoutRef.current) {
        clearTimeout(remoteTypingTimeoutRef.current);
      }

      if (!payload.isTyping) {
        setTypingNotice("");
        return;
      }

      setTypingNotice(`${payload.user.name} is typing...`);
      remoteTypingTimeoutRef.current = setTimeout(() => {
        setTypingNotice("");
      }, 1200);
    }

    socket.on("document-updated", handleDocumentUpdated);
    socket.on("document-typing-updated", handleDocumentTyping);

    void loadDocument();

    return () => {
      socket.off("document-updated", handleDocumentUpdated);
      socket.off("document-typing-updated", handleDocumentTyping);
      socket.emit("leave-document", { workspaceId });

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      if (remoteTypingTimeoutRef.current) {
        clearTimeout(remoteTypingTimeoutRef.current);
      }

      queuedRemoteContentRef.current = null;
      isTypingRef.current = false;
      setTypingNotice("");
    };
  }, [activeWorkspace?._id]);

  function flushQueuedRemoteContent() {
    if (queuedRemoteContentRef.current === null) {
      return;
    }

    setContent(queuedRemoteContentRef.current);
    queuedRemoteContentRef.current = null;
    setStatus("Synced");
  }

  function scheduleTypingStop(workspaceId: string) {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      const token = window.localStorage.getItem("collabx_token");
      if (!token) {
        return;
      }

      const socket = connectSocket(token);
      isTypingRef.current = false;
      socket.emit("document-typing", { workspaceId, isTyping: false });
      flushQueuedRemoteContent();
    }, 900);
  }

  function scheduleSave(workspaceId: string, nextContent: string) {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setStatus("Saving...");

    saveTimeoutRef.current = setTimeout(() => {
      const token = window.localStorage.getItem("collabx_token");
      if (!token) {
        setStatus("Offline");
        return;
      }

      const socket = connectSocket(token);
      socket.emit(
        "edit-document",
        {
          workspaceId,
          content: nextContent,
        },
        (response: { error?: string }) => {
          if (response?.error) {
            setError(response.error);
            setStatus("Save failed");
            return;
          }

          lastSavedContentRef.current = nextContent;
          setStatus("Saved");
        },
      );
    }, 500);
  }

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    if (!activeWorkspace?._id) {
      return;
    }

    const nextContent = event.target.value;
    const token = window.localStorage.getItem("collabx_token");
    if (!token) {
      return;
    }

    const socket = connectSocket(token);

    setError("");
    setContent(nextContent);
    isTypingRef.current = true;
    socket.emit("document-typing", {
      workspaceId: activeWorkspace._id,
      isTyping: true,
    });

    scheduleTypingStop(activeWorkspace._id);
    scheduleSave(activeWorkspace._id, nextContent);
  }

  return (
    <section className="panel editor-shell">
      <div className="row wrap" style={{ justifyContent: "space-between" }}>
        <div>
          <h3 style={{ marginBottom: 8 }}>Workspace Editor</h3>
          <p className="muted" style={{ margin: 0 }}>
            {activeWorkspace
              ? `Editing live in ${activeWorkspace.name}`
              : "Select a workspace to start editing."}
          </p>
        </div>
        <span className="workspace-chip">{status}</span>
      </div>

      {!activeWorkspace ? (
        <div className="editor-hint">
          <strong>No workspace selected</strong>
          <p style={{ marginBottom: 0 }}>
            Choose a workspace to load its shared document.
          </p>
        </div>
      ) : (
        <>
          <div className="editor-meta">
            <span className="muted">
              Autosave runs every 500ms using last-write-wins.
            </span>
            <span className="typing-indicator">{typingNotice}</span>
          </div>

          {error ? <p className="error">{error}</p> : null}

          <textarea
            className="textarea editor-textarea"
            placeholder={loading ? "Loading document..." : "Start typing with your workspace..."}
            value={content}
            onChange={handleChange}
            disabled={loading}
          />
        </>
      )}
    </section>
  );
}
