"use client";

import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

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

  return (
    <main className="min-h-screen bg-white text-gray-900 overflow-hidden pt-20">
      {/* Subtle background texture */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-50 rounded-full blur-[120px] opacity-70" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-50 rounded-full blur-[100px] opacity-50" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-gray-50 rounded-full blur-[80px]" />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-4 pb-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-emerald-700">
                Real-time Collaboration Platform
              </span>
            </div>

            <h1 className="text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight text-gray-900">
              Work Together,
              <span className="block text-emerald-500">Ship Faster.</span>
            </h1>

            <p className="text-xl text-gray-500 leading-relaxed max-w-lg">
              The modern workspace for teams who move fast. Chat, collaborate,
              and build together in real-time with powerful workspace
              management.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => router.push("/login")}
                className="group px-8 py-4 rounded-xl bg-emerald-500 text-white font-bold text-lg hover:bg-emerald-600 hover:shadow-2xl hover:shadow-emerald-500/30 transition-all duration-300 transform hover:scale-105 flex items-center gap-2"
              >
                Start Collaborating Now
                <span className="group-hover:translate-x-1 transition-transform">
                  →
                </span>
              </button>
              <button
                onClick={() => router.push("/login")}
                className="px-8 py-4 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 font-medium text-lg"
              >
                Sign In
              </button>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-8 pt-8 border-t border-gray-100">
              <div>
                <div className="text-3xl font-bold text-emerald-500">500+</div>
                <div className="text-sm text-gray-400 mt-1">Teams onboard</div>
              </div>
              <div className="w-px h-12 bg-gray-100" />
              <div>
                <div className="text-3xl font-bold text-gray-900">&lt;50ms</div>
                <div className="text-sm text-gray-400 mt-1">Avg latency</div>
              </div>
              <div className="w-px h-12 bg-gray-100" />
              <div>
                <div className="text-3xl font-bold text-emerald-500">99.9%</div>
                <div className="text-sm text-gray-400 mt-1">Uptime SLA</div>
              </div>
            </div>
          </div>

          {/* Right Visual - Chat Preview */}
          <div className="relative">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl shadow-gray-200/80 overflow-hidden">
              {/* Window Header */}
              <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                </div>
                <span className="ml-4 text-sm font-medium text-gray-400">
                  Team Workspace
                </span>
              </div>

              {/* Chat Messages */}
              <div className="p-6 space-y-4 min-h-[400px] bg-white">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-white shrink-0">
                    A
                  </div>
                  <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-tl-none px-4 py-3 max-w-[80%]">
                    <div className="text-sm font-semibold text-emerald-600 mb-1">
                      Alice
                    </div>
                    <div className="text-gray-700">
                      Hey team! How's the sprint going? 🚀
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 justify-end">
                  <div className="bg-emerald-500 rounded-2xl rounded-tr-none px-4 py-3 max-w-[80%]">
                    <div className="text-white">
                      Making great progress! Just pushed the new features
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center font-bold text-white shrink-0">
                    B
                  </div>
                  <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-tl-none px-4 py-3 max-w-[80%]">
                    <div className="text-sm font-semibold text-gray-700 mb-1">
                      Bob
                    </div>
                    <div className="text-gray-700">
                      Awesome! Let's review together 👍
                    </div>
                  </div>
                </div>

                {/* Typing Indicator */}
                <div className="flex items-center gap-2 px-4 py-3 text-gray-400">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" />
                    <span
                      className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    />
                    <span
                      className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                  </div>
                  <span className="text-sm text-gray-400">
                    Alice is typing...
                  </span>
                </div>
              </div>
            </div>

            {/* Decorative */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-emerald-100 rounded-full blur-2xl" />
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-emerald-50 rounded-full blur-2xl" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-5xl lg:text-6xl font-bold mb-4 tracking-tight text-gray-900">
            Everything Your Team Needs
          </h2>
          <p className="text-xl text-gray-400 max-w-xl mx-auto">
            Powerful features to supercharge your collaboration
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className={`group p-8 rounded-2xl border transition-all duration-300 transform hover:scale-[1.03] cursor-default
                ${
                  feature.featured
                    ? "bg-emerald-50 border-emerald-200 hover:border-emerald-400 shadow-sm shadow-emerald-100"
                    : "bg-white border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/30 shadow-sm"
                }`}
            >
              {feature.featured && (
                <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-semibold mb-4">
                  ★ Core Feature
                </div>
              )}
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3
                className={`text-xl font-bold mb-3 transition-colors
                ${feature.featured ? "text-emerald-700" : "text-gray-900 group-hover:text-emerald-600"}`}
              >
                {feature.title}
              </h3>
              <p className="text-gray-500 leading-relaxed text-sm">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <div className="relative rounded-3xl bg-emerald-500 p-16 text-center overflow-hidden">
          {/* Decorative inner glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-1 bg-white/30 rounded-full" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.15),transparent_70%)]" />

          <div className="relative z-10">
            <h2 className="text-5xl lg:text-6xl font-bold mb-4 tracking-tight text-white">
              Ready to Transform
              <br />
              Your Team's Workflow?
            </h2>
            <p className="text-xl text-emerald-100 mb-2 max-w-2xl mx-auto">
              Join 500+ teams already collaborating faster with CollabX
            </p>
            <p className="text-sm text-emerald-200 mb-10">
              No credit card required · Free forever for small teams
            </p>
            <button
              onClick={() => router.push("/login")}
              className="group px-12 py-5 rounded-xl bg-white text-emerald-600 font-bold text-xl hover:shadow-2xl hover:shadow-emerald-700/30 transition-all duration-300 transform hover:scale-105 inline-flex items-center gap-3"
            >
              Get Started Free Today
              <span className="group-hover:translate-x-1 transition-transform">
                →
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-gray-100 py-12 bg-white">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-6">
          <div className="flex items-center justify-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
              <span className="text-white text-sm font-bold">⚡</span>
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">
              CollabX
            </span>
          </div>

          {/* Tech stack pills */}
          <div className="flex flex-wrap justify-center gap-2">
            {[
              "Next.js 15",
              "React 19",
              "TypeScript",
              "Node.js",
              "Socket.IO",
              "MongoDB",
              "Redis",
              "Express",
            ].map((tech) => (
              <span
                key={tech}
                className="px-3 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-400 text-xs font-medium"
              >
                {tech}
              </span>
            ))}
          </div>

          <div>
            <p className="text-gray-400 mb-1">
              Built with ❤️ for teams who ship fast
            </p>
            <p className="text-gray-300 text-sm">
              © 2026 CollabX. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
