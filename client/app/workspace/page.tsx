"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ChatBox from "@/components/ChatBox";
import Editor from "@/components/Editor";
import api from "@/lib/api";
import { connectSocket, disconnectSocket } from "@/lib/socket";
import type { Message, User, Workspace } from "@/types";

export default function WorkspacePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceCode, setWorkspaceCode] = useState("");
  const [profileName, setProfileName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const activeWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace._id === activeWorkspaceId) ?? null,
    [activeWorkspaceId, workspaces]
  );

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
        setWorkspaces(workspaceData.workspaces);
        setActiveWorkspaceId(workspaceData.workspaces[0]?._id ?? "");

        const socket = connectSocket(token);
        socket.off("new-message");
        socket.on("new-message", (message: Message) => {
          setMessages((current) => {
            const alreadyExists = current.some((entry) => entry._id === message._id);
            return alreadyExists ? current : [...current, message];
          });
        });
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
      disconnectSocket();
    };
  }, [router]);

  useEffect(() => {
    if (!activeWorkspaceId) {
      setMessages([]);
      return;
    }

    async function loadMessages() {
      try {
        const { data } = await api.get(`/messages/${activeWorkspaceId}`);
        setMessages(data.messages);

        const socket = connectSocket(window.localStorage.getItem("collabx_token") ?? "");
        socket.emit("join-workspace", { workspaceId: activeWorkspaceId });
      } catch {
        setError("We could not load workspace messages.");
      }
    }

    loadMessages();
  }, [activeWorkspaceId]);

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
        const exists = current.some((workspace) => workspace._id === data.workspace._id);
        return exists ? current : [data.workspace, ...current];
      });
      setActiveWorkspaceId(data.workspace._id);
      setWorkspaceCode("");
    } catch {
      setError("We could not join that workspace. Check the code and try again.");
    }
  }

  async function updateProfile() {
    const trimmedName = profileName.trim();

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
      });

      setUser(data.user);
      setProfileName(data.user.name);
      setMessages((current) =>
        current.map((message) =>
          message.user?._id === data.user._id
            ? { ...message, user: { ...message.user, name: data.user.name } }
            : message
        )
      );
      window.localStorage.setItem("collabx_user", JSON.stringify(data.user));
      setProfileSuccess("Profile updated.");
    } catch {
      setProfileError("We could not update your name yet.");
    } finally {
      setIsSavingProfile(false);
    }
  }

  function handleLogout() {
    disconnectSocket();
    window.localStorage.removeItem("collabx_token");
    window.localStorage.removeItem("collabx_user");
    router.replace("/login");
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
            <h1 style={{ marginBottom: 8 }}>{user ? `Hi, ${user.name}` : "Workspace"}</h1>
            <p className="muted" style={{ margin: 0 }}>
              Create a workspace, share the invite code, and chat live with everyone in the room.
            </p>
          </div>

          <div className="row wrap">
            {activeWorkspace ? (
              <span className="code-badge">Code: {activeWorkspace.code}</span>
            ) : null}
            <button className="button secondary" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        <div className="workspace-grid">
          <aside className="workspace-sidebar">
            <section className="panel stack">
              <div className="row wrap" style={{ justifyContent: "space-between" }}>
                <h3>Profile details</h3>
                <span className="workspace-chip">Account</span>
              </div>
              <input
                className="input"
                placeholder="Your display name"
                value={profileName}
                onChange={(event) => setProfileName(event.target.value)}
              />
              <input
                className="input"
                value={user?.email ?? ""}
                disabled
                readOnly
              />
              <button className="button secondary" onClick={updateProfile} disabled={isSavingProfile}>
                {isSavingProfile ? "Saving..." : "Save Profile"}
              </button>
              {profileError ? <p className="error">{profileError}</p> : null}
              {profileSuccess ? <p className="success">{profileSuccess}</p> : null}
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
              <div className="row wrap" style={{ justifyContent: "space-between" }}>
                <h3>Your workspaces</h3>
                <span className="workspace-chip">{workspaces.length} total</span>
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
                    <div>{workspace.name}</div>
                    <small className="muted">Invite code: {workspace.code}</small>
                  </button>
                ))}
                {workspaces.length === 0 ? (
                  <p className="muted">No workspaces yet. Create one to start chatting.</p>
                ) : null}
              </div>
              {error ? <p className="error">{error}</p> : null}
            </section>
          </aside>

          <section className="workspace-main">
            <ChatBox
              activeWorkspace={activeWorkspace}
              messages={messages}
              onMessageSent={(message) =>
                setMessages((current) => {
                  const exists = current.some((entry) => entry._id === message._id);
                  return exists ? current : [...current, message];
                })
              }
            />
            <Editor activeWorkspace={activeWorkspace} />
          </section>
        </div>
      </div>
    </main>
  );
}
