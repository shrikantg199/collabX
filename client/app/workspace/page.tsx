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

function getRequestErrorMessage(error: unknown, fallbackMessage: string) {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    const serverMessage = error.response?.data?.message?.trim();
    if (serverMessage) return serverMessage;
    if (!error.response)
      return "The app could not reach the API. Make sure the server is still running.";
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
  const [isLeavingWorkspace, setIsLeavingWorkspace] = useState(false);
  const [isDeletingWorkspace, setIsDeletingWorkspace] = useState(false);
  const [isTransferringOwnership, setIsTransferringOwnership] = useState(false);
  const [workspaceMembers, setWorkspaceMembers] = useState<any[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedMemberToRemove, setSelectedMemberToRemove] = useState<
    string | null
  >(null);
  const [selectedNewOwner, setSelectedNewOwner] = useState("");
  const [sidebarTab, setSidebarTab] = useState<"workspaces" | "profile">(
    "workspaces",
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ✅ Chat / Editor tab
  const [activeTab, setActiveTab] = useState<"chat" | "editor">("chat");

  const typingTimeoutsRef = useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({});
  const toastTimeoutsRef = useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({});
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeWorkspaceIdRef = useRef("");
  const userIdRef = useRef("");
  const workspacesRef = useRef<Workspace[]>([]);

  const activeWorkspace = useMemo(
    () => workspaces.find((w) => w._id === activeWorkspaceId) ?? null,
    [activeWorkspaceId, workspaces],
  );
  const isCreator = useMemo(() => {
    if (!activeWorkspace || !user) return false;
    return activeWorkspace.createdBy === user._id;
  }, [activeWorkspace, user]);
  const avatarInitials = useMemo(() => {
    const source = profileName || user?.name || "CX";
    return source
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("");
  }, [profileName, user?.name]);

  function clearUnreadCount(workspaceId: string) {
    if (!workspaceId) return;
    setUnreadCounts((c) => {
      if (!c[workspaceId]) return c;
      return { ...c, [workspaceId]: 0 };
    });
  }

  function removeToast(toastId: string) {
    const t = toastTimeoutsRef.current[toastId];
    if (t) {
      clearTimeout(t);
      delete toastTimeoutsRef.current[toastId];
    }
    setToasts((c) => c.filter((t) => t.id !== toastId));
  }

  function addToast(workspaceId: string, title: string, body: string) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((c) => [...c.slice(-2), { id, workspaceId, title, body }]);
    toastTimeoutsRef.current[id] = setTimeout(() => removeToast(id), 4000);
  }

  function maybeShowBrowserNotification(message: Message) {
    if (
      typeof window === "undefined" ||
      typeof Notification === "undefined" ||
      Notification.permission !== "granted" ||
      !document.hidden
    )
      return;
    const wsName =
      workspacesRef.current.find((w) => w._id === message.workspace)?.name ??
      "Workspace";
    const notification = new Notification(
      `${message.user?.name ?? "Someone"} in ${wsName}`,
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

        const params = new URLSearchParams(window.location.search);
        const wsFromUrl = params.get("id");
        if (
          wsFromUrl &&
          workspaceData.workspaces.some((w: Workspace) => w._id === wsFromUrl)
        ) {
          setActiveWorkspaceId(wsFromUrl);
        } else {
          setActiveWorkspaceId(workspaceData.workspaces[0]?._id ?? "");
        }

        const socket = connectSocket(token ?? "");
        socket.off("new-message");
        socket.off("message-updated");
        socket.off("message-deleted");
        socket.off("typing-status");

        socket.on("new-message", (message: Message) => {
          const isOwn = message.user?._id === userIdRef.current;
          const isActive = message.workspace === activeWorkspaceIdRef.current;
          if (isActive) {
            setMessages((c) => {
              const exists = c.some((e) => e._id === message._id);
              return exists ? c : [...c, message];
            });
          }
          if (!isOwn && (!isActive || document.hidden)) {
            setUnreadCounts((c) => ({
              ...c,
              [message.workspace]: (c[message.workspace] ?? 0) + 1,
            }));
          }
          if (!isOwn && !document.hidden && !isActive) {
            const wsName =
              workspacesRef.current.find((w) => w._id === message.workspace)
                ?.name ?? "Workspace";
            addToast(
              message.workspace,
              `${message.user?.name ?? "Someone"} in ${wsName}`,
              message.text,
            );
          }
          if (!isOwn) maybeShowBrowserNotification(message);
        });

        socket.on("message-updated", (message: Message) => {
          if (message.workspace !== activeWorkspaceIdRef.current) return;
          setMessages((c) =>
            c.map((e) => (e._id === message._id ? message : e)),
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
            if (workspaceId !== activeWorkspaceIdRef.current) return;
            setMessages((c) => c.filter((e) => e._id !== messageId));
          },
        );

        socket.on(
          "typing-status",
          ({
            workspaceId,
            isTyping,
            user: tu,
          }: {
            workspaceId: string;
            isTyping: boolean;
            user: TypingUser;
          }) => {
            if (
              !tu?._id ||
              tu._id === userIdRef.current ||
              workspaceId !== activeWorkspaceIdRef.current
            )
              return;
            const existing = typingTimeoutsRef.current[tu._id];
            if (existing) {
              clearTimeout(existing);
              delete typingTimeoutsRef.current[tu._id];
            }
            if (!isTyping) {
              setTypingUsers((c) => c.filter((e) => e._id !== tu._id));
              return;
            }
            setTypingUsers((c) => {
              const exists = c.some((e) => e._id === tu._id);
              return exists
                ? c.map((e) => (e._id === tu._id ? tu : e))
                : [...c, tu];
            });
            typingTimeoutsRef.current[tu._id] = setTimeout(() => {
              setTypingUsers((c) => c.filter((e) => e._id !== tu._id));
              delete typingTimeoutsRef.current[tu._id];
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
      Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
      typingTimeoutsRef.current = {};
      Object.values(toastTimeoutsRef.current).forEach(clearTimeout);
      toastTimeoutsRef.current = {};
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      disconnectSocket();
    };
  }, [router]);

  useEffect(() => {
    if (!activeWorkspaceId) {
      setMessages([]);
      setTypingUsers([]);
      return;
    }

    // ✅ Reset to Chat tab on workspace switch
    setActiveTab("chat");
    setTypingUsers([]);
    Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
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
          (res: { error?: string }) => {
            if (res?.error) setError(res.error);
          },
        );
      } catch {
        setError("We could not load workspace messages.");
      }
    }
    loadMessages();
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (!workspaces.length) return;
    const socket = connectSocket(
      window.localStorage.getItem("collabx_token") ?? "",
    );
    workspaces.forEach((w) =>
      socket.emit("join-workspace", { workspaceId: w._id }),
    );
  }, [workspaces]);

  useEffect(() => {
    if (!activeWorkspaceId || document.hidden) return;
    clearUnreadCount(activeWorkspaceId);
  }, [activeWorkspaceId]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (!document.hidden && activeWorkspaceIdRef.current)
        clearUnreadCount(activeWorkspaceIdRef.current);
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (
      typeof Notification === "undefined" ||
      Notification.permission !== "default"
    )
      return;
    Notification.requestPermission().catch(() => {});
  }, []);

  async function createWorkspace() {
    if (!workspaceName.trim()) return;
    setError("");
    try {
      const { data } = await api.post("/workspaces", {
        name: workspaceName.trim(),
      });
      setWorkspaces((c) => [data.workspace, ...c]);
      setActiveWorkspaceId(data.workspace._id);
      setWorkspaceName("");
    } catch {
      setError("Workspace creation failed. Please try again.");
    }
  }

  async function joinWorkspace() {
    if (!workspaceCode.trim()) return;
    setError("");
    try {
      const { data } = await api.post("/workspaces/join", {
        code: workspaceCode.trim().toUpperCase(),
      });
      setWorkspaces((c) => {
        const exists = c.some((w) => w._id === data.workspace._id);
        return exists ? c : [data.workspace, ...c];
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
      setMessages((c) =>
        c.map((m) =>
          m.user?._id === data.user._id
            ? {
                ...m,
                user: {
                  ...m.user,
                  name: data.user.name,
                  photoUrl: data.user.photoUrl,
                },
              }
            : m,
        ),
      );
      window.localStorage.setItem("collabx_user", JSON.stringify(data.user));
      setProfileSuccess("Profile updated.");
    } catch (e) {
      setProfileError(
        getRequestErrorMessage(e, "We could not update your name yet."),
      );
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleProfilePhotoUpload(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploadingPhoto(true);
    setProfileError("");
    setProfileSuccess("");
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const { data } = await api.post("/auth/profile-photo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setProfilePhotoUrl(data.photoUrl);
      setProfileSuccess("Photo uploaded. Save Profile to apply it.");
    } catch (e) {
      setProfileError(
        getRequestErrorMessage(e, "We could not upload your photo yet."),
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
      await api.put("/auth/password", { currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess("Password updated.");
    } catch (e) {
      setPasswordError(
        getRequestErrorMessage(e, "We could not change your password yet."),
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

  async function leaveWorkspace(workspaceId: string) {
    if (!workspaceId) return;
    const workspace = workspaces.find((w) => w._id === workspaceId);
    if (!workspace) return;
    const confirmed = window.confirm(
      `Are you sure you want to leave "${workspace.name}"? You will need a new invite code to rejoin.`,
    );
    if (!confirmed) return;
    setIsLeavingWorkspace(true);
    setError("");
    try {
      await api.post(`/workspaces/${workspaceId}/leave`);
      setWorkspaces((c) => c.filter((w) => w._id !== workspaceId));
      if (activeWorkspaceId === workspaceId) {
        const remaining = workspaces.filter((w) => w._id !== workspaceId);
        if (remaining.length > 0) setActiveWorkspaceId(remaining[0]._id);
        else {
          setActiveWorkspaceId("");
          setMessages([]);
          setTypingUsers([]);
        }
      }
    } catch (e) {
      setError(getRequestErrorMessage(e, "We could not leave the workspace."));
    } finally {
      setIsLeavingWorkspace(false);
    }
  }

  async function loadWorkspaceMembers(workspaceId: string) {
    if (!workspaceId) return;
    setIsLoadingMembers(true);
    try {
      const { data } = await api.get(`/workspaces/${workspaceId}/members`);
      setWorkspaceMembers(data.members || []);
    } catch (e) {
      setError(getRequestErrorMessage(e, "Could not load workspace members."));
    } finally {
      setIsLoadingMembers(false);
    }
  }

  async function deleteWorkspace(workspaceId: string) {
    if (!workspaceId) return;
    const workspace = workspaces.find((w) => w._id === workspaceId);
    if (!workspace) return;
    const confirmed = window.confirm(
      `⚠️ WARNING: This will permanently delete "${workspace.name}" including all messages and documents. This action cannot be undone. Are you sure?`,
    );
    if (!confirmed) return;
    setIsDeletingWorkspace(true);
    setError("");
    try {
      await api.delete(`/workspaces/${workspaceId}`);
      setWorkspaces((c) => c.filter((w) => w._id !== workspaceId));
      if (activeWorkspaceId === workspaceId) {
        const remaining = workspaces.filter((w) => w._id !== workspaceId);
        if (remaining.length > 0) setActiveWorkspaceId(remaining[0]._id);
        else {
          setActiveWorkspaceId("");
          setMessages([]);
          setTypingUsers([]);
        }
      }
    } catch (e) {
      setError(getRequestErrorMessage(e, "Could not delete workspace."));
    } finally {
      setIsDeletingWorkspace(false);
    }
  }

  async function transferOwnership(workspaceId: string, newOwnerId: string) {
    if (!workspaceId || !newOwnerId) return;
    const member = workspaceMembers.find((m) => m._id === newOwnerId);
    if (!member) return;
    const confirmed = window.confirm(
      `Transfer ownership of this workspace to ${member.name}? They will become the new creator.`,
    );
    if (!confirmed) return;
    setIsTransferringOwnership(true);
    setError("");
    try {
      await api.post(`/workspaces/${workspaceId}/transfer`, { newOwnerId });
      setShowTransferModal(false);
      setSelectedNewOwner("");
      const { data } = await api.get("/workspaces");
      setWorkspaces(data.workspaces);
    } catch (e) {
      setError(getRequestErrorMessage(e, "Could not transfer ownership."));
    } finally {
      setIsTransferringOwnership(false);
    }
  }

  async function removeMember(workspaceId: string, memberId: string) {
    if (!workspaceId || !memberId) return;
    const member = workspaceMembers.find((m) => m._id === memberId);
    if (!member) return;
    const confirmed = window.confirm(
      `Remove ${member.name} from this workspace?`,
    );
    if (!confirmed) return;
    setSelectedMemberToRemove(memberId);
    setError("");
    try {
      await api.delete(`/workspaces/${workspaceId}/members/${memberId}`);
      await loadWorkspaceMembers(workspaceId);
      const { data } = await api.get("/workspaces");
      setWorkspaces(data.workspaces);
    } catch (e) {
      setError(getRequestErrorMessage(e, "Could not remove member."));
    } finally {
      setSelectedMemberToRemove(null);
    }
  }

  async function copyWorkspaceCode(code: string) {
    if (!code || typeof navigator === "undefined" || !navigator.clipboard)
      return;
    try {
      await navigator.clipboard.writeText(code);
      setCopiedWorkspaceCode(code);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(
        () => setCopiedWorkspaceCode(""),
        1800,
      );
    } catch {
      setError("We could not copy the invite code.");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center animate-pulse">
            <span className="text-white text-sm">⚡</span>
          </div>
          <p className="text-sm text-gray-400 font-medium">
            Loading your workspace...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* ─── Top Nav Bar ─── */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 z-20 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
            title="Toggle sidebar"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path
                fillRule="evenodd"
                d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 012 10z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center">
              <span className="text-white text-xs font-bold">⚡</span>
            </div>
            <span className="font-bold text-gray-900 tracking-tight">
              CollabX
            </span>
          </div>
          {activeWorkspace && (
            <>
              <span className="text-gray-300">/</span>
              <span className="text-sm font-semibold text-gray-700">
                {activeWorkspace.name}
              </span>
              <button
                onClick={() => copyWorkspaceCode(activeWorkspace.code)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                title="Copy invite code"
              >
                <span className="text-xs font-mono font-semibold text-emerald-700">
                  {activeWorkspace.code}
                </span>
                {copiedWorkspaceCode === activeWorkspace.code ? (
                  <span className="text-xs text-emerald-600">✓</span>
                ) : (
                  <svg
                    viewBox="0 0 16 16"
                    fill="none"
                    className="w-3 h-3 text-emerald-600"
                  >
                    <path
                      d="M5.5 5.5A1.5 1.5 0 017 4h5A1.5 1.5 0 0113.5 5.5v5A1.5 1.5 0 0112 12H7a1.5 1.5 0 01-1.5-1.5v-5z"
                      stroke="currentColor"
                      strokeWidth="1.4"
                    />
                    <path
                      d="M2.5 9.5v-4A1.5 1.5 0 014 4"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100">
            {profilePhotoUrl ? (
              <img
                src={profilePhotoUrl}
                alt="avatar"
                className="w-6 h-6 rounded-full object-cover"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold">
                {avatarInitials}
              </div>
            )}
            <span className="text-sm font-medium text-gray-700">
              {user?.name}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 border border-gray-200 transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ─── Left Sidebar ─── */}
        {sidebarOpen && (
          <aside className="w-72 bg-white border-r border-gray-100 flex flex-col overflow-hidden shrink-0">
            <div className="flex border-b border-gray-100 shrink-0">
              <button
                onClick={() => setSidebarTab("workspaces")}
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${sidebarTab === "workspaces" ? "text-emerald-600 border-b-2 border-emerald-500" : "text-gray-400 hover:text-gray-700"}`}
              >
                Workspaces
              </button>
              <button
                onClick={() => setSidebarTab("profile")}
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${sidebarTab === "profile" ? "text-emerald-600 border-b-2 border-emerald-500" : "text-gray-400 hover:text-gray-700"}`}
              >
                Profile
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {sidebarTab === "workspaces" && (
                <div className="p-3 space-y-4">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
                      Create
                    </p>
                    <div className="flex gap-2">
                      <input
                        className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent placeholder:text-gray-400"
                        placeholder="Workspace name..."
                        value={workspaceName}
                        onChange={(e) => setWorkspaceName(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && createWorkspace()
                        }
                      />
                      <button
                        onClick={createWorkspace}
                        className="px-3 py-2 rounded-lg bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
                      Join with code
                    </p>
                    <div className="flex gap-2">
                      <input
                        className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent placeholder:text-gray-400 font-mono uppercase"
                        placeholder="AB12CD"
                        value={workspaceCode}
                        onChange={(e) => setWorkspaceCode(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && joinWorkspace()}
                      />
                      <button
                        onClick={joinWorkspace}
                        className="px-3 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-100 transition-colors"
                      >
                        Join
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs">
                      {error}
                    </div>
                  )}

                  <div className="space-y-1">
                    <div className="flex items-center justify-between px-1">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Your workspaces
                      </p>
                      <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                        {workspaces.length}
                      </span>
                    </div>

                    {workspaces.length === 0 && (
                      <p className="text-xs text-gray-400 px-1 py-3 text-center">
                        No workspaces yet. Create one above.
                      </p>
                    )}

                    {workspaces.map((workspace) => {
                      const isWsCreator = workspace.createdBy === user?._id;
                      const isActive = workspace._id === activeWorkspaceId;
                      return (
                        <div
                          key={workspace._id}
                          className={`group rounded-xl border transition-all duration-150 ${isActive ? "bg-emerald-50 border-emerald-200" : "bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50"}`}
                        >
                          <button
                            className="w-full px-3 py-2.5 text-left"
                            onClick={() => setActiveWorkspaceId(workspace._id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 min-w-0">
                                <div
                                  className={`w-2 h-2 rounded-full shrink-0 ${isActive ? "bg-emerald-500" : "bg-gray-300"}`}
                                />
                                <span
                                  className={`text-sm font-semibold truncate ${isActive ? "text-emerald-700" : "text-gray-700"}`}
                                >
                                  {workspace.name}
                                </span>
                                {isWsCreator && (
                                  <span className="text-xs shrink-0">👑</span>
                                )}
                              </div>
                              {unreadCounts[workspace._id] ? (
                                <span className="ml-2 min-w-[20px] h-5 flex items-center justify-center rounded-full bg-emerald-500 text-white text-xs font-bold px-1.5 shrink-0">
                                  {unreadCounts[workspace._id]}
                                </span>
                              ) : null}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5 pl-4 font-mono">
                              {workspace.code}
                            </p>
                          </button>

                          <div className="flex gap-1.5 px-3 pb-2.5">
                            <button
                              className="text-xs px-2 py-1 rounded-md bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors font-medium"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push("/dashboard");
                              }}
                            >
                              Dashboard
                            </button>
                            {isWsCreator ? (
                              <>
                                <button
                                  className="text-xs px-2 py-1 rounded-md bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors font-medium"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    loadWorkspaceMembers(workspace._id);
                                    setShowMemberModal(true);
                                  }}
                                >
                                  Members
                                </button>
                                <button
                                  className="text-xs px-2 py-1 rounded-md bg-red-50 text-red-500 hover:bg-red-100 transition-colors font-medium"
                                  disabled={isDeletingWorkspace}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteWorkspace(workspace._id);
                                  }}
                                >
                                  {isDeletingWorkspace ? "..." : "Delete"}
                                </button>
                              </>
                            ) : (
                              <button
                                className="text-xs px-2 py-1 rounded-md bg-orange-50 text-orange-500 hover:bg-orange-100 transition-colors font-medium"
                                disabled={isLeavingWorkspace}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  leaveWorkspace(workspace._id);
                                }}
                              >
                                {isLeavingWorkspace ? "..." : "Leave"}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {sidebarTab === "profile" && (
                <div className="p-3 space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                    {profilePhotoUrl ? (
                      <img
                        src={profilePhotoUrl}
                        alt="avatar"
                        className="w-12 h-12 rounded-full object-cover border-2 border-emerald-200"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-lg">
                        {avatarInitials}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {user?.name ?? "CollabX User"}
                      </p>
                      <p className="text-xs text-gray-400">{user?.email}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
                      Display info
                    </p>
                    <input
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent placeholder:text-gray-400"
                      placeholder="Your display name"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                    />
                    <input
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent placeholder:text-gray-400"
                      placeholder="Photo URL"
                      value={profilePhotoUrl}
                      onChange={(e) => setProfilePhotoUrl(e.target.value)}
                    />
                    <input
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                      value={user?.email ?? ""}
                      disabled
                      readOnly
                    />
                    <label className="flex items-center justify-center w-full px-3 py-2 rounded-lg border border-dashed border-gray-300 text-sm text-gray-500 hover:bg-gray-50 hover:border-emerald-300 transition-colors cursor-pointer">
                      {isUploadingPhoto ? "Uploading..." : "📷 Upload Photo"}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProfilePhotoUpload}
                        disabled={isUploadingPhoto}
                        className="hidden"
                      />
                    </label>
                    <button
                      onClick={updateProfile}
                      disabled={isSavingProfile}
                      className="w-full py-2 rounded-lg bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 disabled:opacity-60 transition-colors"
                    >
                      {isSavingProfile ? "Saving..." : "Save Profile"}
                    </button>
                    {profileError && (
                      <p className="text-xs text-red-500 px-1">
                        {profileError}
                      </p>
                    )}
                    {profileSuccess && (
                      <p className="text-xs text-emerald-600 px-1">
                        {profileSuccess}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
                      Change password
                    </p>
                    {[
                      {
                        placeholder: "Current password",
                        value: currentPassword,
                        onChange: setCurrentPassword,
                      },
                      {
                        placeholder: "New password",
                        value: newPassword,
                        onChange: setNewPassword,
                      },
                      {
                        placeholder: "Confirm new password",
                        value: confirmPassword,
                        onChange: setConfirmPassword,
                      },
                    ].map((field) => (
                      <input
                        key={field.placeholder}
                        type="password"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent placeholder:text-gray-400"
                        placeholder={field.placeholder}
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    ))}
                    <button
                      onClick={updatePassword}
                      disabled={isSavingPassword}
                      className="w-full py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-100 disabled:opacity-60 transition-colors"
                    >
                      {isSavingPassword ? "Saving..." : "Update Password"}
                    </button>
                    {passwordError && (
                      <p className="text-xs text-red-500 px-1">
                        {passwordError}
                      </p>
                    )}
                    {passwordSuccess && (
                      <p className="text-xs text-emerald-600 px-1">
                        {passwordSuccess}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}

        {/* ─── Main Area ─── */}
        <main className="flex-1 flex flex-col overflow-hidden bg-white">
          {activeWorkspace ? (
            <>
              {/* ✅ Header with Chat / Editor pill switcher */}
              <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 shrink-0 bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <span className="text-emerald-600 text-sm">
                      {activeTab === "chat" ? "💬" : "📝"}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      {activeWorkspace.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {isCreator ? "You are the workspace creator" : "Member"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* ✅ Pill toggle — same style as sidebar tabs */}
                  <div className="flex items-center bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setActiveTab("chat")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                        activeTab === "chat"
                          ? "bg-white text-emerald-600 shadow-sm border border-gray-200"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      💬 Chat
                    </button>
                    <button
                      onClick={() => setActiveTab("editor")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                        activeTab === "editor"
                          ? "bg-white text-emerald-600 shadow-sm border border-gray-200"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      📝 Editor
                    </button>
                  </div>

                  {isCreator && (
                    <button
                      onClick={() => {
                        loadWorkspaceMembers(activeWorkspace._id);
                        setShowMemberModal(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition-colors"
                    >
                      <svg
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-4 h-4"
                      >
                        <path d="M10 9a3 3 0 100-6 3 3 0 000 6zM6 8a2 2 0 11-4 0 2 2 0 014 0zM1.49 15.326a.78.78 0 01-.358-.442 3 3 0 014.308-3.516 6.484 6.484 0 00-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 01-2.07-.655zM16.44 15.98a4.97 4.97 0 002.07-.654.78.78 0 00.357-.442 3 3 0 00-4.308-3.517 6.484 6.484 0 011.907 3.96 2.32 2.32 0 01-.026.654zM18 8a2 2 0 11-4 0 2 2 0 014 0zM5.304 16.19a.844.844 0 01-.277-.71 5 5 0 019.947 0 .843.843 0 01-.277.71A6.975 6.975 0 0110 18a6.974 6.974 0 01-4.696-1.81z" />
                      </svg>
                      Members
                    </button>
                  )}
                </div>
              </div>

              {/* ✅ display:none keeps Editor socket alive when on Chat tab */}
              <div className="flex-1 overflow-hidden flex flex-col">
                <div
                  style={{
                    display: activeTab === "chat" ? "contents" : "none",
                  }}
                >
                  <ChatBox
                    activeWorkspace={activeWorkspace}
                    messages={messages}
                    currentUserId={user?._id ?? ""}
                    typingUsers={typingUsers}
                  />
                </div>
                <div
                  style={{
                    display: activeTab === "editor" ? "contents" : "none",
                  }}
                >
                  <Editor activeWorkspace={activeWorkspace} />
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-4">
                <span className="text-3xl">💬</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                No workspace selected
              </h2>
              <p className="text-sm text-gray-400 max-w-xs">
                Create a new workspace or join one with an invite code from the
                sidebar.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* ─── Toast Notifications ─── */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
          {toasts.map((toast) => (
            <button
              key={toast.id}
              type="button"
              onClick={() => {
                setActiveWorkspaceId(toast.workspaceId);
                clearUnreadCount(toast.workspaceId);
                removeToast(toast.id);
              }}
              className="flex flex-col gap-0.5 px-4 py-3 rounded-xl bg-white border border-gray-200 shadow-lg shadow-gray-200/80 text-left hover:border-emerald-200 hover:shadow-emerald-100/60 transition-all max-w-xs"
            >
              <span className="text-sm font-semibold text-gray-900">
                {toast.title}
              </span>
              <span className="text-xs text-gray-500 truncate">
                {toast.body}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ─── Member Management Modal ─── */}
      {showMemberModal && activeWorkspace && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowMemberModal(false)}
        >
          <div
            className="bg-white rounded-2xl border border-gray-100 shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Manage Members
                </h3>
                <p className="text-xs text-gray-400">{activeWorkspace.name}</p>
              </div>
              <button
                onClick={() => setShowMemberModal(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-4 border-b border-gray-100">
              <button
                className="w-full py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors"
                onClick={() => {
                  setShowMemberModal(false);
                  setShowTransferModal(true);
                }}
              >
                Transfer Ownership
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {isLoadingMembers ? (
                <p className="text-sm text-gray-400 text-center py-6">
                  Loading members...
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    Members ({workspaceMembers.length})
                  </p>
                  {workspaceMembers.map((member: any) => {
                    const isMemberCreator =
                      member._id === activeWorkspace.createdBy;
                    const isCurrentUser = member._id === user?._id;
                    return (
                      <div
                        key={member._id}
                        className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100"
                      >
                        <div className="flex items-center gap-3">
                          {member.photoUrl ? (
                            <img
                              src={member.photoUrl}
                              alt={member.name}
                              className="w-9 h-9 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-white text-sm font-bold">
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {member.name}
                              {isMemberCreator && (
                                <span className="ml-1.5 text-xs">👑</span>
                              )}
                              {isCurrentUser && (
                                <span className="ml-1.5 text-xs text-gray-400">
                                  (You)
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-gray-400">
                              {member.email}
                            </p>
                          </div>
                        </div>
                        {!isMemberCreator && !isCurrentUser && (
                          <button
                            className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 font-medium transition-colors"
                            disabled={selectedMemberToRemove === member._id}
                            onClick={() =>
                              removeMember(activeWorkspace._id, member._id)
                            }
                          >
                            {selectedMemberToRemove === member._id
                              ? "Removing..."
                              : "Remove"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Transfer Ownership Modal ─── */}
      {showTransferModal && activeWorkspace && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowTransferModal(false)}
        >
          <div
            className="bg-white rounded-2xl border border-gray-100 shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">
                Transfer Ownership
              </h3>
              <button
                onClick={() => setShowTransferModal(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-4">
              <p className="text-sm text-gray-500 mb-4">
                Select a member to become the new owner of{" "}
                <strong className="text-gray-900">
                  {activeWorkspace.name}
                </strong>
                . You will remain as a regular member.
              </p>
              <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                {workspaceMembers
                  .filter((m: any) => m._id !== user?._id)
                  .map((member: any) => (
                    <button
                      key={member._id}
                      onClick={() => setSelectedNewOwner(member._id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${selectedNewOwner === member._id ? "bg-emerald-50 border-emerald-300" : "bg-gray-50 border-gray-100 hover:border-gray-200"}`}
                    >
                      {member.photoUrl ? (
                        <img
                          src={member.photoUrl}
                          alt={member.name}
                          className="w-9 h-9 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-white text-sm font-bold">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {member.name}
                        </p>
                        <p className="text-xs text-gray-400">{member.email}</p>
                      </div>
                      {selectedNewOwner === member._id && (
                        <span className="ml-auto text-emerald-500 font-bold">
                          ✓
                        </span>
                      )}
                    </button>
                  ))}
              </div>
              <button
                className="w-full py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors"
                disabled={!selectedNewOwner || isTransferringOwnership}
                onClick={() =>
                  transferOwnership(activeWorkspace._id, selectedNewOwner)
                }
              >
                {isTransferringOwnership
                  ? "Transferring..."
                  : "Transfer Ownership"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
