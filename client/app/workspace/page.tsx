"use client";

import axios from "axios";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ChatBox from "@/components/ChatBox";
import Editor from "@/components/Editor";
import api from "@/lib/api";
import { connectSocket, disconnectSocket } from "@/lib/socket";
import type { Message, TypingUser, User, Workspace } from "@/types";

type ToastNotification = {
  id: string;
  workspaceId: string;
  title: string;
  body: string;
};

function getRequestErrorMessage(
  error: unknown,
  fallbackMessage: string,
) {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    const serverMessage = error.response?.data?.message?.trim();

    if (serverMessage) {
      return serverMessage;
    }

    if (!error.response) {
      return "The app could not reach the API. Make sure the server is still running.";
    }
  }

  return fallbackMessage;
}

export default function WorkspacePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceCode, setWorkspaceCode] = useState("");
  const [profileName, setProfileName] = useState("");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [copiedWorkspaceCode, setCopiedWorkspaceCode] = useState("");
  const typingTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const toastTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeWorkspaceIdRef = useRef("");
  const userIdRef = useRef("");
  const workspacesRef = useRef<Workspace[]>([]);

  const activeWorkspace = useMemo(
    () =>
      workspaces.find((workspace) => workspace._id === activeWorkspaceId) ??
      null,
    [activeWorkspaceId, workspaces],
  );
  const avatarInitials = useMemo(() => {
    const source = profileName || user?.name || "CX";

    return source
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }, [profileName, user?.name]);

  function clearUnreadCount(workspaceId: string) {
    if (!workspaceId) {
      return;
    }

    setUnreadCounts((current) => {
      if (!current[workspaceId]) {
        return current;
      }

      return {
        ...current,
        [workspaceId]: 0,
      };
    });
  }

  function removeToast(toastId: string) {
    const timeoutId = toastTimeoutsRef.current[toastId];
    if (timeoutId) {
      clearTimeout(timeoutId);
      delete toastTimeoutsRef.current[toastId];
    }

    setToasts((current) => current.filter((toast) => toast.id !== toastId));
  }

  function addToast(workspaceId: string, title: string, body: string) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    setToasts((current) => [
      ...current.slice(-2),
      { id, workspaceId, title, body },
    ]);

    toastTimeoutsRef.current[id] = setTimeout(() => {
      removeToast(id);
    }, 4000);
  }

  function maybeShowBrowserNotification(message: Message) {
    if (
      typeof window === "undefined" ||
      typeof Notification === "undefined" ||
      Notification.permission !== "granted" ||
      !document.hidden
    ) {
      return;
    }

    const workspaceName =
      workspacesRef.current.find(
        (workspace) => workspace._id === message.workspace,
      )?.name ?? "Workspace";

    const notification = new Notification(
      `${message.user?.name ?? "Someone"} in ${workspaceName}`,
      {
        body: message.text,
        icon: message.user?.photoUrl || undefined,
        tag: `workspace-${message.workspace}`,
      },
    );

    notification.onclick = () => {
      window.focus();
      setActiveWorkspaceId(message.workspace);
      clearUnreadCount(message.workspace);
      notification.close();
    };
  }

  useEffect(() => {
    activeWorkspaceIdRef.current = activeWorkspaceId;
  }, [activeWorkspaceId]);

  useEffect(() => {
    userIdRef.current = user?._id ?? "";
  }, [user?._id]);

  useEffect(() => {
    workspacesRef.current = workspaces;
  }, [workspaces]);

  useEffect(() => {
    const token = window.localStorage.getItem("collabx_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    async function bootstrap() {
      try {
        const [{ data: me }, { data: workspaceData }] = await Promise.all([
          api.get("/auth/me"),
          api.get("/workspaces"),
        ]);
        setUser(me.user);
        setProfileName(me.user.name);
        setProfilePhotoUrl(me.user.photoUrl ?? "");
        setWorkspaces(workspaceData.workspaces);
        setActiveWorkspaceId(workspaceData.workspaces[0]?._id ?? "");

        const socket = connectSocket(token ?? "");
        socket.off("new-message");
        socket.off("message-updated");
        socket.off("message-deleted");
        socket.off("typing-status");
        socket.on("new-message", (message: Message) => {
          const isOwnMessage = message.user?._id === userIdRef.current;
          const isActiveWorkspace =
            message.workspace === activeWorkspaceIdRef.current;
          const shouldMarkUnread = !isOwnMessage && (!isActiveWorkspace || document.hidden);
          const shouldToast = !isOwnMessage && !document.hidden && !isActiveWorkspace;

          if (isActiveWorkspace) {
            setMessages((current) => {
              const alreadyExists = current.some(
                (entry) => entry._id === message._id,
              );
              return alreadyExists ? current : [...current, message];
            });
          }

          if (shouldMarkUnread) {
            setUnreadCounts((current) => ({
              ...current,
              [message.workspace]: (current[message.workspace] ?? 0) + 1,
            }));
          }

          if (shouldToast) {
            const workspaceName =
              workspacesRef.current.find(
                (workspace) => workspace._id === message.workspace,
              )?.name ?? "Workspace";

            addToast(
              message.workspace,
              `${message.user?.name ?? "Someone"} in ${workspaceName}`,
              message.text,
            );
          }

          if (!isOwnMessage) {
            maybeShowBrowserNotification(message);
          }
        });
        socket.on("message-updated", (message: Message) => {
          if (message.workspace !== activeWorkspaceIdRef.current) {
            return;
          }

          setMessages((current) =>
            current.map((entry) =>
              entry._id === message._id ? message : entry,
            ),
          );
        });
        socket.on(
          "message-deleted",
          ({
            workspaceId,
            messageId,
          }: {
            workspaceId: string;
            messageId: string;
          }) => {
            if (workspaceId !== activeWorkspaceIdRef.current) {
              return;
            }

            setMessages((current) =>
              current.filter((entry) => entry._id !== messageId),
            );
          },
        );
        socket.on(
          "typing-status",
          ({
            workspaceId,
            isTyping,
            user: typingUser,
          }: {
            workspaceId: string;
            isTyping: boolean;
            user: TypingUser;
          }) => {
            if (
              !typingUser?._id ||
              typingUser._id === userIdRef.current ||
              workspaceId !== activeWorkspaceIdRef.current
            ) {
              return;
            }

            const existingTimeout = typingTimeoutsRef.current[typingUser._id];
            if (existingTimeout) {
              clearTimeout(existingTimeout);
              delete typingTimeoutsRef.current[typingUser._id];
            }

            if (!isTyping) {
              setTypingUsers((current) =>
                current.filter((entry) => entry._id !== typingUser._id),
              );
              return;
            }

            setTypingUsers((current) => {
              const exists = current.some(
                (entry) => entry._id === typingUser._id,
              );

              if (exists) {
                return current.map((entry) =>
                  entry._id === typingUser._id ? typingUser : entry,
                );
              }

              return [...current, typingUser];
            });

            typingTimeoutsRef.current[typingUser._id] = setTimeout(() => {
              setTypingUsers((current) =>
                current.filter((entry) => entry._id !== typingUser._id),
              );
              delete typingTimeoutsRef.current[typingUser._id];
            }, 2500);
          },
        );
      } catch {
        window.localStorage.removeItem("collabx_token");
        window.localStorage.removeItem("collabx_user");
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    }

    bootstrap();

    return () => {
      Object.values(typingTimeoutsRef.current).forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      typingTimeoutsRef.current = {};
      Object.values(toastTimeoutsRef.current).forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      toastTimeoutsRef.current = {};
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      disconnectSocket();
    };
  }, [router]);

  useEffect(() => {
    if (!activeWorkspaceId) {
      setMessages([]);
      setTypingUsers([]);
      return;
    }

    setTypingUsers([]);
    Object.values(typingTimeoutsRef.current).forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    typingTimeoutsRef.current = {};

    async function loadMessages() {
      try {
        const { data } = await api.get(`/messages/${activeWorkspaceId}`);
        setMessages(data.messages);

        const socket = connectSocket(
          window.localStorage.getItem("collabx_token") ?? "",
        );
        socket.emit(
          "join-workspace",
          { workspaceId: activeWorkspaceId },
          (response: { error?: string }) => {
            if (response?.error) {
              setError(response.error);
            }
          },
        );
      } catch {
        setError("We could not load workspace messages.");
      }
    }

    loadMessages();
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (!workspaces.length) {
      return;
    }

    const socket = connectSocket(window.localStorage.getItem("collabx_token") ?? "");

    workspaces.forEach((workspace) => {
      socket.emit("join-workspace", { workspaceId: workspace._id });
    });
  }, [workspaces]);

  useEffect(() => {
    if (!activeWorkspaceId || document.hidden) {
      return;
    }

    clearUnreadCount(activeWorkspaceId);
  }, [activeWorkspaceId]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (!document.hidden && activeWorkspaceIdRef.current) {
        clearUnreadCount(activeWorkspaceIdRef.current);
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (typeof Notification === "undefined" || Notification.permission !== "default") {
      return;
    }

    Notification.requestPermission().catch(() => {
      return;
    });
  }, []);

  async function createWorkspace() {
    if (!workspaceName.trim()) {
      return;
    }

    setError("");

    try {
      const { data } = await api.post("/workspaces", {
        name: workspaceName.trim(),
      });

      setWorkspaces((current) => [data.workspace, ...current]);
      setActiveWorkspaceId(data.workspace._id);
      setWorkspaceName("");
    } catch {
      setError("Workspace creation failed. Please try again.");
    }
  }

  async function joinWorkspace() {
    if (!workspaceCode.trim()) {
      return;
    }

    setError("");

    try {
      const { data } = await api.post("/workspaces/join", {
        code: workspaceCode.trim().toUpperCase(),
      });

      setWorkspaces((current) => {
        const exists = current.some(
          (workspace) => workspace._id === data.workspace._id,
        );
        return exists ? current : [data.workspace, ...current];
      });
      setActiveWorkspaceId(data.workspace._id);
      setWorkspaceCode("");
    } catch {
      setError(
        "We could not join that workspace. Check the code and try again.",
      );
    }
  }

  async function updateProfile() {
    const trimmedName = profileName.trim();
    const trimmedPhotoUrl = profilePhotoUrl.trim();

    if (!trimmedName) {
      setProfileError("Please enter a name before saving.");
      setProfileSuccess("");
      return;
    }

    setIsSavingProfile(true);
    setProfileError("");
    setProfileSuccess("");

    try {
      const { data } = await api.put("/auth/profile", {
        name: trimmedName,
        photoUrl: trimmedPhotoUrl,
      });

      setUser(data.user);
      setProfileName(data.user.name);
      setProfilePhotoUrl(data.user.photoUrl ?? "");
      setMessages((current) =>
        current.map((message) =>
          message.user?._id === data.user._id
            ? {
                ...message,
                user: {
                  ...message.user,
                  name: data.user.name,
                  photoUrl: data.user.photoUrl,
                },
              }
            : message,
        ),
      );
      window.localStorage.setItem("collabx_user", JSON.stringify(data.user));
      setProfileSuccess("Profile updated.");
    } catch (error) {
      setProfileError(
        getRequestErrorMessage(error, "We could not update your name yet."),
      );
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleProfilePhotoUpload(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setIsUploadingPhoto(true);
    setProfileError("");
    setProfileSuccess("");

    try {
      const formData = new FormData();
      formData.append("photo", file);

      const { data } = await api.post("/auth/profile-photo", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setProfilePhotoUrl(data.photoUrl);
      setProfileSuccess("Photo uploaded. Save Profile to apply it.");
    } catch (error) {
      setProfileError(
        getRequestErrorMessage(error, "We could not upload your photo yet."),
      );
    } finally {
      setIsUploadingPhoto(false);
      event.target.value = "";
    }
  }

  async function updatePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Fill in all password fields before saving.");
      setPasswordSuccess("");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      setPasswordSuccess("");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirm password must match.");
      setPasswordSuccess("");
      return;
    }

    setIsSavingPassword(true);
    setPasswordError("");
    setPasswordSuccess("");

    try {
      await api.put("/auth/password", {
        currentPassword,
        newPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess("Password updated.");
    } catch (error) {
      setPasswordError(
        getRequestErrorMessage(error, "We could not change your password yet."),
      );
    } finally {
      setIsSavingPassword(false);
    }
  }

  function handleLogout() {
    disconnectSocket();
    window.localStorage.removeItem("collabx_token");
    window.localStorage.removeItem("collabx_user");
    router.replace("/login");
  }

  async function copyWorkspaceCode(code: string) {
    if (!code || typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      setCopiedWorkspaceCode(code);

      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }

      copyTimeoutRef.current = setTimeout(() => {
        setCopiedWorkspaceCode("");
      }, 1800);
    } catch {
      setError("We could not copy the invite code.");
    }
  }

  if (loading) {
    return (
      <main className="shell">
        <div className="panel workspace-layout">
          <p className="muted">Loading your workspace...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="shell">
      <div className="workspace-layout">
        <header className="workspace-header panel">
          <div>
            <span className="eyebrow">CollabX Workspace</span>
            <h1 style={{ marginBottom: 8 }}>
              {user ? `Hi, ${user.name}` : "Workspace"}
            </h1>
            <p className="muted" style={{ margin: 0 }}>
              Create a workspace, share the invite code, and chat live with
              everyone in the room.
            </p>
          </div>

          <div className="row wrap">
            {activeWorkspace ? (
              <div className="code-badge">
                <span>Code: {activeWorkspace.code}</span>
                <button
                  type="button"
                  className="code-copy-button"
                  onClick={() => copyWorkspaceCode(activeWorkspace.code)}
                  aria-label={`Copy invite code ${activeWorkspace.code}`}
                  title="Copy invite code"
                >
                  {copiedWorkspaceCode === activeWorkspace.code ? (
                    <span className="code-copy-status">Copied</span>
                  ) : (
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="code-copy-icon"
                    >
                      <path
                        d="M9 9a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2V9Z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M5 15H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              </div>
            ) : null}
            <button className="button secondary" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        <div className="workspace-grid">
          <aside className="workspace-sidebar">
            <section className="panel stack">
              <div
                className="row wrap"
                style={{ justifyContent: "space-between" }}
              >
                <h3>Profile details</h3>
                <span className="workspace-chip">Account</span>
              </div>
              <div className="profile-summary">
                {profilePhotoUrl ? (
                  <img
                    className="profile-avatar"
                    src={profilePhotoUrl}
                    alt={
                      profileName ? `${profileName} avatar` : "Profile avatar"
                    }
                  />
                ) : (
                  <div className="profile-avatar profile-avatar-fallback">
                    {avatarInitials}
                  </div>
                )}
                <div className="stack" style={{ gap: 6 }}>
                  <strong>{user?.name ?? "CollabX User"}</strong>
                  <span className="muted">{user?.email ?? ""}</span>
                </div>
              </div>
              <input
                className="input"
                placeholder="Your display name"
                value={profileName}
                onChange={(event) => setProfileName(event.target.value)}
              />
              <input
                className="input"
                placeholder="Photo URL"
                value={profilePhotoUrl}
                onChange={(event) => setProfilePhotoUrl(event.target.value)}
              />
              <label className="button secondary" style={{ textAlign: "center" }}>
                {isUploadingPhoto ? "Uploading..." : "Upload Photo"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePhotoUpload}
                  disabled={isUploadingPhoto}
                  style={{ display: "none" }}
                />
              </label>
              <input
                className="input"
                value={user?.email ?? ""}
                disabled
                readOnly
              />
              <button
                className="button secondary"
                onClick={updateProfile}
                disabled={isSavingProfile}
              >
                {isSavingProfile ? "Saving..." : "Save Profile"}
              </button>
              {profileError ? <p className="error">{profileError}</p> : null}
              {profileSuccess ? (
                <p className="success">{profileSuccess}</p>
              ) : null}
            </section>

            <section className="panel stack">
              <div
                className="row wrap"
                style={{ justifyContent: "space-between" }}
              >
                <h3>Change password</h3>
                <span className="workspace-chip">Security</span>
              </div>
              <input
                className="input"
                type="password"
                placeholder="Current password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
              <input
                className="input"
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
              <input
                className="input"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
              <button
                className="button secondary"
                onClick={updatePassword}
                disabled={isSavingPassword}
              >
                {isSavingPassword ? "Saving..." : "Update Password"}
              </button>
              {passwordError ? <p className="error">{passwordError}</p> : null}
              {passwordSuccess ? (
                <p className="success">{passwordSuccess}</p>
              ) : null}
            </section>

            <section className="panel stack">
              <h3>Start a workspace</h3>
              <input
                className="input"
                placeholder="Sprint planning"
                value={workspaceName}
                onChange={(event) => setWorkspaceName(event.target.value)}
              />
              <button className="button" onClick={createWorkspace}>
                Create Workspace
              </button>
            </section>

            <section className="panel stack">
              <h3>Join with a code</h3>
              <input
                className="input"
                placeholder="AB12CD"
                value={workspaceCode}
                onChange={(event) => setWorkspaceCode(event.target.value)}
              />
              <button className="button warn" onClick={joinWorkspace}>
                Join Workspace
              </button>
            </section>

            <section className="panel stack">
              <div
                className="row wrap"
                style={{ justifyContent: "space-between" }}
              >
                <h3>Your workspaces</h3>
                <span className="workspace-chip">
                  {workspaces.length} total
                </span>
              </div>
              <div className="workspace-list">
                {workspaces.map((workspace) => (
                  <button
                    key={workspace._id}
                    className={`workspace-item ${
                      workspace._id === activeWorkspaceId ? "active" : ""
                    }`}
                    onClick={() => setActiveWorkspaceId(workspace._id)}
                  >
                    <div className="row wrap" style={{ justifyContent: "space-between" }}>
                      <div>{workspace.name}</div>
                      {unreadCounts[workspace._id] ? (
                        <span className="unread-badge">
                          {unreadCounts[workspace._id]}
                        </span>
                      ) : null}
                    </div>
                    <small className="muted">
                      Invite code: {workspace.code}
                    </small>
                  </button>
                ))}
                {workspaces.length === 0 ? (
                  <p className="muted">
                    No workspaces yet. Create one to start chatting.
                  </p>
                ) : null}
              </div>
              {error ? <p className="error">{error}</p> : null}
            </section>
          </aside>

          <section className="workspace-main">
            <ChatBox
              activeWorkspace={activeWorkspace}
              messages={messages}
              currentUserId={user?._id ?? ""}
              typingUsers={typingUsers}
            />
            <Editor activeWorkspace={activeWorkspace} />
          </section>
        </div>
      </div>
      {toasts.length ? (
        <div className="toast-stack">
          {toasts.map((toast) => (
            <button
              key={toast.id}
              className="toast-card"
              type="button"
              onClick={() => {
                setActiveWorkspaceId(toast.workspaceId);
                clearUnreadCount(toast.workspaceId);
                removeToast(toast.id);
              }}
            >
              <strong>{toast.title}</strong>
              <span>{toast.body}</span>
            </button>
          ))}
        </div>
      ) : null}
    </main>
  );
}
