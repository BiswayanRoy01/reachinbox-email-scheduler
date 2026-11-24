import React, { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "../../services/dashboard.api";
import {
  Clock,
  Send,
  Plus,
  Settings as SettingsIcon,
  LogOut,
  ChevronDown,
  User as UserIcon,
  Mail,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "../../utils/cn";

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Fetch real counts from backend dashboard stats
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: dashboardApi.getStats,
    refetchInterval: 15000, // Refresh every 15s to keep counts fresh
  });

  const scheduledCount = stats?.emails?.scheduled ?? 0;
  const sentCount = stats?.emails?.sent ?? 0;

  const navItems = [
    {
      name: "Scheduled",
      path: "/dashboard/scheduled",
      icon: Clock,
      count: scheduledCount,
    },
    {
      name: "Sent",
      path: "/dashboard/sent",
      icon: Send,
      count: sentCount,
    },
    {
      name: "Settings",
      path: "/settings",
      icon: SettingsIcon,
      count: null,
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col h-screen sticky top-0 select-none z-20">
      {/* Brand Header */}
      <div className="p-5 pb-4 border-b border-slate-100 flex items-center justify-between">
        <NavLink to="/dashboard/scheduled" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-base shadow-sm shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            R
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg tracking-tight text-slate-900 group-hover:text-emerald-700 transition-colors">
              Reach<span className="text-emerald-600">Inbox</span>
            </span>
          </div>
        </NavLink>
      </div>

      {/* User Profile Mini Card */}
      <div className="p-3 mx-3 my-2 border border-slate-100 rounded-xl bg-slate-50/60 relative">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-full flex items-center justify-between p-1.5 rounded-lg hover:bg-white text-left transition-all"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {user?.profilePicture ? (
              <img
                src={user.profilePicture}
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-xs flex items-center justify-center shrink-0">
                {user?.name ? user.name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || "U"}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-800 truncate leading-snug">
                {user?.name || "ReachInbox User"}
              </p>
              <p className="text-[11px] text-slate-400 truncate leading-none">
                {user?.email || "No email"}
              </p>
            </div>
          </div>
          <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 transition-transform", dropdownOpen && "rotate-180")} />
        </button>

        {/* Profile Dropdown Menu */}
        {dropdownOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setDropdownOpen(false)} />
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  navigate("/settings");
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                <span>Account & Senders</span>
              </button>
              <div className="h-px bg-slate-100 my-1" />
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Compose Button */}
      <div className="px-3 py-2">
        <NavLink
          to="/dashboard/compose"
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium rounded-xl shadow-sm shadow-emerald-600/20 transition-all text-sm group"
        >
          <Plus className="w-4 h-4 stroke-[2.5] group-hover:scale-110 transition-transform" />
          <span>Compose New Email</span>
        </NavLink>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        <div className="px-3 py-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Mailbox
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path);

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group",
                isActive
                  ? "bg-emerald-50 text-emerald-800 font-semibold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50/80"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={cn(
                    "w-4 h-4 transition-colors",
                    isActive ? "text-emerald-700" : "text-slate-400 group-hover:text-slate-600"
                  )}
                />
                <span>{item.name}</span>
              </div>
              {item.count !== null && item.count !== undefined && (
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-medium transition-colors",
                    isActive
                      ? "bg-emerald-200/60 text-emerald-900"
                      : "bg-slate-100 text-slate-500 group-hover:bg-slate-200/70"
                  )}
                >
                  {item.count}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
        <span>ReachInbox Engine</span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Online</span>
        </span>
      </div>
    </aside>
  );
};
