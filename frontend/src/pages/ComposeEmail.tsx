import React, { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { senderApi } from "../services/sender.api";
import { emailApi } from "../services/email.api";
import { RecipientChipInput } from "../components/compose/RecipientChipInput";
import { CsvUploaderModal } from "../components/compose/CsvUploaderModal";
import { RichTextEditor } from "../components/compose/RichTextEditor";
import { SendLaterPopover } from "../components/compose/SendLaterPopover";
import { EmailAttachment } from "../types";
import { formatScheduledBadge, formatFileSize } from "../utils/format";
import {
  ArrowLeft,
  Clock,
  Send,
  Paperclip,
  X,
  FileText,
  AlertCircle,
  PlusCircle,
  Loader2,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "../services/api";

export const ComposeEmail: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [senderId, setSenderId] = useState<string>("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [subject, setSubject] = useState<string>("");
  const [bodyHtml, setBodyHtml] = useState<string>("");
  const [delayBetweenEmails, setDelayBetweenEmails] = useState<number>(2);
  const [hourlyLimit, setHourlyLimit] = useState<number>(100);
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);

  // UI State
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [sendLaterOpen, setSendLaterOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProvisioningSender, setIsProvisioningSender] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch Senders from backend
  const { data: senders = [], isLoading: isLoadingSenders, refetch: refetchSenders } = useQuery({
    queryKey: ["senders"],
    queryFn: senderApi.getSenders,
  });

  // Auto-select first active sender
  useEffect(() => {
    if (senders.length > 0 && !senderId) {
      const activeSender = senders.find((s) => s.isActive) || senders[0];
      setSenderId(activeSender.id);
      if (activeSender.hourlyLimit) {
        setHourlyLimit(activeSender.hourlyLimit);
      }
    }
  }, [senders, senderId]);

  // Handle auto-provision test sender
  const handleAutoProvisionSender = async () => {
    setIsProvisioningSender(true);
    try {
      const newSender = await senderApi.createEtherealSender("Ethereal Test Sender");
      toast.success(`Provisioned test sender: ${newSender.emailAddress}`);
      await refetchSenders();
      setSenderId(newSender.id);
    } catch (err: any) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsProvisioningSender(false);
    }
  };

  // Handle file attachment selection & convert to Base64
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      // 10MB limit per attachment
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File "${file.name}" exceeds 10MB limit`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64Content = (reader.result as string).split(",")[1];
        setAttachments((prev) => [
          ...prev,
          {
            filename: file.name,
            content: base64Content,
            contentType: file.type || "application/octet-stream",
            size: file.size,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (indexToRemove: number) => {
    setAttachments(attachments.filter((_, idx) => idx !== indexToRemove));
  };

  // Submit Handler
  const handleSubmit = async (sendImmediately = false) => {
    setFormError(null);

    // Validation
    if (!senderId) {
      setFormError("Please configure or select a sender account");
      toast.error("Sender account required");
      return;
    }

    if (recipients.length === 0) {
      setFormError("Please add at least one recipient email address");
      toast.error("At least one recipient is required");
      return;
    }

    if (!subject.trim()) {
      setFormError("Please enter an email subject");
      toast.error("Subject is required");
      return;
    }

    // Strip tags to check if body has content
    const plainText = bodyHtml.replace(/<[^>]*>?/gm, "").trim();
    if (!plainText) {
      setFormError("Please compose your email body message");
      toast.error("Email message body is required");
      return;
    }

    const effectiveScheduleTime = sendImmediately
      ? null
      : scheduledAt
      ? scheduledAt.toISOString()
      : null;

    setIsSubmitting(true);

    try {
      const response = await emailApi.scheduleEmail({
        senderId,
        recipients,
        subject: subject.trim(),
        body: bodyHtml,
        scheduledAt: effectiveScheduleTime,
        sendImmediately,
        delayBetweenEmails,
        hourlyLimit,
        attachments: attachments.map((att) => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
        })),
      });

      toast.success(
        sendImmediately
          ? `Queued ${recipients.length} email(s) for immediate delivery`
          : `Scheduled ${recipients.length} email(s) successfully`
      );

      // Invalidate queries so lists update
      await queryClient.invalidateQueries();

      // Redirect to Scheduled or Sent
      if (sendImmediately) {
        navigate("/dashboard/sent");
      } else {
        navigate("/dashboard/scheduled");
      }
    } catch (err: any) {
      const errorMsg = getErrorMessage(err);
      setFormError(errorMsg);
      toast.error(`Scheduling failed: ${errorMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-xl border border-slate-200 hover:bg-white text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Compose New Email</h1>
            <p className="text-xs text-slate-500">
              Configure recipients, subject, sending delays, and dispatch schedules
            </p>
          </div>
        </div>

        {/* Schedule Time Indicator if set */}
        {scheduledAt && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium">
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            <span>{formatScheduledBadge(scheduledAt)}</span>
            <button
              onClick={() => setScheduledAt(null)}
              className="p-0.5 hover:bg-emerald-200/60 rounded-full transition-colors"
              title="Remove schedule time"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {formError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Unable to schedule:</span> {formError}
          </div>
        </div>
      )}

      {/* Main Compose Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 md:p-8 space-y-5">
        {/* From Field */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              From (Sender Account)
            </label>
            {senders.length === 0 && (
              <button
                type="button"
                disabled={isProvisioningSender}
                onClick={handleAutoProvisionSender}
                className="text-xs font-medium text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                {isProvisioningSender ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                <span>Auto-provision Ethereal Sender</span>
              </button>
            )}
          </div>

          {isLoadingSenders ? (
            <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
          ) : senders.length > 0 ? (
            <select
              value={senderId}
              onChange={(e) => {
                const newId = e.target.value;
                setSenderId(newId);
                const found = senders.find((s) => s.id === newId);
                if (found && found.hourlyLimit) {
                  setHourlyLimit(found.hourlyLimit);
                }
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs md:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            >
              {senders.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.displayName} ({s.emailAddress}) — Limit: {s.hourlyLimit || 100}/hr
                </option>
              ))}
            </select>
          ) : (
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900">
              <span>No sender configured. Create one in Settings or auto-provision a test account.</span>
              <button
                type="button"
                onClick={handleAutoProvisionSender}
                className="px-3 py-1 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors"
              >
                Provision Test Sender
              </button>
            </div>
          )}
        </div>

        {/* To Field (RecipientChipInput) */}
        <RecipientChipInput
          recipients={recipients}
          onChange={setRecipients}
          onOpenUploadModal={() => setCsvModalOpen(true)}
        />

        {/* Subject Field */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Subject
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Quick question regarding cold email infrastructure"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-xs md:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>

        {/* Delay & Hourly Limit Configuration Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Delay between 2 emails (seconds)
            </label>
            <input
              type="number"
              min={0}
              max={3600}
              value={delayBetweenEmails}
              onChange={(e) => setDelayBetweenEmails(parseInt(e.target.value, 10) || 0)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs md:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Enforced by backend queue workers to prevent spam flags
            </span>
          </div>

          <div className="bg-emerald-50/60 border border-emerald-200/90 p-3.5 rounded-xl">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Hourly Limit (emails/hr)
              </label>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                Active Limit: {hourlyLimit}/hr
              </span>
            </div>
            <input
              type="number"
              min={1}
              max={10000}
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(parseInt(e.target.value, 10) || 1)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
            <span className="text-[11px] text-slate-600 mt-1 block">
              Maximum emails dispatched per hour for this sender. Exceeding jobs are rescheduled by BullMQ and trigger a Slack alert.
            </span>
          </div>
        </div>

        {/* Body Editor (TipTap Rich Text) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Email Body
          </label>
          <RichTextEditor
            content={bodyHtml}
            onChange={setBodyHtml}
            placeholder="Type your message here... Use rich formatting as needed."
          />
        </div>

        {/* Attachments Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5" />
              <span>Attachments ({attachments.length})</span>
            </label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-medium text-emerald-700 hover:text-emerald-800 transition-colors flex items-center gap-1"
            >
              <span>+ Attach File</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {attachments.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              {attachments.map((att, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg shadow-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-800 truncate">{att.filename}</p>
                      {att.size && (
                        <p className="text-[10px] text-slate-400">{formatFileSize(att.size)}</p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachment(idx)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons Footer */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {recipients.length} recipient{recipients.length === 1 ? "" : "s"} selected
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end relative">
            {/* Send Immediately Button */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(true)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-50 text-slate-800 text-xs font-medium rounded-xl transition-all flex items-center gap-2"
            >
              <Send className="w-3.5 h-3.5 text-slate-600" />
              <span>Send Now</span>
            </button>

            {/* Send Later Popover Trigger */}
            <div className="relative">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setSendLaterOpen(!sendLaterOpen)}
                className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium rounded-xl transition-all flex items-center gap-2 shadow-xs"
              >
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                <span>{scheduledAt ? "Change Schedule" : "Schedule Time"}</span>
              </button>

              <SendLaterPopover
                isOpen={sendLaterOpen}
                onClose={() => setSendLaterOpen(false)}
                onSelectScheduleTime={(date) => setScheduledAt(date)}
                currentScheduleTime={scheduledAt}
              />
            </div>

            {/* Primary Action Button (Schedule or Send) */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(false)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white text-xs font-medium rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Scheduling...</span>
                </>
              ) : (
                <>
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {scheduledAt ? "Confirm & Schedule" : "Schedule Email"}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* CSV / TXT Upload Modal */}
      <CsvUploaderModal
        isOpen={csvModalOpen}
        onClose={() => setCsvModalOpen(false)}
        existingRecipients={recipients}
        onAddRecipients={(newRecipients) => {
          setRecipients((prev) => [...prev, ...newRecipients]);
        }}
      />
    </div>
  );
};
