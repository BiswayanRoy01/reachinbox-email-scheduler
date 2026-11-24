import React from "react";

export const EmailListSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl divide-y divide-slate-100 overflow-hidden shadow-sm">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="p-4 flex items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3.5 min-w-[220px]">
            <div className="w-4 h-4 bg-slate-200 rounded"></div>
            <div className="space-y-1.5">
              <div className="h-4 w-32 bg-slate-200 rounded"></div>
              <div className="h-3 w-20 bg-slate-100 rounded"></div>
            </div>
          </div>
          <div className="flex-1 space-y-1.5 max-w-xl">
            <div className="h-4 w-48 bg-slate-200 rounded"></div>
            <div className="h-3 w-full bg-slate-100 rounded"></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-6 w-24 bg-slate-100 rounded-full"></div>
            <div className="w-8 h-8 bg-slate-100 rounded-lg"></div>
          </div>
        </div>
      ))}
    </div>
  );
};
