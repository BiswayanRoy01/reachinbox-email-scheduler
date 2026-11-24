import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  Search,
  RotateCw,
  SlidersHorizontal,
  X,
  Filter,
  Check,
  Calendar,
} from "lucide-react";
import { cn } from "../../utils/cn";

export const Header: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const [filterOpen, setFilterOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sync state if URL param changes
  useEffect(() => {
    setSearchTerm(searchParams.get("q") || "");
  }, [searchParams]);

  // Debounced search update
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentQ = searchParams.get("q") || "";
      if (searchTerm.trim() !== currentQ) {
        const nextParams = new URLSearchParams(searchParams);
        if (searchTerm.trim()) {
          nextParams.set("q", searchTerm.trim());
          nextParams.set("page", "1");
        } else {
          nextParams.delete("q");
        }
        setSearchParams(nextParams, { replace: true });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchTerm, searchParams, setSearchParams]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const currentStatus = searchParams.get("status") || "";
  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";
  const hasActiveFilters = !!(currentStatus || startDate || endDate);

  const applyStatusFilter = (status: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (status) {
      nextParams.set("status", status);
    } else {
      nextParams.delete("status");
    }
    nextParams.set("page", "1");
    setSearchParams(nextParams);
  };

  const clearAllFilters = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("status");
    nextParams.delete("startDate");
    nextParams.delete("endDate");
    nextParams.delete("q");
    setSearchTerm("");
    setSearchParams(nextParams);
    setFilterOpen(false);
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-10">
      {/* Search Input Bar */}
      <div className="flex-1 max-w-xl relative">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by recipient, sender, subject, or email body..."
            className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-2 relative">
        {/* Filter Popover Button */}
        <div className="relative">
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all",
              hasActiveFilters
                ? "bg-emerald-50 text-emerald-800 border-emerald-300 shadow-sm"
                : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200"
            )}
            title="Filter emails"
          >
            <Filter className={cn("w-3.5 h-3.5", hasActiveFilters && "text-emerald-700")} />
            <span className="hidden sm:inline">Filter</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            )}
          </button>

          {/* Filter Popover Dropdown */}
          {filterOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setFilterOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 z-40 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                    Filter Emails
                  </h4>
                  {hasActiveFilters && (
                    <button
                      onClick={clearAllFilters}
                      className="text-[11px] font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
                    >
                      Reset All
                    </button>
                  )}
                </div>

                {/* Status Selection */}
                <div className="space-y-1.5 mb-4">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Status
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {["", "SCHEDULED", "SENT", "FAILED", "CANCELLED"].map((st) => (
                      <button
                        key={st || "all"}
                        onClick={() => applyStatusFilter(st)}
                        className={cn(
                          "px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors flex items-center justify-between",
                          currentStatus === st
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-transparent"
                        )}
                      >
                        <span>{st ? st.charAt(0) + st.slice(1).toLowerCase() : "All Status"}</span>
                        {currentStatus === st && <Check className="w-3 h-3 text-emerald-600" />}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setFilterOpen(false)}
                  className="w-full mt-2 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-xl shadow-sm transition-colors text-center"
                >
                  Apply Filters
                </button>
              </div>
            </>
          )}
        </div>

        {/* Refresh Button */}
        <button
          onClick={handleRefresh}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
          title="Refresh email list"
        >
          <RotateCw className={cn("w-4 h-4", isRefreshing && "animate-spin text-emerald-600")} />
        </button>
      </div>
    </header>
  );
};
