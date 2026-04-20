"use client";

import { useRouter, usePathname } from "next/navigation";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();

  // Don't show header on workspace page (it has its own header)
  if (pathname === "/workspace") {
    return null;
  }

  const isHomePage = pathname === "/";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
            <span className="text-white text-sm font-bold">⚡</span>
          </div>
          <span className="text-xl font-bold text-gray-900 tracking-tight">
            CollabX
          </span>
        </button>

        {isHomePage ? (
          <div className="flex gap-3 items-center">
            <button
              onClick={() => router.push("/login")}
              className="px-5 py-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200 font-medium text-sm"
            >
              Sign In
            </button>
            <button
              onClick={() => router.push("/login")}
              className="px-5 py-2 rounded-lg bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-500/30 transition-all duration-200 transform hover:scale-105"
            >
              Get Started Free
            </button>
          </div>
        ) : (
          <button
            onClick={() => router.push("/")}
            className="px-5 py-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200 font-medium text-sm"
          >
            Back to Home
          </button>
        )}
      </div>
    </nav>
  );
}
