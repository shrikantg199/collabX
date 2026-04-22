"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function HomePage() {
  const router = useRouter();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const features = [
    {
      icon: "💬",
      title: "Real-time Chat",
      desc: "Instant messaging with typing indicators and live updates. Never miss a conversation.",
      featured: true,
    },
    {
      icon: "🏢",
      title: "Workspace Management",
      desc: "Create, join, and manage workspaces with invite codes. Full control over your teams.",
      featured: false,
    },
    {
      icon: "🔒",
      title: "Secure Authentication",
      desc: "JWT-based auth with role-based access control. Your data stays protected.",
      featured: false,
    },
    {
      icon: "⚡",
      title: "Lightning Fast",
      desc: "Built with Next.js and Socket.IO for blazing fast real-time communication.",
      featured: true,
    },
    {
      icon: "👥",
      title: "Team Collaboration",
      desc: "Member management, ownership transfer, and role permissions for effective teamwork.",
      featured: false,
    },
    {
      icon: "🔔",
      title: "Smart Notifications",
      desc: "Browser notifications and unread counts. Stay updated even when away.",
      featured: false,
    },
  ];

  const techStack = [
    "Next.js 15", "React 19", "TypeScript", "Node.js",
    "Socket.IO", "MongoDB", "Redis", "Express",
  ];

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-[#f0ede8] overflow-x-hidden">

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
        <div className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full bg-emerald-500/[0.07] blur-[120px]" />
        <div className="absolute bottom-0 -left-40 w-[600px] h-[600px] rounded-full bg-blue-600/[0.04] blur-[120px]" />
      </div>

      {/* ── Navbar ── */}
      {/* Header is handled by layout.tsx */}

      {/* ── Hero ── */}
      <section className="relative z-10 max-w-[1200px] mx-auto px-6 sm:px-8 pt-24 sm:pt-36 pb-16 sm:pb-20">
        <div className="grid lg:grid-cols-2 gap-20 items-center">

          {/* Left */}
          <div
            className={`space-y-8 transition-all duration-700 ${
              isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold tracking-widest uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Real-time Collaboration Platform
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-[68px] font-black leading-[1.05] sm:leading-[1.02] tracking-tight text-center lg:text-left">
              Work Together,
              <span
                className="block"
                style={{
                  background: "linear-gradient(100deg, #f0ede8 0%, #00e87a 45%, #f0ede8 85%)",
                  backgroundSize: "200% auto",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Ship Faster.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-[#6b6b7a] leading-relaxed max-w-md mx-auto lg:mx-0 text-center lg:text-left">
              The modern workspace for teams who move fast. Chat, collaborate,
              and build together in real-time with powerful workspace management.
            </p>

            <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center lg:justify-start">
              <button
                onClick={() => router.push("/login")}
                className="group px-8 py-3.5 rounded-xl bg-emerald-400 text-[#060d0a] font-bold text-base hover:bg-emerald-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-emerald-500/30 transition-all duration-200 flex items-center gap-2"
              >
                Start Collaborating
                <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
              </button>
              <button
                onClick={() => router.push("/login")}
                className="px-8 py-3.5 rounded-xl border border-white/[0.08] text-[#9898a8] font-medium text-base hover:bg-white/[0.04] hover:border-white/[0.14] hover:text-white hover:-translate-y-0.5 transition-all duration-200"
              >
                Sign In
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-2">
              {[
                { num: "500+", label: "Teams Onboard" },
                { num: "<50ms", label: "Avg Latency" },
                { num: "99.9%", label: "Uptime SLA" },
              ].map((s) => (
                <div
                  key={s.num}
                  className="flex-1 py-4 px-3 rounded-xl bg-[#111118] border border-white/[0.06] text-center hover:border-emerald-500/20 hover:bg-emerald-500/[0.04] transition-all duration-200"
                >
                  <div className="text-2xl font-black text-emerald-400 leading-none">{s.num}</div>
                  <div className="text-[10px] text-[#6b6b7a] mt-1.5 font-semibold uppercase tracking-widest">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right – Chat Window */}
          <div
            className={`relative transition-all duration-700 delay-200 ${
              isLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95"
            }`}
          >
            {/* Glow behind */}
            <div className="absolute inset-0 -m-12 rounded-full bg-emerald-500/[0.08] blur-3xl pointer-events-none" />

            {/* Decorative rings */}
            <div className="absolute -right-14 top-1/2 -translate-y-1/2 w-64 h-64 rounded-full border border-emerald-500/[0.08] pointer-events-none" />
            <div className="absolute -right-7 top-1/2 -translate-y-1/2 w-36 h-36 rounded-full border border-emerald-500/[0.06] pointer-events-none" />

            <div
              className="relative rounded-3xl bg-[#111118] border border-white/[0.07] overflow-hidden"
              style={{
                boxShadow: "0 0 0 1px rgba(0,232,122,0.05), 0 40px 80px rgba(0,0,0,0.7)",
                animation: "float 6s ease-in-out infinite",
              }}
            >
              {/* Chrome bar */}
              <div className="flex items-center gap-3 px-5 py-4 bg-[#18181f] border-b border-white/[0.06]">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f5a]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ffbe2e]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#2ac840]" />
                </div>
                <span className="ml-3 text-xs font-semibold text-[#6b6b7a]"># team-general</span>
                <div className="ml-auto flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  3 online
                </div>
              </div>

              {/* Messages */}
              <div className="p-6 space-y-4 min-h-[300px] bg-[#111118]">
                {/* Msg 1 */}
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 flex items-center justify-center text-xs font-bold text-[#060d0a] shrink-0">A</div>
                  <div className="bg-[#18181f] border border-white/[0.06] rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%]">
                    <div className="text-[10px] font-bold text-emerald-400 mb-1 uppercase tracking-wider">Alice</div>
                    <div className="text-sm text-[#d0cec8]">Hey team! How's the sprint going? 🚀</div>
                  </div>
                </div>

                {/* Msg 2 – right */}
                <div className="flex items-start gap-2.5 flex-row-reverse">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-violet-800 flex items-center justify-center text-xs font-bold text-white shrink-0">Y</div>
                  <div className="bg-emerald-400 rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%]">
                    <div className="text-sm text-[#060d0a] font-semibold">Making great progress! Just pushed the new features ✨</div>
                  </div>
                </div>

                {/* Msg 3 */}
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-700 flex items-center justify-center text-xs font-bold text-white shrink-0">B</div>
                  <div className="bg-[#18181f] border border-white/[0.06] rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%]">
                    <div className="text-[10px] font-bold text-blue-400 mb-1 uppercase tracking-wider">Bob</div>
                    <div className="text-sm text-[#d0cec8]">Awesome! Let's review together 👍</div>
                  </div>
                </div>

                {/* Msg 4 – right */}
                <div className="flex items-start gap-2.5 flex-row-reverse">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-violet-800 flex items-center justify-center text-xs font-bold text-white shrink-0">Y</div>
                  <div className="bg-emerald-400 rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%]">
                    <div className="text-sm text-[#060d0a] font-semibold">PR is up! lgtm 🔥</div>
                  </div>
                </div>

                {/* Typing */}
                <div className="flex items-center gap-2 text-xs text-[#6b6b7a]">
                  <div className="flex gap-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:300ms]" />
                  </div>
                  Alice is typing...
                </div>
              </div>

              {/* Input bar */}
              <div className="px-5 py-4 bg-[#18181f] border-t border-white/[0.06] flex items-center gap-3">
                <div className="flex-1 bg-[#111118] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-[#3a3a4a]">
                  Message #team-general...
                </div>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm font-bold">
                  ↑
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="relative z-10 max-w-[1200px] mx-auto px-6 sm:px-8 py-16 sm:py-24">
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-3 text-[11px] font-bold tracking-[0.12em] uppercase text-emerald-400">
            <span className="w-6 h-px bg-emerald-400/50" />
            Everything You Need
            <span className="w-6 h-px bg-emerald-400/50" />
          </div>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white">
            Built for teams{" "}
            <span className="text-[#3a3a4a] font-light">who move fast.</span>
          </h2>
          <p className="text-[#6b6b7a] text-lg max-w-lg mx-auto">
            Powerful features to supercharge your collaboration
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <div
              key={i}
              className={`group p-7 rounded-2xl border transition-all duration-300 hover:-translate-y-1.5 cursor-default relative overflow-hidden
                ${f.featured
                  ? "bg-emerald-500/[0.05] border-emerald-500/20 hover:border-emerald-500/40"
                  : "bg-[#111118] border-white/[0.06] hover:border-emerald-500/15 hover:bg-emerald-500/[0.03]"
                }`}
            >
              {/* Top shimmer */}
              <div
                className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent transition-opacity duration-300 ${
                  f.featured ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                }`}
              />

              {f.featured && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest mb-4">
                  ★ Core Feature
                </div>
              )}

              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className={`text-lg font-bold mb-2.5 tracking-tight transition-colors duration-200 ${
                f.featured ? "text-emerald-300" : "text-white group-hover:text-emerald-300"
              }`}>
                {f.title}
              </h3>
              <p className="text-sm text-[#6b6b7a] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative z-10 max-w-[1200px] mx-auto px-6 sm:px-8 py-12 sm:py-16">
        <div className="relative rounded-3xl bg-[#111118] border border-white/[0.07] p-10 sm:p-20 text-center overflow-hidden">
          {/* Top edge line */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />
          {/* Glow */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-emerald-500/[0.07] blur-3xl rounded-full pointer-events-none" />

          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold tracking-widest uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Free forever for small teams
            </div>

            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
              Ready to Transform
              <br />
              <span className="text-[#3a3a4a] font-light">Your Team's Workflow?</span>
            </h2>

            <p className="text-[#6b6b7a] text-lg max-w-xl mx-auto">
              Join 500+ teams already collaborating faster with CollabX. No credit card required.
            </p>

            <button
              onClick={() => router.push("/login")}
              className="group inline-flex items-center gap-3 px-12 py-4 rounded-xl bg-emerald-400 text-[#060d0a] font-bold text-lg hover:bg-emerald-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/30 transition-all duration-200"
            >
              Get Started Free Today
              <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/[0.06] py-12 mt-8">
        <div className="max-w-[1200px] mx-auto px-8 text-center space-y-6">
          <div className="flex items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-[10px] bg-emerald-400 flex items-center justify-center text-sm font-bold text-[#060d0a] shadow-lg shadow-emerald-500/30">
              ⚡
            </div>
            <span className="text-xl font-black tracking-tight text-white">CollabX</span>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {techStack.map((tech) => (
              <span
                key={tech}
                className="px-3 py-1 rounded-full bg-[#111118] border border-white/[0.06] text-[#6b6b7a] text-xs font-medium hover:border-emerald-500/20 hover:text-emerald-400 hover:bg-emerald-500/[0.04] transition-all duration-150 cursor-default"
              >
                {tech}
              </span>
            ))}
          </div>

          <div className="space-y-1">
            <p className="text-[#6b6b7a] text-sm">Built with ❤️ for teams who ship fast</p>
            <p className="text-[#3a3a4a] text-xs">© 2026 CollabX. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Float keyframe – one-liner, no custom CSS classes */}
      <style>{`@keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }`}</style>
    </main>
  );
}