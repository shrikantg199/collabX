"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import api from "@/lib/api";

type Mode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("register");
  const [form, setForm] = useState({
    name: "",
    email: "",
    photoUrl: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitLabel = mode === "login" ? "Sign In" : "Create Account";

  function validateRegisterForm() {
    const trimmedName = form.name.trim();
    const trimmedPhotoUrl = form.photoUrl.trim();

    if (trimmedName.length < 2 || trimmedName.length > 40) {
      return "Name must be between 2 and 40 characters.";
    }

    if (form.password.length < 6) {
      return "Password must be at least 6 characters.";
    }

    if (form.password !== form.confirmPassword) {
      return "Password and confirm password must match.";
    }

    if (trimmedPhotoUrl) {
      try {
        const parsedUrl = new URL(trimmedPhotoUrl);

        if (!["http:", "https:"].includes(parsedUrl.protocol)) {
          return "Photo URL must start with http or https.";
        }
      } catch {
        return "Photo URL must be a valid link.";
      }
    }

    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (mode === "register") {
      const validationError = validateRegisterForm();

      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
      const payload =
        mode === "login"
          ? {
              email: form.email.trim().toLowerCase(),
              password: form.password,
            }
          : {
              name: form.name.trim(),
              email: form.email.trim().toLowerCase(),
              photoUrl: form.photoUrl.trim(),
              password: form.password,
            };

      const { data } = await api.post(endpoint, payload);
      window.localStorage.setItem("collabx_token", data.token);
      window.localStorage.setItem("collabx_user", JSON.stringify(data.user));
      router.replace("/workspace");
    } catch (error) {
      if (axios.isAxiosError<{ message?: string }>(error)) {
        const serverMessage = error.response?.data?.message?.trim();

        if (serverMessage) {
          setError(serverMessage);
        } else if (!error.response) {
          setError(
            "The app could not reach the API. Make sure the server is running and your client .env URL is correct.",
          );
        } else {
          setError(
            mode === "login"
              ? "We could not sign you in yet. Please try again."
              : "We could not create your account yet. Please try again.",
          );
        }
      } else {
        setError(
          mode === "login"
            ? "We could not sign you in yet. Please try again."
            : "We could not create your account yet. Please try again.",
        );
      }
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
              <>
                <input
                  className="input"
                  placeholder="Your name"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  required
                />

                <input
                  className="input"
                  placeholder="Photo URL (optional)"
                  value={form.photoUrl}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      photoUrl: event.target.value,
                    }))
                  }
                />
              </>
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

            {mode === "register" ? (
              <input
                className="input"
                type="password"
                placeholder="Confirm password"
                value={form.confirmPassword}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    confirmPassword: event.target.value,
                  }))
                }
                required
                minLength={6}
              />
            ) : null}

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
