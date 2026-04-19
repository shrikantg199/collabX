"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import type { Workspace } from "@/types";

function getRequestErrorMessage(error: unknown, fallbackMessage: string) {
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

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string } | null>(
    null,
  );
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
        setWorkspaces(workspaceData.workspaces);
      } catch (error) {
        setError(
          getRequestErrorMessage(error, "We could not load your dashboard."),
        );
        window.localStorage.removeItem("collabx_token");
        window.localStorage.removeItem("collabx_user");
        router.replace("/login");
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

  if (loading) {
    return (
      <main className="shell">
        <div className="panel">
          <p className="muted">Loading your dashboard...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="shell">
      <div className="panel" style={{ maxWidth: 900, margin: "0 auto" }}>
        <header
          className="row wrap"
          style={{
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 32,
          }}
        >
          <div>
            <span className="eyebrow">CollabX Dashboard</span>
            <h1 style={{ marginBottom: 8 }}>
              {user ? `Welcome back, ${user.name}` : "Dashboard"}
            </h1>
            <p className="muted" style={{ margin: 0 }}>
              Select a workspace to start collaborating
            </p>
          </div>
          <button className="button secondary" onClick={handleLogout}>
            Logout
          </button>
        </header>

        {error ? <p className="error">{error}</p> : null}

        <section>
          <h2 style={{ marginBottom: 16 }}>Your Workspaces</h2>
          <div className="workspace-list">
            {workspaces.map((workspace) => (
              <button
                key={workspace._id}
                className="workspace-item"
                onClick={() => handleWorkspaceClick(workspace._id)}
              >
                <div
                  className="row wrap"
                  style={{ justifyContent: "space-between" }}
                >
                  <div>
                    <strong>{workspace.name}</strong>
                    <small
                      className="muted"
                      style={{ display: "block", marginTop: 4 }}
                    >
                      Code: {workspace.code}
                    </small>
                  </div>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ opacity: 0.5 }}
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </button>
            ))}
            {workspaces.length === 0 ? (
              <div className="panel stack" style={{ marginTop: 16 }}>
                <p className="muted">You haven't joined any workspaces yet.</p>
                <button
                  className="button"
                  onClick={() => router.push("/workspace")}
                >
                  Go to Workspace Page
                </button>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
