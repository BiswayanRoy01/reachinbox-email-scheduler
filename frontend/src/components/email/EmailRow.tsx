import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Email } from "../../types";
import { formatScheduledBadge, formatShortDate } from "../../utils/format";
import {
  Clock,
  Send,
  Star,
  MoreVertical,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  Play,
  XCircle,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { cn } from "../../utils/cn";
import { emailApi } from "../../services/email.api";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface EmailRowProps {
  email: Email;
  variant: "scheduled" | "sent" | "search";
}

export const EmailRow: React.FC<EmailRowProps> = ({ email, variant }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [starred, setStarred] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Strip HTML for clean body preview
  const bodyPreview = email.body
    ? email.body.replace(/<[^>]*>?/gm, "").trim()
    : "No preview text";

  const handleRowClick = () => {
    navigate(`/dashboard/emails/${email.id}`);
  };

  const handleSendNow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsProcessing(true);
    try {
      await emailApi.sendImmediately(email.id);
      toast.success(`Queued immediate sending to ${email.recipient}`);
      queryClient.invalidateQueries();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to trigger sending");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsProcessing(true);
    try {
      await emailApi.cancelScheduledEmail(email.id);
      toast.info(`Schedule cancelled for ${email.recipient}`);
      queryClient.invalidateQueries();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to cancel schedule");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetry = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsProcessing(true);
    try {
      await emailApi.retryFailedEmail(email.id);
      toast.success(`Retrying email to ${email.recipient}`);
      queryClient.invalidateQueries();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to retry email");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this email?")) return;
    try {
      await emailApi.deleteEmail(email.id);
      toast.success("Email deleted");
      queryClient.invalidateQueries();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete email");
    }
  };

  return (
    <div
      onClick={handleRowClick}
      className="group px-4 py-3.5 bg-white hover:bg-emerald-50/30 border-b border-slate-100 flex items-center justify-between gap-4 cursor-pointer transition-colors text-xs md:text-sm"
    >
      {/* Left: Star & Recipient */}
      <div className="flex items-center gap-3 w-56 sm:w-64 shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setStarred(!starred);
          }}
          className={cn(
            "p-1 rounded hover:bg-slate-100 transition-colors",
            starred ? "text-amber-400" : "text-slate-300 hover:text-slate-500"
          )}
          title={starred ? "Unstar" : "Star email"}
        >
          <Star className={cn("w-4 h-4", starred && "fill-amber-400")} />
        </button>

        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-800 truncate">
            <span className="text-slate-400 font-normal mr-1">To:</span>
            {email.recipient}
          </p>
          <p className="text-[11px] text-slate-400 truncate">
            {email.sender?.displayName || email.sender?.emailAddress || "ReachInbox"}
          </p>
        </div>
      </div>

      {/* Middle: Subject & Body preview */}
      <div className="flex-1 min-w-0 pr-4">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-900 truncate max-w-xs md:max-w-md">
            {email.subject || "(No subject)"}
          </span>
          <span className="text-slate-300 hidden sm:inline">•</span>
          <span className="text-slate-400 truncate hidden sm:inline flex-1 text-xs">
            {bodyPreview}
          </span>
          {email.attachments && (email.attachments as any[]).length > 0 && (
            <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          )}
        </div>
      </div>

      {/* Right: Status badge / Scheduled Date & Actions */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Status / Scheduled Time Badge */}
        {email.status === "SCHEDULED" ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium">
            <Clock className="w-3 h-3 text-emerald-600" />
            <span>{formatScheduledBadge(email.scheduledAt)}</span>
          </div>
        ) : email.status === "SENT" ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Sent {formatShortDate(email.sentAt)}</span>
          </div>
        ) : email.status === "FAILED" ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-medium">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            <span>Failed</span>
          </div>
        ) : (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
            {email.status}
          </span>
        )}

        {/* Ethereal Preview quick link if available */}
        {email.etherealPreviewUrl && (
          <a
            href={email.etherealPreviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors hidden md:inline-flex"
            title="Open Ethereal Email Preview"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}

        {/* Actions Menu */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                }}
              />
              <div
                className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg p-1 z-40 animate-in fade-in zoom-in-95"
                onClick={(e) => e.stopPropagation()}
              >
                {email.status === "SCHEDULED" && (
                  <>
                    <button
                      onClick={(e) => {
                        setMenuOpen(false);
                        handleSendNow(e);
                      }}
                      disabled={isProcessing}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded-lg"
                    >
                      <Play className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Send Now</span>
                    </button>
                    <button
                      onClick={(e) => {
                        setMenuOpen(false);
                        handleCancel(e);
                      }}
                      disabled={isProcessing}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-amber-600 hover:bg-amber-50 rounded-lg"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Cancel Schedule</span>
                    </button>
                  </>
                )}

                {email.status === "FAILED" && (
                  <button
                    onClick={(e) => {
                      setMenuOpen(false);
                      handleRetry(e);
                    }}
                    disabled={isProcessing}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50 rounded-lg"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Retry Send</span>
                  </button>
                )}

                <button
                  onClick={(e) => {
                    setMenuOpen(false);
                    handleDelete(e);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
