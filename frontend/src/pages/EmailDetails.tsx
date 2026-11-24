import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { emailApi } from "../services/email.api";
import { formatDateTime, formatFileSize } from "../utils/format";
import DOMPurify from "dompurify";
import {
  ArrowLeft,
  Clock,
  Send,
  Star,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  Play,
  XCircle,
  ExternalLink,
  Trash2,
  Download,
  FileText,
  User,
  Calendar,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { cn } from "../utils/cn";
import { toast } from "sonner";
import { getErrorMessage } from "../services/api";

export const EmailDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isStarred, setIsStarred] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: email, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["email-detail", id],
    queryFn: () => emailApi.getEmailById(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-24">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-3" />
        <p className="text-sm text-slate-500 font-medium">Loading email details...</p>
      </div>
    );
  }

  if (isError || !email) {
    return (
      <div className="p-8 text-center bg-white border border-rose-200 rounded-2xl shadow-sm max-w-lg mx-auto mt-12">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-900 mb-1">Email not found</h3>
        <p className="text-xs text-slate-500 mb-6">{getErrorMessage(error)}</p>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  const handleSendNow = async () => {
    setIsProcessing(true);
    try {
      await emailApi.sendImmediately(email.id);
      toast.success("Queued for immediate delivery");
      queryClient.invalidateQueries();
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to trigger send");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelSchedule = async () => {
    setIsProcessing(true);
    try {
      await emailApi.cancelScheduledEmail(email.id);
      toast.info("Schedule cancelled");
      queryClient.invalidateQueries();
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to cancel schedule");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetry = async () => {
    setIsProcessing(true);
    try {
      await emailApi.retryFailedEmail(email.id);
      toast.success("Retrying email delivery");
      queryClient.invalidateQueries();
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to retry send");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this email permanently?")) return;
    try {
      await emailApi.deleteEmail(email.id);
      toast.success("Email deleted");
      queryClient.invalidateQueries();
      navigate(-1);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete email");
    }
  };

  // Sanitize email body HTML to safely render while preventing XSS attacks
  const sanitizedHtml = DOMPurify.sanitize(email.body || "", {
    ALLOWED_TAGS: [
      "p", "b", "i", "u", "s", "strong", "em", "a", "h1", "h2", "h3", "h4", "h5", "h6",
      "ul", "ol", "li", "blockquote", "code", "pre", "hr", "br", "div", "span", "table",
      "thead", "tbody", "tr", "th", "td", "img"
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "src", "alt", "style", "class"],
  });

  const attachments = Array.isArray(email.attachments) ? (email.attachments as any[]) : [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Navigation & Action Toolbar */}
      <div className="flex items-center justify-between gap-4 pb-2">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs md:text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Star Button */}
          <button
            onClick={() => setIsStarred(!isStarred)}
            className={cn(
              "p-2 rounded-xl border border-slate-200 transition-colors",
              isStarred ? "bg-amber-50 text-amber-500 border-amber-300" : "bg-white hover:bg-slate-50 text-slate-400"
            )}
            title="Star email"
          >
            <Star className={cn("w-4 h-4", isStarred && "fill-amber-400")} />
          </button>

          {/* Conditional Workflow Actions */}
          {email.status === "SCHEDULED" && (
            <>
              <button
                onClick={handleSendNow}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-xl shadow-sm transition-colors"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Send Now</span>
              </button>
              <button
                onClick={handleCancelSchedule}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-medium rounded-xl transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Cancel Schedule</span>
              </button>
            </>
          )}

          {email.status === "FAILED" && (
            <button
              onClick={handleRetry}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-xl shadow-sm transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Retry Send</span>
            </button>
          )}

          <button
            onClick={handleDelete}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-xl transition-colors"
            title="Delete email"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Email Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        {/* Email Header */}
        <div className="p-6 md:p-8 border-b border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight leading-snug">
              {email.subject || "(No subject)"}
            </h1>

            {/* Status Badge */}
            <div className="shrink-0 self-start">
              {email.status === "SCHEDULED" ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Scheduled for {formatDateTime(email.scheduledAt)}</span>
                </span>
              ) : email.status === "SENT" ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Sent on {formatDateTime(email.sentAt)}</span>
                </span>
              ) : email.status === "FAILED" ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Delivery Failed</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                  {email.status}
                </span>
              )}
            </div>
          </div>

          {/* Sender & Recipient Metadata Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs text-slate-600 bg-slate-50/60 p-4 rounded-xl border border-slate-100">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                Recipient (To)
              </span>
              <p className="font-semibold text-slate-800 select-all">{email.recipient}</p>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                Sender (From)
              </span>
              <p className="font-medium text-slate-800">
                {email.sender?.displayName}{" "}
                <span className="text-slate-400 font-normal">
                  ({email.sender?.emailAddress || "Configured SMTP"})
                </span>
              </p>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                Created At
              </span>
              <p className="font-medium text-slate-700">{formatDateTime(email.createdAt)}</p>
            </div>

            {email.campaign && (
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                  Campaign
                </span>
                <p className="font-medium text-slate-700">{email.campaign.name}</p>
              </div>
            )}
          </div>

          {/* Ethereal Test Link Alert */}
          {email.etherealPreviewUrl && (
            <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>An Ethereal SMTP test email was captured for this dispatch.</span>
              </div>
              <a
                href={email.etherealPreviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors shrink-0"
              >
                <span>View Raw Preview</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* Error Message if Failed */}
          {email.errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-0.5">Failure Reason:</p>
                <p className="text-rose-700">{email.errorMessage}</p>
              </div>
            </div>
          )}
        </div>

        {/* Email Body */}
        <div className="p-6 md:p-8">
          <div
            className="prose prose-slate max-w-none text-slate-800 text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
        </div>

        {/* Attachments Section */}
        {attachments.length > 0 && (
          <div className="p-6 md:p-8 bg-slate-50/50 border-t border-slate-100">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5" />
              <span>Attachments ({attachments.length})</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {attachments.map((att: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {att.filename || `Attachment-${idx + 1}`}
                      </p>
                      {att.size && (
                        <p className="text-[11px] text-slate-400">{formatFileSize(att.size)}</p>
                      )}
                    </div>
                  </div>
                  {att.content && (
                    <a
                      href={`data:${att.contentType || "application/octet-stream"};base64,${att.content}`}
                      download={att.filename || `attachment-${idx + 1}`}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-50 rounded-lg transition-colors"
                      title="Download attachment"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
