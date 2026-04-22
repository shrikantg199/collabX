"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";

import ProfileDropdown from "./ProfileDropdown";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ name: string; email: string; photoUrl?: string } | null>(null);

  const handleLogout = () => {
    window.localStorage.removeItem("collabx_token");
    window.localStorage.removeItem("collabx_user");
    setUser(null);
    router.push("/");
  };

  useEffect(() => {
    const userStr = window.localStorage.getItem("collabx_user");
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  // Don't show header on workspace page (it has its own header)
  if (pathname === "/workspace") {
    return null;
  }

  const isDarkPage = pathname === "/" || pathname === "/dashboard";

  return (
    <nav className={
      isDarkPage || "/login" == pathname
        ? "fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-8 py-3 sm:py-4 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/[0.06]"
        : "fixed top-0 left-0 right-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-sm px-4 sm:px-6"
    }>
      <div className={isDarkPage ? "flex items-center w-full justify-between" : "max-w-7xl mx-auto px-6 py-4 flex justify-between items-center w-full"}>
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity"
        >
          <div className={
            isDarkPage
              ? "w-7 h-7 sm:w-8 sm:h-8 rounded-[10px] bg-emerald-400 flex items-center justify-center text-xs sm:text-sm font-bold text-[#060d0a] shadow-lg shadow-emerald-500/30"
              : "w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white text-xs sm:text-sm font-bold"
          }>
            ⚡
          </div>
          <span className={
            isDarkPage
              ? "text-lg sm:text-xl font-black tracking-tight text-black"
              : "text-lg sm:text-xl font-bold tracking-tight text-white"
          }>
            CollabX
          </span>
        </button>

        <div className="flex items-center gap-2">
          {user ? (
            <ProfileDropdown 
              user={user} 
              onDashboard={() => router.push("/dashboard")} 
              onLogout={handleLogout} 
              isDark={isDarkPage}
            />
          ) : (
            <>
              <button
                onClick={() => router.push("/login")}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-150 ${
                  isDarkPage ? "text-[#9898a8] hover:text-white hover:bg-white/[0.05]" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                Sign in
              </button>
              <button
                onClick={() => router.push("/login")}
                className="px-4 sm:px-5 py-2 rounded-lg bg-emerald-400 text-[#060d0a] text-xs sm:text-sm font-bold hover:bg-emerald-300 hover:shadow-lg hover:shadow-emerald-500/30 hover:-translate-y-0.5 transition-all duration-200"
              >
                Get started <span className="hidden sm:inline">→</span>
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
