"use client";

import { useEffect, useState, useRef } from "react";

export default function ProfileDropdown({ user, onLogout, onDashboard, isDark }: { user: {name: string, email: string, photoUrl?: string}, onLogout: () => void, onDashboard: () => void, isDark?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 overflow-hidden transition-all duration-200 ${
          isDark 
            ? "bg-[#111118] border border-white/[0.06] hover:bg-white/[0.1] text-emerald-400" 
            : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
        }`}
        title="Profile Menu"
      >
        {user.photoUrl ? (
          <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-xs sm:text-sm">{user.name ? user.name.charAt(0).toUpperCase() : "U"}</span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-[#111118] rounded-xl shadow-2xl shadow-black/50 border border-white/[0.06] py-2 z-50">
          <div className="px-4 py-3 border-b border-white/[0.06] mb-1">
            <p className="text-sm font-semibold text-white truncate">{user.name}</p>
            <p className="text-xs text-[#6b6b7a] truncate">{user.email}</p>
          </div>
          <button
            onClick={() => {
              setIsOpen(false);
              onDashboard();
            }}
            className="w-full text-left px-4 py-2 text-sm text-[#9898a8] hover:bg-emerald-500/10 hover:text-emerald-400 transition-colors"
          >
            Dashboard
          </button>
          <button
            onClick={() => {
              setIsOpen(false);
              onLogout();
            }}
            className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
