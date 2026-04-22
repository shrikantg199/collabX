"use client";

import axios from "axios";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ChatBox from "@/components/ChatBox";
import Editor from "@/components/Editor";
import api from "@/lib/api";
import { connectSocket, disconnectSocket } from "@/lib/socket";
import type { Message, TypingUser, User, Workspace } from "@/types";
import ProfileDropdown from "@/components/ProfileDropdown";

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
  const [selectedMemberToRemove, setSelectedMemberToRemove] = useState<string | null>(null);
  const [selectedNewOwner, setSelectedNewOwner] = useState("");
  const [sidebarTab, setSidebarTab] = useState<"workspaces" | "profile">("workspaces");
  const [sidebarOpen, setSidebarOpen] = useState(false); // Default closed on mobile
  const [activeTab, setActiveTab] = useState<"chat" | "editor">("chat");

  const typingTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const toastTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
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
    return source.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
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
    if (t) { clearTimeout(t); delete toastTimeoutsRef.current[toastId]; }
    setToasts((c) => c.filter((t) => t.id !== toastId));
  }

  function addToast(workspaceId: string, title: string, body: string) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((c) => [...c.slice(-2), { id, workspaceId, title, body }]);
    toastTimeoutsRef.current[id] = setTimeout(() => removeToast(id), 4000);
  }

  function maybeShowBrowserNotification(message: Message) {
    if (typeof window === "undefined" || typeof Notification === "undefined" || Notification.permission !== "granted" || !document.hidden) return;
    const wsName = workspacesRef.current.find((w) => w._id === message.workspace)?.name ?? "Workspace";
    const notification = new Notification(`${message.user?.name ?? "Someone"} in ${wsName}`, {
      body: message.text,
      icon: message.user?.photoUrl || undefined,
      tag: `workspace-${message.workspace}`,
    });
    notification.onclick = () => {
      window.focus();
      setActiveWorkspaceId(message.workspace);
      clearUnreadCount(message.workspace);
      notification.close();
    };
  }

  useEffect(() => { activeWorkspaceIdRef.current = activeWorkspaceId; }, [activeWorkspaceId]);
  useEffect(() => { userIdRef.current = user?._id ?? ""; }, [user?._id]);
  useEffect(() => { workspacesRef.current = workspaces; }, [workspaces]);

  useEffect(() => {
    const token = window.localStorage.getItem("collabx_token");
    if (!token) { router.replace("/login"); return; }

    const cachedUser = window.localStorage.getItem("collabx_user");
    const cachedWorkspaces = window.localStorage.getItem("collabx_workspaces_cache");
    let usedCache = false;

    if (cachedUser) {
      try {
        const parsed = JSON.parse(cachedUser);
        setUser(parsed); setProfileName(parsed.name); setProfilePhotoUrl(parsed.photoUrl ?? "");
        usedCache = true;
      } catch {}
    }

    if (cachedWorkspaces) {
      try {
        const parsed = JSON.parse(cachedWorkspaces);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setWorkspaces(parsed);
          const params = new URLSearchParams(window.location.search);
          const wsFromUrl = params.get("id");
          if (wsFromUrl && parsed.some((w: Workspace) => w._id === wsFromUrl)) setActiveWorkspaceId(wsFromUrl);
          else setActiveWorkspaceId(parsed[0]?._id ?? "");
          if (usedCache) setLoading(false);
        }
      } catch {}
      window.localStorage.removeItem("collabx_workspaces_cache");
    }

    async function bootstrap() {
      try {
        const [{ data: me }, { data: workspaceData }] = await Promise.all([api.get("/auth/me"), api.get("/workspaces")]);
        setUser(me.user); setProfileName(me.user.name); setProfilePhotoUrl(me.user.photoUrl ?? "");
        setWorkspaces(workspaceData.workspaces);
        window.localStorage.setItem("collabx_user", JSON.stringify(me.user));

        const params = new URLSearchParams(window.location.search);
        const wsFromUrl = params.get("id");
        if (wsFromUrl && workspaceData.workspaces.some((w: Workspace) => w._id === wsFromUrl)) setActiveWorkspaceId(wsFromUrl);
        else if (!usedCache || !cachedWorkspaces) setActiveWorkspaceId(workspaceData.workspaces[0]?._id ?? "");

        const socket = connectSocket(token ?? "");
        socket.off("new-message"); socket.off("message-updated"); socket.off("message-deleted"); socket.off("typing-status");

        socket.on("new-message", (message: Message) => {
          const isOwn = message.user?._id === userIdRef.current;
          const isActive = message.workspace === activeWorkspaceIdRef.current;
          if (isActive) setMessages((c) => { const exists = c.some((e) => e._id === message._id); return exists ? c : [...c, message]; });
          if (!isOwn && (!isActive || document.hidden)) setUnreadCounts((c) => ({ ...c, [message.workspace]: (c[message.workspace] ?? 0) + 1 }));
          if (!isOwn && !document.hidden && !isActive) {
            const wsName = workspacesRef.current.find((w) => w._id === message.workspace)?.name ?? "Workspace";
            addToast(message.workspace, `${message.user?.name ?? "Someone"} in ${wsName}`, message.text);
          }
          if (!isOwn) maybeShowBrowserNotification(message);
        });

        socket.on("message-updated", (message: Message) => {
          if (message.workspace !== activeWorkspaceIdRef.current) return;
          setMessages((c) => c.map((e) => (e._id === message._id ? message : e)));
        });

        socket.on("message-deleted", ({ workspaceId, messageId }: { workspaceId: string; messageId: string }) => {
          if (workspaceId !== activeWorkspaceIdRef.current) return;
          setMessages((c) => c.filter((e) => e._id !== messageId));
        });

        socket.on("typing-status", ({ workspaceId, isTyping, user: tu }: { workspaceId: string; isTyping: boolean; user: TypingUser }) => {
          if (!tu?._id || tu._id === userIdRef.current || workspaceId !== activeWorkspaceIdRef.current) return;
          const existing = typingTimeoutsRef.current[tu._id];
          if (existing) { clearTimeout(existing); delete typingTimeoutsRef.current[tu._id]; }
          if (!isTyping) { setTypingUsers((c) => c.filter((e) => e._id !== tu._id)); return; }
          setTypingUsers((c) => { const exists = c.some((e) => e._id === tu._id); return exists ? c.map((e) => (e._id === tu._id ? tu : e)) : [...c, tu]; });
          typingTimeoutsRef.current[tu._id] = setTimeout(() => { setTypingUsers((c) => c.filter((e) => e._id !== tu._id)); delete typingTimeoutsRef.current[tu._id]; }, 2500);
        });
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          window.localStorage.removeItem("collabx_token"); window.localStorage.removeItem("collabx_user"); router.replace("/login");
        } else setError("Connection failed. Please check if the server is running.");
      } finally { setLoading(false); }
    }

    bootstrap();

    // Responsive: set sidebar open by default on desktop
    if (window.innerWidth >= 1024) {
      setSidebarOpen(true);
    }

    return () => {
      Object.values(typingTimeoutsRef.current).forEach(clearTimeout); typingTimeoutsRef.current = {};
      Object.values(toastTimeoutsRef.current).forEach(clearTimeout); toastTimeoutsRef.current = {};
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      disconnectSocket();
    };
  }, [router]);

  useEffect(() => {
    if (!activeWorkspaceId) { setMessages([]); setTypingUsers([]); return; }
    setActiveTab("chat"); setTypingUsers([]);
    Object.values(typingTimeoutsRef.current).forEach(clearTimeout); typingTimeoutsRef.current = {};
    async function loadMessages() {
      try {
        const { data } = await api.get(`/messages/${activeWorkspaceId}`);
        setMessages(data.messages);
        const socket = connectSocket(window.localStorage.getItem("collabx_token") ?? "");
        socket.emit("join-workspace", { workspaceId: activeWorkspaceId }, (res: { error?: string }) => { if (res?.error) setError(res.error); });
      } catch { setError("We could not load workspace messages."); }
    }
    loadMessages();
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (!workspaces.length) return;
    const socket = connectSocket(window.localStorage.getItem("collabx_token") ?? "");
    workspaces.forEach((w) => socket.emit("join-workspace", { workspaceId: w._id }));
  }, [workspaces]);

  useEffect(() => { if (!activeWorkspaceId || document.hidden) return; clearUnreadCount(activeWorkspaceId); }, [activeWorkspaceId]);

  useEffect(() => {
    function handleVisibilityChange() { if (!document.hidden && activeWorkspaceIdRef.current) clearUnreadCount(activeWorkspaceIdRef.current); }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (typeof Notification === "undefined" || Notification.permission !== "default") return;
    Notification.requestPermission().catch(() => {});
  }, []);

  async function createWorkspace() {
    if (!workspaceName.trim()) return; setError("");
    try {
      const { data } = await api.post("/workspaces", { name: workspaceName.trim() });
      setWorkspaces((c) => [data.workspace, ...c]); setActiveWorkspaceId(data.workspace._id); setWorkspaceName("");
    } catch { setError("Workspace creation failed. Please try again."); }
  }

  async function joinWorkspace() {
    if (!workspaceCode.trim()) return; setError("");
    try {
      const { data } = await api.post("/workspaces/join", { code: workspaceCode.trim().toUpperCase() });
      setWorkspaces((c) => { const exists = c.some((w) => w._id === data.workspace._id); return exists ? c : [data.workspace, ...c]; });
      setActiveWorkspaceId(data.workspace._id); setWorkspaceCode("");
    } catch { setError("We could not join that workspace. Check the code and try again."); }
  }

  async function updateProfile() {
    const trimmedName = profileName.trim(); const trimmedPhotoUrl = profilePhotoUrl.trim();
    if (!trimmedName) { setProfileError("Please enter a name before saving."); setProfileSuccess(""); return; }
    setIsSavingProfile(true); setProfileError(""); setProfileSuccess("");
    try {
      const { data } = await api.put("/auth/profile", { name: trimmedName, photoUrl: trimmedPhotoUrl });
      setUser(data.user); setProfileName(data.user.name); setProfilePhotoUrl(data.user.photoUrl ?? "");
      setMessages((c) => c.map((m) => m.user?._id === data.user._id ? { ...m, user: { ...m.user, name: data.user.name, photoUrl: data.user.photoUrl } } : m));
      window.localStorage.setItem("collabx_user", JSON.stringify(data.user)); setProfileSuccess("Profile updated.");
    } catch (e) { setProfileError(getRequestErrorMessage(e, "We could not update your name yet.")); }
    finally { setIsSavingProfile(false); }
  }

  async function handleProfilePhotoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    setIsUploadingPhoto(true); setProfileError(""); setProfileSuccess("");
    try {
      const formData = new FormData(); formData.append("photo", file);
      const { data } = await api.post("/auth/profile-photo", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setProfilePhotoUrl(data.photoUrl); setProfileSuccess("Photo uploaded. Save Profile to apply it.");
    } catch (e) { setProfileError(getRequestErrorMessage(e, "We could not upload your photo yet.")); }
    finally { setIsUploadingPhoto(false); event.target.value = ""; }
  }

  async function updatePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) { setPasswordError("Fill in all password fields before saving."); setPasswordSuccess(""); return; }
    if (newPassword.length < 6) { setPasswordError("New password must be at least 6 characters."); setPasswordSuccess(""); return; }
    if (newPassword !== confirmPassword) { setPasswordError("New password and confirm password must match."); setPasswordSuccess(""); return; }
    setIsSavingPassword(true); setPasswordError(""); setPasswordSuccess("");
    try {
      await api.put("/auth/password", { currentPassword, newPassword });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setPasswordSuccess("Password updated.");
    } catch (e) { setPasswordError(getRequestErrorMessage(e, "We could not change your password yet.")); }
    finally { setIsSavingPassword(false); }
  }

  function handleLogout() {
    disconnectSocket();
    window.localStorage.removeItem("collabx_token"); window.localStorage.removeItem("collabx_user");
    router.replace("/login");
  }

  async function leaveWorkspace(workspaceId: string) {
    if (!workspaceId) return;
    const workspace = workspaces.find((w) => w._id === workspaceId); if (!workspace) return;
    const confirmed = window.confirm(`Are you sure you want to leave "${workspace.name}"? You will need a new invite code to rejoin.`);
    if (!confirmed) return;
    setIsLeavingWorkspace(true); setError("");
    try {
      await api.post(`/workspaces/${workspaceId}/leave`);
      setWorkspaces((c) => c.filter((w) => w._id !== workspaceId));
      if (activeWorkspaceId === workspaceId) {
        const remaining = workspaces.filter((w) => w._id !== workspaceId);
        if (remaining.length > 0) setActiveWorkspaceId(remaining[0]._id);
        else { setActiveWorkspaceId(""); setMessages([]); setTypingUsers([]); }
      }
    } catch (e) { setError(getRequestErrorMessage(e, "We could not leave the workspace.")); }
    finally { setIsLeavingWorkspace(false); }
  }

  async function loadWorkspaceMembers(workspaceId: string) {
    if (!workspaceId) return; setIsLoadingMembers(true);
    try {
      const { data } = await api.get(`/workspaces/${workspaceId}/members`);
      setWorkspaceMembers(data.members || []);
    } catch (e) { setError(getRequestErrorMessage(e, "Could not load workspace members.")); }
    finally { setIsLoadingMembers(false); }
  }

  async function deleteWorkspace(workspaceId: string) {
    if (!workspaceId) return;
    const workspace = workspaces.find((w) => w._id === workspaceId); if (!workspace) return;
    const confirmed = window.confirm(`⚠️ WARNING: This will permanently delete "${workspace.name}" including all messages and documents. This action cannot be undone. Are you sure?`);
    if (!confirmed) return;
    setIsDeletingWorkspace(true); setError("");
    try {
      await api.delete(`/workspaces/${workspaceId}`);
      setWorkspaces((c) => c.filter((w) => w._id !== workspaceId));
      if (activeWorkspaceId === workspaceId) {
        const remaining = workspaces.filter((w) => w._id !== workspaceId);
        if (remaining.length > 0) setActiveWorkspaceId(remaining[0]._id);
        else { setActiveWorkspaceId(""); setMessages([]); setTypingUsers([]); }
      }
    } catch (e) { setError(getRequestErrorMessage(e, "Could not delete workspace.")); }
    finally { setIsDeletingWorkspace(false); }
  }

  async function transferOwnership(workspaceId: string, newOwnerId: string) {
    if (!workspaceId || !newOwnerId) return;
    const member = workspaceMembers.find((m) => m._id === newOwnerId); if (!member) return;
    const confirmed = window.confirm(`Transfer ownership of this workspace to ${member.name}? They will become the new creator.`);
    if (!confirmed) return;
    setIsTransferringOwnership(true); setError("");
    try {
      await api.post(`/workspaces/${workspaceId}/transfer`, { newOwnerId });
      setShowTransferModal(false); setSelectedNewOwner("");
      const { data } = await api.get("/workspaces"); setWorkspaces(data.workspaces);
    } catch (e) { setError(getRequestErrorMessage(e, "Could not transfer ownership.")); }
    finally { setIsTransferringOwnership(false); }
  }

  async function removeMember(workspaceId: string, memberId: string) {
    if (!workspaceId || !memberId) return;
    const member = workspaceMembers.find((m) => m._id === memberId); if (!member) return;
    const confirmed = window.confirm(`Remove ${member.name} from this workspace?`);
    if (!confirmed) return;
    setSelectedMemberToRemove(memberId); setError("");
    try {
      await api.delete(`/workspaces/${workspaceId}/members/${memberId}`);
      await loadWorkspaceMembers(workspaceId);
      const { data } = await api.get("/workspaces"); setWorkspaces(data.workspaces);
    } catch (e) { setError(getRequestErrorMessage(e, "Could not remove member.")); }
    finally { setSelectedMemberToRemove(null); }
  }

  async function copyWorkspaceCode(code: string) {
    if (!code || typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopiedWorkspaceCode(code);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopiedWorkspaceCode(""), 1800);
    } catch { setError("We could not copy the invite code."); }
  }

  // ── Input class helpers ──
  const inputCls = "w-full px-3 py-2.5 text-sm rounded-xl border border-white/[0.08] bg-[#18181f] text-[#d0cec8] placeholder:text-[#3a3a4a] focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/30 transition-all duration-150";
  const labelCls = "text-[10px] font-bold text-[#4a4a5a] uppercase tracking-widest px-0.5 mb-1 block";

  // ── Loading screen ──
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0f]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-400 flex items-center justify-center animate-pulse shadow-lg shadow-emerald-500/30">
            <span className="text-[#060d0a] text-xl font-bold">⚡</span>
          </div>
          <p className="text-sm text-[#6b6b7a] font-medium">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0f] overflow-hidden text-[#f0ede8]">

      {/* ── Top Navbar ── */}
      <header className="flex items-center justify-between px-4 sm:px-5 py-3 bg-[#0a0a0f]/95 backdrop-blur-xl border-b border-white/[0.06] z-20 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Hamburger */}
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="p-2 rounded-lg hover:bg-white/[0.05] text-[#6b6b7a] hover:text-[#d0cec8] transition-all duration-150"
            title="Toggle sidebar"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 012 10z" clipRule="evenodd" />
            </svg>
          </button>

          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-emerald-400 flex items-center justify-center shadow-md shadow-emerald-500/30">
              <span className="text-[#060d0a] text-xs font-black">⚡</span>
            </div>
            <span className="font-black text-white tracking-tight text-base hidden sm:block">CollabX</span>
          </div>

          {/* Active workspace breadcrumb */}
          {activeWorkspace && (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[#3a3a4a] text-sm">/</span>
              <span className="text-sm font-semibold text-[#d0cec8] truncate max-w-[80px] sm:max-w-[150px]">{activeWorkspace.name}</span>
              <button
                onClick={() => copyWorkspaceCode(activeWorkspace.code)}
                className="flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15 hover:border-emerald-500/30 transition-all duration-150 shrink-0"
                title="Copy invite code"
              >
                <span className="text-[10px] sm:text-xs font-mono font-bold text-emerald-400">{activeWorkspace.code}</span>
                {copiedWorkspaceCode === activeWorkspace.code ? (
                  <span className="text-[10px] text-emerald-400 font-bold">✓</span>
                ) : (
                  <svg viewBox="0 0 16 16" fill="none" className="w-3 h-3 text-emerald-400">
                    <path d="M5.5 5.5A1.5 1.5 0 017 4h5A1.5 1.5 0 0113.5 5.5v5A1.5 1.5 0 0112 12H7a1.5 1.5 0 01-1.5-1.5v-5z" stroke="currentColor" strokeWidth="1.4" />
                    <path d="M2.5 9.5v-4A1.5 1.5 0 014 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-1 sm:gap-2">
          {user && (
            <ProfileDropdown 
              user={{ name: user.name, email: user.email, photoUrl: user.photoUrl }}
              onLogout={handleLogout}
              onDashboard={() => router.push("/dashboard")}
              isDark={true}
            />
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar Overlay (Mobile) ── */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── Sidebar ── */}
        <aside className={`
          fixed lg:relative inset-y-0 left-0 bg-[#0d0d12] border-r border-white/[0.06] flex flex-col overflow-hidden shrink-0 z-40 transition-all duration-300
          ${sidebarOpen ? "w-72 translate-x-0" : "w-0 -translate-x-full lg:translate-x-0 lg:border-none"}
        `}>

            {/* Sidebar tabs */}
            <div className="flex border-b border-white/[0.06] shrink-0">
              {(["workspaces", "profile"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSidebarTab(tab)}
                  className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-all duration-150 ${
                    sidebarTab === tab
                      ? "text-emerald-400 border-b-2 border-emerald-400"
                      : "text-[#4a4a5a] hover:text-[#9898a8]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin">

              {/* ── Workspaces Tab ── */}
              {sidebarTab === "workspaces" && (
                <div className="p-3 space-y-5">

                  {/* Create */}
                  <div className="space-y-1.5">
                    <span className={labelCls}>Create</span>
                    <div className="flex gap-2">
                      <input
                        className={inputCls + " flex-1"}
                        placeholder="Workspace name..."
                        value={workspaceName}
                        onChange={(e) => setWorkspaceName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && createWorkspace()}
                      />
                      <button
                        onClick={createWorkspace}
                        className="px-3 py-2.5 rounded-xl bg-emerald-400 text-[#060d0a] text-sm font-black hover:bg-emerald-300 hover:shadow-lg hover:shadow-emerald-500/25 transition-all duration-150"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Join */}
                  <div className="space-y-1.5">
                    <span className={labelCls}>Join with code</span>
                    <div className="flex gap-2">
                      <input
                        className={inputCls + " flex-1 font-mono uppercase"}
                        placeholder="AB12CD"
                        value={workspaceCode}
                        onChange={(e) => setWorkspaceCode(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && joinWorkspace()}
                      />
                      <button
                        onClick={joinWorkspace}
                        className="px-3 py-2.5 rounded-xl border border-white/[0.08] text-[#9898a8] text-sm font-semibold hover:bg-white/[0.04] hover:text-white transition-all duration-150"
                      >
                        Join
                      </button>
                    </div>
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-500/[0.07] border border-red-500/20 text-red-400 text-xs">
                      <span className="shrink-0 mt-0.5">⚠</span>{error}
                    </div>
                  )}

                  {/* List */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between px-0.5 mb-2">
                      <span className={labelCls}>Your workspaces</span>
                      <span className="text-[10px] text-[#4a4a5a] bg-[#18181f] border border-white/[0.06] rounded-full px-2 py-0.5 font-semibold">
                        {workspaces.length}
                      </span>
                    </div>

                    {workspaces.length === 0 && (
                      <p className="text-xs text-[#4a4a5a] text-center py-6">
                        No workspaces yet. Create one above.
                      </p>
                    )}

                    {workspaces.map((workspace) => {
                      const isWsCreator = workspace.createdBy === user?._id;
                      const isActive = workspace._id === activeWorkspaceId;
                      return (
                        <div
                          key={workspace._id}
                          className={`group rounded-xl border transition-all duration-150 ${
                            isActive
                              ? "bg-emerald-500/[0.07] border-emerald-500/20"
                              : "bg-[#111118] border-white/[0.06] hover:border-white/[0.1] hover:bg-white/[0.02]"
                          }`}
                        >
                          <button
                            className="w-full px-3 py-3 text-left"
                            onClick={() => setActiveWorkspaceId(workspace._id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-2 h-2 rounded-full shrink-0 ${isActive ? "bg-emerald-400" : "bg-[#3a3a4a]"}`} />
                                <span className={`text-sm font-semibold truncate ${isActive ? "text-emerald-300" : "text-[#d0cec8]"}`}>
                                  {workspace.name}
                                </span>
                                {isWsCreator && <span className="text-xs shrink-0">👑</span>}
                              </div>
                              {unreadCounts[workspace._id] ? (
                                <span className="ml-2 min-w-[20px] h-5 flex items-center justify-center rounded-full bg-emerald-400 text-[#060d0a] text-[10px] font-black px-1.5 shrink-0">
                                  {unreadCounts[workspace._id]}
                                </span>
                              ) : null}
                            </div>
                            <p className="text-[10px] text-[#4a4a5a] mt-1 pl-4 font-mono">{workspace.code}</p>
                          </button>

                          {/* Action row */}
                          <div className="flex flex-wrap gap-1.5 px-3 pb-3">
                            <button
                              className="flex-1 text-[10px] px-2 py-1.5 rounded-lg bg-[#18181f] border border-white/[0.06] text-[#6b6b7a] hover:text-[#d0cec8] hover:border-white/[0.1] transition-all font-semibold text-center whitespace-nowrap"
                              onClick={(e) => { e.stopPropagation(); router.push("/dashboard"); }}
                            >
                              Dash
                            </button>
                            {isWsCreator ? (
                              <>
                                <button
                                  className="flex-1 text-[10px] px-2 py-1.5 rounded-lg bg-[#18181f] border border-white/[0.06] text-[#6b6b7a] hover:text-[#d0cec8] hover:border-white/[0.1] transition-all font-semibold text-center whitespace-nowrap"
                                  onClick={(e) => { e.stopPropagation(); loadWorkspaceMembers(workspace._id); setShowMemberModal(true); }}
                                >
                                  Users
                                </button>
                                <button
                                  className="flex-1 text-[10px] px-2 py-1.5 rounded-lg bg-red-500/[0.07] border border-red-500/20 text-red-400 hover:bg-red-500/15 transition-all font-semibold disabled:opacity-50 text-center whitespace-nowrap"
                                  disabled={isDeletingWorkspace}
                                  onClick={(e) => { e.stopPropagation(); deleteWorkspace(workspace._id); }}
                                >
                                  {isDeletingWorkspace ? "..." : "Delete"}
                                </button>
                              </>
                            ) : (
                              <button
                                className="flex-1 text-[10px] px-2 py-1.5 rounded-lg bg-orange-500/[0.07] border border-orange-500/20 text-orange-400 hover:bg-orange-500/15 transition-all font-semibold disabled:opacity-50 text-center whitespace-nowrap"
                                disabled={isLeavingWorkspace}
                                onClick={(e) => { e.stopPropagation(); leaveWorkspace(workspace._id); }}
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

              {/* ── Profile Tab ── */}
              {sidebarTab === "profile" && (
                <div className="p-3 space-y-5">

                  {/* Avatar card */}
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-[#111118] border border-white/[0.06]">
                    {profilePhotoUrl ? (
                      <img src={profilePhotoUrl} alt="avatar" className="w-12 h-12 rounded-full object-cover ring-2 ring-emerald-500/30" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 flex items-center justify-center text-[#060d0a] font-black text-lg">
                        {avatarInitials}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-bold text-white">{user?.name ?? "CollabX User"}</p>
                      <p className="text-xs text-[#6b6b7a]">{user?.email}</p>
                    </div>
                  </div>

                  {/* Display info */}
                  <div className="space-y-2">
                    <span className={labelCls}>Display info</span>
                    <input className={inputCls} placeholder="Your display name" value={profileName} onChange={(e) => setProfileName(e.target.value)} />
                    <input className={inputCls} placeholder="Photo URL (optional)" value={profilePhotoUrl} onChange={(e) => setProfilePhotoUrl(e.target.value)} />
                    <input className={inputCls + " opacity-40 cursor-not-allowed"} value={user?.email ?? ""} disabled readOnly />
                    <label className="flex items-center justify-center w-full px-3 py-2.5 rounded-xl border border-dashed border-white/[0.1] text-sm text-[#6b6b7a] hover:bg-white/[0.03] hover:border-emerald-500/30 hover:text-emerald-400 transition-all duration-150 cursor-pointer">
                      {isUploadingPhoto ? "Uploading..." : "📷 Upload Photo"}
                      <input type="file" accept="image/*" onChange={handleProfilePhotoUpload} disabled={isUploadingPhoto} className="hidden" />
                    </label>
                    <button
                      onClick={updateProfile}
                      disabled={isSavingProfile}
                      className="w-full py-2.5 rounded-xl bg-emerald-400 text-[#060d0a] text-sm font-bold hover:bg-emerald-300 hover:shadow-lg hover:shadow-emerald-500/25 disabled:opacity-50 transition-all duration-150"
                    >
                      {isSavingProfile ? "Saving..." : "Save Profile"}
                    </button>
                    {profileError && <p className="text-xs text-red-400 px-0.5">⚠ {profileError}</p>}
                    {profileSuccess && <p className="text-xs text-emerald-400 px-0.5">✓ {profileSuccess}</p>}
                  </div>

                  {/* Change password */}
                  <div className="space-y-2 pt-3 border-t border-white/[0.06]">
                    <span className={labelCls}>Change password</span>
                    {[
                      { placeholder: "Current password", value: currentPassword, onChange: setCurrentPassword },
                      { placeholder: "New password", value: newPassword, onChange: setNewPassword },
                      { placeholder: "Confirm new password", value: confirmPassword, onChange: setConfirmPassword },
                    ].map((field) => (
                      <input
                        key={field.placeholder}
                        type="password"
                        className={inputCls}
                        placeholder={field.placeholder}
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    ))}
                    <button
                      onClick={updatePassword}
                      disabled={isSavingPassword}
                      className="w-full py-2.5 rounded-xl border border-white/[0.08] text-[#9898a8] text-sm font-semibold hover:bg-white/[0.04] hover:text-white disabled:opacity-50 transition-all duration-150"
                    >
                      {isSavingPassword ? "Saving..." : "Update Password"}
                    </button>
                    {passwordError && <p className="text-xs text-red-400 px-0.5">⚠ {passwordError}</p>}
                    {passwordSuccess && <p className="text-xs text-emerald-400 px-0.5">✓ {passwordSuccess}</p>}
                  </div>
                </div>
              )}
            </div>
          </aside>

        {/* ── Main Area ── */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[#0f0f14]">
          {activeWorkspace ? (
            <>
              {/* Main header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-3 sm:py-3.5 border-b border-white/[0.06] shrink-0 bg-[#0d0d12] gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <span className="text-base sm:text-lg">{activeTab === "chat" ? "💬" : "📝"}</span>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-white truncate max-w-[150px] sm:max-w-none">{activeWorkspace.name}</p>
                    <p className="text-[9px] sm:text-[10px] text-[#4a4a5a] font-medium uppercase tracking-wider">
                      {isCreator ? "👑 Creator" : "Member"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2">
                  {/* Chat / Editor pill */}
                  <div className="flex items-center bg-[#18181f] border border-white/[0.06] rounded-xl p-1 gap-1">
                    {(["chat", "editor"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all duration-150 ${
                          activeTab === tab
                            ? "bg-emerald-400 text-[#060d0a] shadow-sm"
                            : "text-[#6b6b7a] hover:text-[#d0cec8]"
                        }`}
                      >
                        <span className="sm:inline">{tab === "chat" ? "💬" : "📝"}</span>
                        <span className="ml-1">{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
                      </button>
                    ))}
                  </div>

                  {isCreator && (
                    <button
                      onClick={() => { loadWorkspaceMembers(activeWorkspace._id); setShowMemberModal(true); }}
                      className="flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[10px] sm:text-sm font-medium text-[#6b6b7a] hover:text-white hover:bg-white/[0.05] border border-white/[0.06] hover:border-white/[0.1] transition-all duration-150"
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 sm:w-4 sm:h-4">
                        <path d="M10 9a3 3 0 100-6 3 3 0 000 6zM6 8a2 2 0 11-4 0 2 2 0 014 0zM1.49 15.326a.78.78 0 01-.358-.442 3 3 0 014.308-3.516 6.484 6.484 0 00-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 01-2.07-.655zM16.44 15.98a4.97 4.97 0 002.07-.654.78.78 0 00.357-.442 3 3 0 00-4.308-3.517 6.484 6.484 0 011.907 3.96 2.32 2.32 0 01-.026.654zM18 8a2 2 0 11-4 0 2 2 0 014 0zM5.304 16.19a.844.844 0 01-.277-.71 5 5 0 019.947 0 .843.843 0 01-.277.71A6.975 6.975 0 0110 18a6.974 6.974 0 01-4.696-1.81z" />
                      </svg>
                      Members
                    </button>
                  )}
                </div>
              </div>

              {/* Chat / Editor content — display:none keeps sockets alive */}
              <div className="flex-1 overflow-hidden flex flex-col">
                <div style={{ display: activeTab === "chat" ? "contents" : "none" }}>
                  <ChatBox activeWorkspace={activeWorkspace} messages={messages} currentUserId={user?._id ?? ""} typingUsers={typingUsers} />
                </div>
                <div style={{ display: activeTab === "editor" ? "contents" : "none" }}>
                  <Editor activeWorkspace={activeWorkspace} />
                </div>
              </div>
            </>
          ) : (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <div className="w-20 h-20 rounded-3xl bg-[#111118] border border-white/[0.06] flex items-center justify-center mb-6">
                <span className="text-4xl">💬</span>
              </div>
              <h2 className="text-xl font-black text-white mb-2">No workspace selected</h2>
              <p className="text-sm text-[#6b6b7a] max-w-xs leading-relaxed">
                Create a new workspace or join one with an invite code from the sidebar.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* ── Toast Notifications ── */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
          {toasts.map((toast) => (
            <button
              key={toast.id}
              type="button"
              onClick={() => { setActiveWorkspaceId(toast.workspaceId); clearUnreadCount(toast.workspaceId); removeToast(toast.id); }}
              className="group flex flex-col gap-0.5 px-4 py-3 rounded-2xl bg-[#111118] border border-white/[0.08] shadow-2xl text-left hover:border-emerald-500/20 transition-all duration-200 max-w-xs relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />
              <span className="text-sm font-bold text-white">{toast.title}</span>
              <span className="text-xs text-[#6b6b7a] truncate">{toast.body}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Member Modal ── */}
      {showMemberModal && activeWorkspace && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowMemberModal(false)}>
          <div className="bg-[#111118] rounded-3xl border border-white/[0.08] shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <div>
                <h3 className="text-base font-black text-white">Manage Members</h3>
                <p className="text-xs text-[#6b6b7a]">{activeWorkspace.name}</p>
              </div>
              <button onClick={() => setShowMemberModal(false)} className="p-1.5 rounded-lg hover:bg-white/[0.05] text-[#6b6b7a] hover:text-white transition-all">✕</button>
            </div>

            <div className="p-4 border-b border-white/[0.06]">
              <button
                className="w-full py-2.5 rounded-xl bg-emerald-400 text-[#060d0a] text-sm font-bold hover:bg-emerald-300 hover:shadow-lg hover:shadow-emerald-500/25 transition-all duration-150"
                onClick={() => { setShowMemberModal(false); setShowTransferModal(true); }}
              >
                Transfer Ownership
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {isLoadingMembers ? (
                <p className="text-sm text-[#6b6b7a] text-center py-8">Loading members...</p>
              ) : (
                <div className="space-y-2">
                  <span className={labelCls}>Members ({workspaceMembers.length})</span>
                  {workspaceMembers.map((member: any) => {
                    const isMemberCreator = member._id === activeWorkspace.createdBy;
                    const isCurrentUser = member._id === user?._id;
                    return (
                      <div key={member._id} className="flex items-center justify-between p-3 rounded-xl bg-[#18181f] border border-white/[0.06]">
                        <div className="flex items-center gap-3">
                          {member.photoUrl ? (
                            <img src={member.photoUrl} alt={member.name} className="w-9 h-9 rounded-full object-cover" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 flex items-center justify-center text-[#060d0a] text-sm font-black">
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {member.name}
                              {isMemberCreator && <span className="ml-1.5 text-xs">👑</span>}
                              {isCurrentUser && <span className="ml-1.5 text-xs text-[#4a4a5a]">(You)</span>}
                            </p>
                            <p className="text-xs text-[#6b6b7a]">{member.email}</p>
                          </div>
                        </div>
                        {!isMemberCreator && !isCurrentUser && (
                          <button
                            className="text-xs px-3 py-1.5 rounded-lg bg-red-500/[0.07] border border-red-500/20 text-red-400 hover:bg-red-500/15 font-semibold transition-all disabled:opacity-50"
                            disabled={selectedMemberToRemove === member._id}
                            onClick={() => removeMember(activeWorkspace._id, member._id)}
                          >
                            {selectedMemberToRemove === member._id ? "Removing..." : "Remove"}
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

      {/* ── Transfer Ownership Modal ── */}
      {showTransferModal && activeWorkspace && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowTransferModal(false)}>
          <div className="bg-[#111118] rounded-3xl border border-white/[0.08] shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <h3 className="text-base font-black text-white">Transfer Ownership</h3>
              <button onClick={() => setShowTransferModal(false)} className="p-1.5 rounded-lg hover:bg-white/[0.05] text-[#6b6b7a] hover:text-white transition-all">✕</button>
            </div>

            <div className="p-5">
              <p className="text-sm text-[#6b6b7a] mb-5 leading-relaxed">
                Select a member to become the new owner of{" "}
                <strong className="text-white">{activeWorkspace.name}</strong>. You will remain as a regular member.
              </p>
              <div className="space-y-2 mb-5 max-h-64 overflow-y-auto">
                {workspaceMembers.filter((m: any) => m._id !== user?._id).map((member: any) => (
                  <button
                    key={member._id}
                    onClick={() => setSelectedNewOwner(member._id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-150 ${
                      selectedNewOwner === member._id
                        ? "bg-emerald-500/[0.08] border-emerald-500/30"
                        : "bg-[#18181f] border-white/[0.06] hover:border-white/[0.1]"
                    }`}
                  >
                    {member.photoUrl ? (
                      <img src={member.photoUrl} alt={member.name} className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 flex items-center justify-center text-[#060d0a] text-sm font-black">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-white">{member.name}</p>
                      <p className="text-xs text-[#6b6b7a]">{member.email}</p>
                    </div>
                    {selectedNewOwner === member._id && (
                      <span className="ml-auto text-emerald-400 font-black text-sm">✓</span>
                    )}
                  </button>
                ))}
              </div>
              <button
                className="w-full py-2.5 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-400 hover:shadow-lg hover:shadow-orange-500/25 disabled:opacity-50 transition-all duration-150"
                disabled={!selectedNewOwner || isTransferringOwnership}
                onClick={() => transferOwnership(activeWorkspace._id, selectedNewOwner)}
              >
                {isTransferringOwnership ? "Transferring..." : "Transfer Ownership"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}