"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import type { Workspace } from "@/types";

function getRequestErrorMessage(error: unknown, fallbackMessage: string) {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    const serverMessage = error.response?.data?.message?.trim();
    if (serverMessage) return serverMessage;
    if (!error.response)
      return "The app could not reach the API. Make sure the server is still running.";
  }
  return fallbackMessage;
}

// ── Skeleton loader ──
function WorkspaceSkeleton() {
  return (
    <div className="animate-pulse flex items-center justify-between p-5 rounded-2xl bg-[#111118] border border-white/[0.06]">
      <div className="space-y-2">
        <div className="h-4 w-40 rounded-lg bg-white/[0.07]" />
        <div className="h-3 w-24 rounded-lg bg-white/[0.04]" />
      </div>
      <div className="h-4 w-4 rounded bg-white/[0.05]" />
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceCode, setWorkspaceCode] = useState("");
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    const token = window.localStorage.getItem("collabx_token");
    if (!token) { router.replace("/login"); return; }

    async function bootstrap() {
      try {
        const [{ data: me }, { data: workspaceData }] = await Promise.all([
          api.get("/auth/me"),
          api.get("/workspaces"),
        ]);
        setUser(me.user);
        setWorkspaces(workspaceData.workspaces);
      } catch (error) {
        setError(getRequestErrorMessage(error, "We could not load your dashboard."));
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          window.localStorage.removeItem("collabx_token");
          window.localStorage.removeItem("collabx_user");
          router.replace("/login");
        }
      } finally {
        setLoading(false);
      }
    }

    bootstrap();
  }, [router]);

  function handleLogout() {
    window.localStorage.removeItem("collabx_token");
    window.localStorage.removeItem("collabx_user");
    router.replace("/login");
  }

  function handleWorkspaceClick(workspaceId: string) {
    router.push(`/workspace?id=${workspaceId}`);
  }

  async function createWorkspace(e: React.FormEvent) {
    e.preventDefault();
    if (!workspaceName.trim()) return;
    setIsActionLoading(true);
    setError("");
    try {
      const { data } = await api.post("/workspaces", {
        name: workspaceName.trim(),
      });
      router.push(`/workspace?id=${data.workspace._id}`);
    } catch (err) {
      setError(getRequestErrorMessage(err, "Workspace creation failed. Please try again."));
      setIsActionLoading(false);
    }
  }

  async function joinWorkspace(e: React.FormEvent) {
    e.preventDefault();
    if (!workspaceCode.trim()) return;
    setIsActionLoading(true);
    setError("");
    try {
      const { data } = await api.post("/workspaces/join", {
        code: workspaceCode.trim().toUpperCase(),
      });
      router.push(`/workspace?id=${data.workspace._id}`);
    } catch (err) {
      setError(getRequestErrorMessage(err, "We could not join that workspace. Check the code and try again."));
      setIsActionLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-[#f0ede8]">

      {/* ── Background ── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-emerald-500/[0.06] blur-[120px]" />
        <div className="absolute bottom-0 -left-40 w-[500px] h-[500px] rounded-full bg-blue-600/[0.04] blur-[100px]" />
      </div>

      {/* ── Page content ── */}
      <div className="relative z-10 max-w-[860px] mx-auto px-6 pt-28 pb-20">

        {/* ── Header ── */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold tracking-widest uppercase mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Dashboard
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white mb-2">
            {user ? (
              <>Welcome back, <span className="text-emerald-400">{user.name.split(" ")[0]}</span></>
            ) : (
              "Dashboard"
            )}
          </h1>
          <p className="text-[#6b6b7a] text-base">
            {user?.email && (
              <span className="text-[#4a4a5a] mr-2">{user.email} ·</span>
            )}
            Select a workspace below to start collaborating
          </p>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="mb-6 flex items-start gap-3 px-4 py-3.5 rounded-xl bg-red-500/[0.07] border border-red-500/20 text-red-400 text-sm">
            <span className="mt-0.5 shrink-0">⚠</span>
            {error}
          </div>
        )}

        {/* ── Stats row ── */}
        {!loading && (
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { label: "Workspaces", value: workspaces.length, icon: "🏢" },
              { label: "Active Now", value: "3", icon: "🟢" },
              { label: "Messages Today", value: "—", icon: "💬" },
            ].map((s) => (
              <div
                key={s.label}
                className="py-4 px-5 rounded-xl bg-[#111118] border border-white/[0.06] hover:border-emerald-500/15 transition-colors duration-200"
              >
                <div className="text-xl mb-1">{s.icon}</div>
                <div className="text-2xl font-black text-white leading-none">{s.value}</div>
                <div className="text-[11px] text-[#6b6b7a] mt-1 font-medium uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Workspaces section ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white tracking-tight">Your Workspaces</h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/15 hover:border-emerald-500/30 transition-all duration-150"
            >
              <span className="text-base leading-none">+</span> New Workspace
            </button>
          </div>

          <div className="space-y-2">
            {loading ? (
              // Skeleton
              Array.from({ length: 3 }).map((_, i) => <WorkspaceSkeleton key={i} />)
            ) : workspaces.length === 0 ? (
              // Empty state
              <div className="relative rounded-2xl bg-[#111118] border border-white/[0.06] px-8 py-14 text-center overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent" />
                <div className="text-4xl mb-4">🏗️</div>
                <p className="text-white font-bold text-lg mb-1">No workspaces yet</p>
                <p className="text-[#6b6b7a] text-sm mb-6">
                  Create or join a workspace to start collaborating with your team.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="group inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-400 text-[#060d0a] font-bold text-sm hover:bg-emerald-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-500/25 transition-all duration-200"
                  >
                    Create Workspace
                    <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
                  </button>
                  <button
                    onClick={() => setShowJoinModal(true)}
                    className="px-6 py-2.5 rounded-xl bg-[#18181f] border border-white/[0.06] text-sm text-[#9898a8] font-bold hover:text-white hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-150"
                  >
                    Join with Code
                  </button>
                </div>
              </div>
            ) : (
              // Workspace list
              workspaces.map((workspace, i) => (
                <button
                  key={workspace._id}
                  onClick={() => handleWorkspaceClick(workspace._id)}
                  className="group w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-[#111118] border border-white/[0.06] hover:border-emerald-500/20 hover:bg-emerald-500/[0.03] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/40 transition-all duration-200 text-left"
                >
                  <div className="flex items-center gap-4">
                    {/* Workspace avatar */}
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-700/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-black text-base shrink-0 group-hover:border-emerald-500/40 transition-colors">
                      {workspace.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors duration-200">
                        {workspace.name}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-[#6b6b7a] font-mono">
                          Code: <span className="text-[#9898a8]">{workspace.code}</span>
                        </span>
                        <span className="w-1 h-1 rounded-full bg-[#3a3a4a]" />
                        <span className="text-[11px] text-[#6b6b7a]">
                          #{i + 1}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="hidden group-hover:inline-flex items-center gap-1 text-[11px] text-emerald-400 font-semibold transition-all">
                      Open
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] group-hover:bg-emerald-500/10 group-hover:border-emerald-500/20 flex items-center justify-center transition-all duration-200">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-[#6b6b7a] group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all duration-200"
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── Quick actions ── */}
        {!loading && workspaces.length > 0 && (
          <div className="mt-8 p-5 rounded-2xl bg-[#111118] border border-white/[0.06]">
            <p className="text-xs font-semibold text-[#6b6b7a] uppercase tracking-widest mb-3">Quick Actions</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Create Workspace", icon: "➕", action: () => setShowCreateModal(true) },
                { label: "Join with Code", icon: "🔗", action: () => setShowJoinModal(true) },
              ].map((qa) => (
                <button
                  key={qa.label}
                  onClick={qa.action}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#18181f] border border-white/[0.06] text-sm text-[#9898a8] font-medium hover:text-white hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-150"
                >
                  <span>{qa.icon}</span>
                  {qa.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Create Modal ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#111118] border border-white/[0.06] rounded-2xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Create Workspace</h3>
            <p className="text-sm text-[#6b6b7a] mb-6">Give your new workspace a name to get started.</p>
            <form onSubmit={createWorkspace}>
              <input
                type="text"
                placeholder="e.g. Engineering Team"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                className="w-full bg-[#18181f] border border-white/[0.06] rounded-xl px-4 py-3 text-white placeholder-[#4a4a5a] focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all mb-6"
                autoFocus
                required
              />
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-[#9898a8] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActionLoading || !workspaceName.trim()}
                  className="px-5 py-2 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isActionLoading ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Join Modal ── */}
      {showJoinModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#111118] border border-white/[0.06] rounded-2xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Join Workspace</h3>
            <p className="text-sm text-[#6b6b7a] mb-6">Enter the 6-character code from your team.</p>
            <form onSubmit={joinWorkspace}>
              <input
                type="text"
                placeholder="e.g. ABCDEF"
                value={workspaceCode}
                onChange={(e) => setWorkspaceCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="w-full bg-[#18181f] border border-white/[0.06] rounded-xl px-4 py-3 text-white placeholder-[#4a4a5a] focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 uppercase tracking-widest transition-all mb-6"
                autoFocus
                required
              />
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-[#9898a8] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActionLoading || workspaceCode.length < 6}
                  className="px-5 py-2 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isActionLoading ? "Joining..." : "Join"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}