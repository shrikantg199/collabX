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
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitLabel = mode === "login" ? "Sign In" : "Create Account";

  function validateRegisterForm() {
    const trimmedName = form.name.trim();

    if (trimmedName.length < 2 || trimmedName.length > 40) {
      return "Name must be between 2 and 40 characters.";
    }

    if (form.password.length < 6) {
      return "Password must be at least 6 characters.";
    }

    if (form.password !== form.confirmPassword) {
      return "Password and confirm password must match.";
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
    <main className="min-h-screen bg-white text-gray-900 pt-20">
      {/* Subtle background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-50 rounded-full blur-[120px] opacity-70" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-50 rounded-full blur-[100px] opacity-50" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center min-h-[calc(100vh-140px)]">
          {/* Left - Hero Card */}
          <section className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-emerald-700">
                Real-time Collaboration
              </span>
            </div>

            <h1 className="text-5xl lg:text-6xl font-black leading-[1.05] tracking-tight text-gray-900">
              Chat-first collaboration
              <span className="block text-emerald-500">that feels live.</span>
            </h1>

            <p className="text-xl text-gray-500 leading-relaxed max-w-lg">
              The modern workspace for teams who move fast. Create workspaces,
              invite your team, and collaborate in real-time with instant
              messaging and powerful tools.
            </p>

            {/* Key Benefits */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white text-xs">✓</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Real-time Chat
                  </h3>
                  <p className="text-sm text-gray-500">
                    Instant messaging with typing indicators
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white text-xs">✓</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Workspace Management
                  </h3>
                  <p className="text-sm text-gray-500">
                    Create and join teams with invite codes
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white text-xs">✓</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Secure & Fast</h3>
                  <p className="text-sm text-gray-500">
                    JWT authentication with live updates
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Right - Auth Form */}
          <section className="bg-white rounded-3xl border border-gray-100 shadow-2xl shadow-gray-200/80 p-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">
                {mode === "login"
                  ? "Welcome back"
                  : "Create your workspace-ready account"}
              </h2>
              <button
                className="px-4 py-2 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-all duration-200 font-medium text-sm"
                type="button"
                onClick={() => setMode(mode === "login" ? "register" : "login")}
              >
                {mode === "login" ? "Need an account?" : "Already registered?"}
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {mode === "register" ? (
                <input
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-gray-900 placeholder-gray-400"
                  placeholder="Your name"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  required
                />
              ) : null}

              <input
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-gray-900 placeholder-gray-400"
                type="email"
                placeholder="Email address"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                required
              />

              <input
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-gray-900 placeholder-gray-400"
                type="password"
                placeholder="Password"
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                required
                minLength={6}
              />

              {mode === "register" ? (
                <input
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-gray-900 placeholder-gray-400"
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

              {error ? (
                <p className="text-red-500 text-sm font-medium">{error}</p>
              ) : null}

              <button
                className="w-full py-3 rounded-lg bg-emerald-500 text-white font-bold hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-500/30 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Working..." : submitLabel}
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
