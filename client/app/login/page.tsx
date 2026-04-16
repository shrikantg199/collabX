"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

type Mode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("register");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitLabel = mode === "login" ? "Sign In" : "Create Account";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
      const payload =
        mode === "login"
          ? { email: form.email, password: form.password }
          : form;

      const { data } = await api.post(endpoint, payload);
      window.localStorage.setItem("collabx_token", data.token);
      window.localStorage.setItem("collabx_user", JSON.stringify(data.user));
      router.replace("/workspace");
    } catch {
      setError("We could not sign you in yet. Double-check your details and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="shell">
      <div className="auth-layout">
        <section className="hero-card">
          <span className="eyebrow">Day 1 Foundation</span>
          <h1 className="hero-title">Chat-first collaboration that feels live.</h1>
          <p className="hero-copy">
            CollabX starts with the pieces you need on day one: JWT auth, simple
            workspaces, and real-time chat over Socket.IO without Redis in the loop yet.
          </p>
          <div className="hero-grid">
            <div className="hero-chip">Next.js frontend with App Router</div>
            <div className="hero-chip">Express + MongoDB API</div>
            <div className="hero-chip">Socket.IO room-based chat</div>
            <div className="hero-chip">Redis-ready backend structure</div>
          </div>
        </section>

        <section className="panel">
          <div className="row wrap" style={{ justifyContent: "space-between" }}>
            <h2>{mode === "login" ? "Welcome back" : "Create your workspace-ready account"}</h2>
            <button
              className="button secondary"
              type="button"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
            >
              {mode === "login" ? "Need an account?" : "Already registered?"}
            </button>
          </div>

          <form className="stack" onSubmit={handleSubmit}>
            {mode === "register" ? (
              <input
                className="input"
                placeholder="Your name"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                required
              />
            ) : null}

            <input
              className="input"
              type="email"
              placeholder="Email address"
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
              required
            />

            <input
              className="input"
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(event) =>
                setForm((current) => ({ ...current, password: event.target.value }))
              }
              required
              minLength={6}
            />

            {error ? <p className="error">{error}</p> : null}

            <button className="button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Working..." : submitLabel}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
