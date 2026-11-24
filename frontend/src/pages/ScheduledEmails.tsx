import React from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { emailApi } from "../services/email.api";
import { EmailRow } from "../components/email/EmailRow";
import { EmailListSkeleton } from "../components/email/EmailListSkeleton";
import { EmptyState } from "../components/common/EmptyState";
import { Clock, Plus, AlertTriangle, ChevronLeft, ChevronRight, Zap } from "lucide-react";
import { getErrorMessage } from "../services/api";

export const ScheduledEmails: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parseInt(searchParams.get("page") || "1", 10);
  const q = searchParams.get("q") || "";
  const status = searchParams.get("status") || "";

  // Query either dedicated endpoint or search endpoint if filters active
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["scheduled-emails", page, q, status],
    queryFn: () => {
      if (q || status) {
        return emailApi.searchEmails({
          q: q || undefined,
          status: (status as any) || "SCHEDULED",
          page,
          limit: 20,
        });
      }
      return emailApi.getScheduledEmails(page, 20);
    },
    refetchInterval: 10000, // Refresh automatically to update countdowns
  });

  const emails = data?.data || [];
  const meta = data?.meta;

  const handlePageChange = (newPage: number) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("page", newPage.toString());
    setSearchParams(nextParams);
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Scheduled Emails</h1>
            {meta && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-medium border border-emerald-200">
                {meta.total} scheduled
              </span>
            )}
            {meta?.engine === "elasticsearch" && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium flex items-center gap-1">
                <Zap className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                Elasticsearch
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Emails queued for upcoming delivery according to configured sending limits & delays
          </p>
        </div>

        <Link
          to="/dashboard/compose"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs md:text-sm font-medium rounded-xl shadow-sm shadow-emerald-600/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Schedule New Email</span>
        </Link>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <EmailListSkeleton count={8} />
      ) : isError ? (
        <div className="p-8 text-center bg-white border border-rose-200 rounded-2xl shadow-sm">
          <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Failed to load scheduled emails</h3>
          <p className="text-xs text-slate-500 mb-4 max-w-md mx-auto">{getErrorMessage(error)}</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition-colors"
          >
            Retry Connection
          </button>
        </div>
      ) : emails.length === 0 ? (
        <EmptyState
          icon={Clock}
          title={q ? "No matching scheduled emails" : "No scheduled emails yet"}
          description={
            q
              ? `No scheduled emails match your search "${q}". Try a different keyword or reset filters.`
              : "You have no emails waiting in the queue. Compose a new email and schedule it for future delivery."
          }
          actionText={q ? undefined : "Compose Email"}
          actionHref={q ? undefined : "/dashboard/compose"}
        />
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
          {/* Table / Row list */}
          <div className="divide-y divide-slate-100">
            {emails.map((email) => (
              <EmailRow key={email.id} email={email} variant="scheduled" />
            ))}
          </div>

          {/* Pagination bar */}
          {meta && meta.totalPages > 1 && (
            <div className="px-6 py-3.5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing page {meta.page} of {meta.totalPages} ({meta.total} total)
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={!meta.hasPrevPage}
                  onClick={() => handlePageChange(meta.page - 1)}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-medium text-slate-700 px-1">
                  {meta.page} / {meta.totalPages}
                </span>
                <button
                  disabled={!meta.hasNextPage}
                  onClick={() => handlePageChange(meta.page + 1)}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
