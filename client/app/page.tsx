"use client";

import Image from "next/image";
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
      icon: "⚡",
      title: "Real-time Chat",
      desc: "Sub-50ms messaging with typing indicators, delivery tracking, and live updates.",
      featured: true,
    },
    {
      icon: "🏗️",
      title: "Workspace Management",
      desc: "Role-based access, team control, and scalable workspace architecture.",
      featured: false,
    },
    {
      icon: "🛡️",
      title: "Secure Auth",
      desc: "JWT + RBAC with production-grade security. Your data stays protected.",
      featured: false,
    },
    {
      icon: "🚀",
      title: "High Performance",
      desc: "Optimized Socket.IO connections and Redis-backed state synchronization.",
      featured: true,
    },
    {
      icon: "🔧",
      title: "Developer First",
      desc: "Built for teams who need instant sync and zero lag in their workflow.",
      featured: false,
    },
    {
      icon: "📊",
      title: "Live Insights",
      desc: "Real-time presence tracking and workspace activity monitoring.",
      featured: false,
    },
  ];

  const techStack = [
    "Next.js 15", "Socket.IO", "Redis", "MongoDB",
    "Express", "TypeScript", "Tailwind CSS", "JWT",
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

      {/* ── Hero ── */}
      <section className="relative z-10 max-w-[1200px] mx-auto px-6 sm:px-8 pt-24 sm:pt-36 pb-12">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Left */}
          <div
            className={`space-y-8 transition-all duration-700 ${
              isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold tracking-widest uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Real-time Collaboration with sub-50ms latency
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-[72px] font-black leading-[1.05] sm:leading-[1.02] tracking-tight text-center lg:text-left">
              Ship Faster with
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
                Instant Sync.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-[#6b6b7a] leading-relaxed max-w-md mx-auto lg:mx-0 text-center lg:text-left">
              Built for dev teams who need instant sync, scalable messaging, and zero lag. 
              The technical choice for high-performance collaboration.
            </p>

            <div className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center lg:justify-start">
              <button
                onClick={() => router.push("/login")}
                className="group px-8 py-3.5 rounded-xl bg-emerald-400 text-[#060d0a] font-bold text-base hover:bg-emerald-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-emerald-500/30 transition-all duration-200 flex items-center gap-2"
              >
                Start Free Workspace
                <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
              </button>
              <button
                className="px-8 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-base hover:bg-white/10 hover:-translate-y-0.5 transition-all duration-200"
              >
                View Live Demo
              </button>
            </div>

            <p className="text-xs text-[#3a3a4a] text-center lg:text-left font-medium">
              No credit card required • Setup in 30 seconds
            </p>
          </div>

          {/* Right – Chat Window */}
          <div
            className={`relative transition-all duration-700 delay-200 ${
              isLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95"
            }`}
          >
            <div className="absolute inset-0 -m-12 rounded-full bg-emerald-500/[0.08] blur-3xl pointer-events-none" />
            
            <div
              className="relative rounded-3xl bg-[#111118] border border-white/[0.07] overflow-hidden"
              style={{
                boxShadow: "0 0 0 1px rgba(0,232,122,0.05), 0 40px 80px rgba(0,0,0,0.7)",
                animation: "float 6s ease-in-out infinite",
              }}
            >
              <div className="flex items-center gap-3 px-5 py-4 bg-[#18181f] border-b border-white/[0.06]">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f5a]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ffbe2e]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#2ac840]" />
                </div>
                <span className="ml-3 text-xs font-semibold text-[#6b6b7a]"># engineering-core</span>
                <div className="ml-auto flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Latency: 12ms
                </div>
              </div>

              <div className="p-6 space-y-4 min-h-[300px] bg-[#111118]">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 flex items-center justify-center text-xs font-bold text-[#060d0a] shrink-0">A</div>
                  <div className="bg-[#18181f] border border-white/[0.06] rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%]">
                    <div className="text-[10px] font-bold text-emerald-400 mb-1 uppercase tracking-wider">Lead Dev</div>
                    <div className="text-sm text-[#d0cec8]">The Socket.IO implementation is solid. Sync is instant.</div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 flex-row-reverse">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-violet-800 flex items-center justify-center text-xs font-bold text-white shrink-0">Y</div>
                  <div className="bg-emerald-400 rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%]">
                    <div className="text-sm text-[#060d0a] font-semibold">Yep, Redis handles the state beautifully 🔥</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-[#6b6b7a]">
                  <div className="flex gap-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:300ms]" />
                  </div>
                  System is ready...
                </div>
              </div>

              <div className="px-5 py-4 bg-[#18181f] border-t border-white/[0.06] flex items-center gap-3">
                <div className="flex-1 bg-[#111118] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-[#3a3a4a]">
                  Message #engineering-core...
                </div>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm font-bold">
                  ↑
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Social Proof ── */}
      <section className="relative z-10 py-12 border-y border-white/[0.03] bg-[#0c0c12]">
        <div className="max-w-[1200px] mx-auto px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <div className="text-2xl font-black text-white">Used by 500+</div>
              <div className="text-xs text-[#6b6b7a] font-bold uppercase tracking-widest mt-1">Developers Worldwide</div>
            </div>
            
            <div className="flex flex-wrap justify-center gap-6 md:gap-12 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
              {["Next.js", "Socket.IO", "Redis", "MongoDB"].map((tech) => (
                <div key={tech} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-lg font-bold text-white tracking-tight">{tech}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="relative z-10 max-w-[1200px] mx-auto px-6 sm:px-8 py-24 sm:py-32">
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-3 text-[11px] font-bold tracking-[0.12em] uppercase text-emerald-400">
            <span className="w-6 h-px bg-emerald-400/50" />
            Simple Workflow
            <span className="w-6 h-px bg-emerald-400/50" />
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            Go live in <span className="text-emerald-400">seconds.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            { step: "01", title: "Create Workspace", desc: "Initialize your private team environment in one click." },
            { step: "02", title: "Invite Your Team", desc: "Secure invite links with role-based access control." },
            { step: "03", title: "Collaborate Instantly", desc: "Experience sub-50ms sync for chat and docs." },
          ].map((item, i) => (
            <div key={i} className="relative p-8 rounded-2xl bg-[#111118] border border-white/[0.06] group hover:border-emerald-500/20 transition-all">
              <div className="text-5xl font-black text-white/5 absolute top-4 right-6 group-hover:text-emerald-500/10 transition-colors">
                {item.step}
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-400/10 flex items-center justify-center text-emerald-400 text-xl font-bold mb-6">
                {i === 0 ? "🏗️" : i === 1 ? "👥" : "⚡"}
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
              <p className="text-[#6b6b7a] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="relative z-10 max-w-[1200px] mx-auto px-6 sm:px-8 py-12">
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-3 text-[11px] font-bold tracking-[0.12em] uppercase text-emerald-400">
            <span className="w-6 h-px bg-emerald-400/50" />
            Technical Excellence
            <span className="w-6 h-px bg-emerald-400/50" />
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            Built for scale.
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div
              key={i}
              className={`group p-8 rounded-2xl border transition-all duration-300 hover:-translate-y-1.5 cursor-default relative overflow-hidden
                ${f.featured
                  ? "bg-emerald-500/[0.05] border-emerald-500/20 hover:border-emerald-500/40"
                  : "bg-[#111118] border-white/[0.06] hover:border-emerald-500/15 hover:bg-emerald-500/[0.03]"
                }`}
            >
              <div className="text-3xl mb-5">{f.icon}</div>
              <h3 className={`text-lg font-bold mb-3 tracking-tight transition-colors duration-200 ${
                f.featured ? "text-emerald-300" : "text-white group-hover:text-emerald-300"
              }`}>
                {f.title}
              </h3>
              <p className="text-sm text-[#6b6b7a] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Differentiation ── */}
      <section className="relative z-10 max-w-[1200px] mx-auto px-6 sm:px-8 py-24 sm:py-32">
        <div className="rounded-3xl bg-[#0c0c12] border border-white/[0.05] p-8 sm:p-16 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/[0.03] blur-[100px] rounded-full" />
          
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">Why CollabX?</h2>
              <p className="text-[#6b6b7a] text-lg mb-8">
                We didn't just build another chat app. We built a high-frequency synchronization engine 
                for professional teams.
              </p>
              
              <div className="space-y-6">
                {[
                  { label: "Performance", x: "<50ms latency vs traditional tools", strong: true },
                  { label: "Updates", x: "Real-time sync vs delayed updates", strong: true },
                  { label: "Focus", x: "Built for developers vs generic chat apps", strong: true },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="mt-1 w-5 h-5 rounded-full bg-emerald-400/10 flex items-center justify-center text-emerald-400 text-[10px]">✓</div>
                    <div>
                      <div className="text-white font-bold">{item.label}</div>
                      <div className="text-[#6b6b7a] text-sm">{item.x}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] text-center">
                <div className="text-3xl font-black text-emerald-400">99.9%</div>
                <div className="text-[10px] text-[#6b6b7a] font-bold uppercase tracking-widest mt-2">Uptime</div>
              </div>
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] text-center">
                <div className="text-3xl font-black text-emerald-400">256-bit</div>
                <div className="text-[10px] text-[#6b6b7a] font-bold uppercase tracking-widest mt-2">Encryption</div>
              </div>
              <div className="col-span-2 p-6 rounded-2xl bg-emerald-400/5 border border-emerald-500/20 text-center">
                <div className="text-xl font-bold text-emerald-300 italic">"Engineered for the speed of thought."</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative z-10 max-w-[1200px] mx-auto px-6 sm:px-8 py-16">
        <div className="relative rounded-3xl bg-[#111118] border border-white/[0.07] p-10 sm:p-20 text-center overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-emerald-500/[0.07] blur-3xl rounded-full pointer-events-none" />

          <div className="relative z-10 space-y-8">
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
              Stop wasting time on
              <br />
              <span className="text-[#3a3a4a] font-light text-2xl sm:text-4xl">slow collaboration tools.</span>
            </h2>

            <p className="text-[#6b6b7a] text-lg max-w-xl mx-auto">
              Start your workspace in 30 seconds. Experience the future of real-time teamwork.
            </p>

            <div className="flex flex-col items-center gap-4">
              <button
                onClick={() => router.push("/login")}
                className="group inline-flex items-center gap-3 px-12 py-4 rounded-xl bg-emerald-400 text-[#060d0a] font-bold text-lg hover:bg-emerald-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/30 transition-all duration-200"
              >
                Get Started Free
                <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
              </button>
              <p className="text-xs text-[#3a3a4a] font-medium">Free forever for small teams. No credit card required.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/[0.06] py-12 mt-8">
        <div className="max-w-[1200px] mx-auto px-8 text-center space-y-6">
          <div className="flex items-center justify-center gap-3">
            <div className="relative w-8 h-8 flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="CollabX Logo"
                width={32}
                height={32}
                className="object-contain"
              />
            </div>
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