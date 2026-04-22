"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import api from "@/lib/api";

type Mode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("register");
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function patch(field: string, value: string) {
    setForm((c) => ({ ...c, [field]: value }));
  }

  function validateRegisterForm() {
    const name = form.name.trim();
    if (name.length < 2 || name.length > 40) return "Name must be between 2 and 40 characters.";
    if (form.password.length < 6) return "Password must be at least 6 characters.";
    if (form.password !== form.confirmPassword) return "Passwords do not match.";
    return null;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (mode === "register") {
      const err = validateRegisterForm();
      if (err) { setError(err); return; }
    }
    setIsSubmitting(true);
    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
      const payload = mode === "login"
        ? { email: form.email.trim().toLowerCase(), password: form.password }
        : { name: form.name.trim(), email: form.email.trim().toLowerCase(), password: form.password };

      const { data } = await api.post(endpoint, payload);
      window.localStorage.setItem("collabx_token", data.token);
      window.localStorage.setItem("collabx_user", JSON.stringify(data.user));

      try {
        const { data: wsData } = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/workspaces`,
          { headers: { Authorization: `Bearer ${data.token}` } },
        );
        window.localStorage.setItem("collabx_workspaces_cache", JSON.stringify(wsData.workspaces));
      } catch {}

      router.replace("/workspace");
    } catch (err) {
      if (axios.isAxiosError<{ message?: string }>(err)) {
        const msg = err.response?.data?.message?.trim();
        if (msg) { setError(msg); return; }
        if (!err.response) { setError("Could not reach the API. Make sure the server is running."); return; }
      }
      setError(mode === "login" ? "We could not sign you in. Please try again." : "We could not create your account. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputCls = "w-full px-4 py-3 text-sm rounded-xl border border-white/[0.08] bg-[#18181f] text-[#d0cec8] placeholder:text-[#3a3a4a] focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/30 transition-all duration-150";

  const features = [
    { icon: "💬", title: "Real-time Chat", desc: "Instant messaging with live typing indicators" },
    { icon: "🏠", title: "Workspace Management", desc: "Create and join teams with invite codes" },
    { icon: "📝", title: "Collaborative Editor", desc: "Live shared document with autosave" },
    { icon: "🔒", title: "Secure & Fast", desc: "JWT authentication with WebSocket sync" },
  ];

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-[#f0ede8] flex flex-col overflow-hidden">

      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-200px] right-[-100px] w-[700px] h-[700px] bg-emerald-500/[0.04] rounded-full blur-[120px]" />
        <div className="absolute bottom-[-200px] left-[-100px] w-[600px] h-[600px] bg-emerald-500/[0.03] rounded-full blur-[100px]" />
      </div>

      {/* Navbar */}
      <nav className="relative bg-[#0a0a0f]  z-10 flex items-center justify-between px-8 py-4 border-b border-white/[0.06]">
        <button onClick={() => router.push("/")} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-[10px] bg-emerald-400 flex items-center justify-center text-sm font-black text-[#060d0a] shadow-lg shadow-emerald-500/30">
            ⚡
          </div>
          <span className="text-lg font-black tracking-tight text-white">CollabX</span>
        </button>
        <button
          onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-[#9898a8] hover:text-white hover:bg-white/[0.05] border border-transparent hover:border-white/[0.08] transition-all duration-150"
        >
          {mode === "login" ? "Need an account?" : "Already registered?"}
        </button>
      </nav>

      {/* Body */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-12 items-center">

          {/* ── Left ── */}
          <section className="space-y-8 hidden lg:block">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-400 tracking-wide">Real-time Collaboration</span>
            </div>

            <h1 className="text-5xl font-black leading-[1.05] tracking-tight">
              Chat-first
              <br />
              collaboration
              <span className="block text-emerald-400 mt-1">that feels live.</span>
            </h1>

            <p className="text-base text-[#6b6b7a] leading-relaxed max-w-md">
              The modern workspace for teams who move fast. Create workspaces, invite your team, and collaborate in real-time.
            </p>

            <div className="grid grid-cols-2 gap-3">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="p-4 rounded-2xl bg-[#111118] border border-white/[0.06] hover:border-white/[0.1] transition-all duration-150"
                >
                  <span className="text-xl">{f.icon}</span>
                  <p className="text-sm font-bold text-white mt-2">{f.title}</p>
                  <p className="text-xs text-[#6b6b7a] mt-0.5 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Right — Auth Form ── */}
          <section className="w-full max-w-md mx-auto">
            <div className="bg-[#0d0d12] border border-white/[0.08] rounded-3xl shadow-2xl p-8 space-y-6">

              {/* Form header */}
              <div>
                <h2 className="text-2xl font-black text-white">
                  {mode === "login" ? "Welcome back" : "Create your account"}
                </h2>
                <p className="text-sm text-[#6b6b7a] mt-1">
                  {mode === "login"
                    ? "Sign in to your CollabX workspace."
                    : "Join thousands of teams collaborating in real-time."}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                {mode === "register" && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#4a4a5a] uppercase tracking-widest px-0.5">Full name</label>
                    <input
                      className={inputCls}
                      placeholder="John Doe"
                      value={form.name}
                      onChange={(e) => patch("name", e.target.value)}
                      required
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#4a4a5a] uppercase tracking-widest px-0.5">Email address</label>
                  <input
                    className={inputCls}
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={(e) => patch("email", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#4a4a5a] uppercase tracking-widest px-0.5">Password</label>
                  <input
                    className={inputCls}
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={form.password}
                    onChange={(e) => patch("password", e.target.value)}
                    required
                    minLength={6}
                  />
                </div>

                {mode === "register" && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#4a4a5a] uppercase tracking-widest px-0.5">Confirm password</label>
                    <input
                      className={inputCls}
                      type="password"
                      placeholder="Repeat your password"
                      value={form.confirmPassword}
                      onChange={(e) => patch("confirmPassword", e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-500/[0.07] border border-red-500/20 text-red-400 text-xs">
                    <span className="shrink-0 mt-0.5">⚠</span> {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl bg-emerald-400 text-[#060d0a] text-sm font-black hover:bg-emerald-300 hover:shadow-lg hover:shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 mt-1"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-[#060d0a]/30 border-t-[#060d0a] rounded-full animate-spin" />
                      {mode === "login" ? "Signing in..." : "Creating account..."}
                    </span>
                  ) : (
                    mode === "login" ? "Sign In →" : "Create Account →"
                  )}
                </button>
              </form>

              {/* Switch mode */}
              <p className="text-center text-xs text-[#4a4a5a]">
                {mode === "login" ? "Don't have an account? " : "Already have an account? "}
                <button
                  type="button"
                  onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
                  className="text-emerald-400 font-semibold hover:text-emerald-300 transition-colors"
                >
                  {mode === "login" ? "Sign up free" : "Sign in"}
                </button>
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}