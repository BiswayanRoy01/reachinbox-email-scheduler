import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { slackApi } from "../services/slack.api";
import { senderApi, CreateSenderInput } from "../services/sender.api";
import { useAuth } from "../contexts/AuthContext";
import { formatDateTime } from "../utils/format";
import {
  Slack,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Plus,
  Trash2,
  ShieldCheck,
  RotateCw,
  ExternalLink,
  Sparkles,
  Server,
  Bell,
  Check,
  X,
  User as UserIcon,
} from "lucide-react";
import { cn } from "../utils/cn";
import { toast } from "sonner";
import { getErrorMessage } from "../services/api";

export const Settings: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();

  const [isAddingSender, setIsAddingSender] = useState(false);
  const [isProvisioningEthereal, setIsProvisioningEthereal] = useState(false);

  // New sender form state
  const [newSender, setNewSender] = useState<CreateSenderInput>({
    emailAddress: "",
    displayName: "",
    smtpHost: "smtp.ethereal.email",
    smtpPort: 587,
    smtpUsername: "",
    smtpPassword: "",
    hourlyLimit: 100,
  });

  // Check URL query parameters for Slack OAuth callback notification
  useEffect(() => {
    if (searchParams.get("slack") === "connected") {
      toast.success("Slack workspace connected successfully!");
      const next = new URLSearchParams(searchParams);
      next.delete("slack");
      setSearchParams(next, { replace: true });
    } else if (searchParams.get("slack") === "error") {
      toast.error(`Slack connection error: ${searchParams.get("message") || "Authorization failed"}`);
      const next = new URLSearchParams(searchParams);
      next.delete("slack");
      next.delete("message");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Query Slack connection status
  const {
    data: slackStatus,
    isLoading: isLoadingSlack,
    refetch: refetchSlack,
  } = useQuery({
    queryKey: ["slack-status"],
    queryFn: slackApi.getStatus,
  });

  // Query Senders
  const {
    data: senders = [],
    isLoading: isLoadingSenders,
    refetch: refetchSenders,
  } = useQuery({
    queryKey: ["senders"],
    queryFn: senderApi.getSenders,
  });

  // Disconnect Slack Mutation
  const disconnectSlackMutation = useMutation({
    mutationFn: slackApi.disconnect,
    onSuccess: () => {
      toast.info("Slack disconnected");
      queryClient.invalidateQueries({ queryKey: ["slack-status"] });
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err));
    },
  });

  const handleConnectSlack = () => {
    window.location.href = slackApi.getAuthUrl();
  };

  const handleAddSenderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSender.emailAddress || !newSender.displayName || !newSender.smtpHost || !newSender.smtpPassword) {
      toast.error("Please fill in all required SMTP fields");
      return;
    }

    try {
      await senderApi.createSender(newSender);
      toast.success(`Sender "${newSender.displayName}" added successfully`);
      setIsAddingSender(false);
      setNewSender({
        emailAddress: "",
        displayName: "",
        smtpHost: "smtp.ethereal.email",
        smtpPort: 587,
        smtpUsername: "",
        smtpPassword: "",
        hourlyLimit: 100,
      });
      refetchSenders();
    } catch (err: any) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleAutoProvisionEthereal = async () => {
    setIsProvisioningEthereal(true);
    try {
      const created = await senderApi.createEtherealSender("Ethereal Test Sender");
      toast.success(`Provisioned test sender: ${created.emailAddress}`);
      refetchSenders();
    } catch (err: any) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsProvisioningEthereal(false);
    }
  };

  const handleDeleteSender = async (id: string, name: string) => {
    if (!window.confirm(`Delete sender "${name}"?`)) return;
    try {
      await senderApi.deleteSender(id);
      toast.success("Sender deleted");
      refetchSenders();
    } catch (err: any) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleVerifySender = async (id: string) => {
    try {
      toast.loading("Verifying SMTP connection...");
      const isValid = await senderApi.verifySender(id);
      toast.dismiss();
      if (isValid) {
        toast.success("SMTP connection verified successfully!");
      } else {
        toast.error("SMTP verification failed. Check credentials.");
      }
    } catch (err: any) {
      toast.dismiss();
      toast.error(getErrorMessage(err));
    }
  };

  const handleEditLimit = async (s: any) => {
    const input = window.prompt(`Set new hourly sending limit for "${s.displayName}":`, String(s.hourlyLimit || 100));
    if (!input) return;
    const parsed = parseInt(input, 10);
    if (isNaN(parsed) || parsed < 1) {
      toast.error("Please enter a valid positive number");
      return;
    }
    try {
      await senderApi.updateSender(s.id, { hourlyLimit: parsed });
      toast.success(`Updated hourly limit for "${s.displayName}" to ${parsed}/hr`);
      refetchSenders();
    } catch (err: any) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Platform Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage Slack notifications, sender accounts, and authentication details
        </p>
      </div>

      {/* 1. SLACK INTEGRATION SECTION */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 md:p-7 border-b border-slate-100 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#4A154B]/10 flex items-center justify-center text-[#4A154B] shrink-0">
              <Slack className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Slack Notifications
                </h3>
                {slackStatus?.connected ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-medium border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium">
                    Disconnected
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
                Receive real-time Slack alerts whenever a sender reaches their hourly dispatch limit, so
                you can monitor rescheduled campaigns instantly.
              </p>
            </div>
          </div>

          <div>
            {slackStatus?.connected ? (
              <button
                onClick={() => disconnectSlackMutation.mutate()}
                disabled={disconnectSlackMutation.isPending}
                className="px-3.5 py-2 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors"
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={handleConnectSlack}
                className="px-4 py-2 bg-[#4A154B] hover:bg-[#3d113e] text-white text-xs font-medium rounded-xl shadow-sm transition-colors flex items-center gap-2"
              >
                <Slack className="w-3.5 h-3.5" />
                <span>Connect Slack</span>
              </button>
            )}
          </div>
        </div>

        {/* Slack Details if Connected */}
        {slackStatus?.connected && (
          <div className="p-6 md:p-7 bg-slate-50/50 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Workspace Name
                </span>
                <span className="font-semibold text-slate-800">
                  {slackStatus.teamName || "Connected Workspace"}
                </span>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Alert Channel
                </span>
                <span className="font-semibold text-slate-800">
                  #{slackStatus.channelName || "general"}
                </span>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Connected At
                </span>
                <span className="font-semibold text-slate-800">
                  {formatDateTime(slackStatus.updatedAt)}
                </span>
              </div>
            </div>

            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2.5">
              <Bell className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-0.5">Automated Hourly Limit Alerts Active</p>
                <p className="text-emerald-800 text-[11px]">
                  When any sender account sends more than its configured hourly limit, the backend worker
                  posts a formatted Slack message and automatically pushes remaining emails into the next hourly window.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. SENDER ACCOUNTS MANAGEMENT */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 md:p-7 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Sender Accounts (SMTP)
              </h3>
              <p className="text-xs text-slate-500">
                Connected email accounts used to dispatch scheduled cold outreach
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAutoProvisionEthereal}
              disabled={isProvisioningEthereal}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{isProvisioningEthereal ? "Provisioning..." : "Auto-provision Ethereal"}</span>
            </button>

            <button
              onClick={() => setIsAddingSender(!isAddingSender)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-xl shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom Sender</span>
            </button>
          </div>
        </div>

        {/* Add Sender Form */}
        {isAddingSender && (
          <form onSubmit={handleAddSenderSubmit} className="p-6 bg-slate-50 border-b border-slate-200 space-y-4">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Add New SMTP Sender
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={newSender.displayName}
                  onChange={(e) => setNewSender({ ...newSender, displayName: e.target.value })}
                  placeholder="Alex from ReachInbox"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={newSender.emailAddress}
                  onChange={(e) => setNewSender({ ...newSender, emailAddress: e.target.value })}
                  placeholder="alex@reachinbox.ai"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  SMTP Host
                </label>
                <input
                  type="text"
                  required
                  value={newSender.smtpHost}
                  onChange={(e) => setNewSender({ ...newSender, smtpHost: e.target.value })}
                  placeholder="smtp.domain.com"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  SMTP Port
                </label>
                <input
                  type="number"
                  required
                  value={newSender.smtpPort}
                  onChange={(e) => setNewSender({ ...newSender, smtpPort: parseInt(e.target.value, 10) || 587 })}
                  placeholder="587"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  SMTP Username
                </label>
                <input
                  type="text"
                  required
                  value={newSender.smtpUsername}
                  onChange={(e) => setNewSender({ ...newSender, smtpUsername: e.target.value })}
                  placeholder="username or email"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  SMTP Password (Encrypted at rest)
                </label>
                <input
                  type="password"
                  required
                  value={newSender.smtpPassword}
                  onChange={(e) => setNewSender({ ...newSender, smtpPassword: e.target.value })}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Hourly Limit
                </label>
                <input
                  type="number"
                  min={1}
                  max={10000}
                  value={newSender.hourlyLimit}
                  onChange={(e) => setNewSender({ ...newSender, hourlyLimit: parseInt(e.target.value, 10) || 100 })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingSender(false)}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-xl shadow-sm transition-colors"
              >
                Save Sender
              </button>
            </div>
          </form>
        )}

        {/* Sender List */}
        <div className="divide-y divide-slate-100">
          {isLoadingSenders ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading senders...</div>
          ) : senders.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No sender accounts configured yet. Auto-provision an Ethereal test sender or add your own SMTP details.
            </div>
          ) : (
            senders.map((s) => (
              <div key={s.id} className="p-4 sm:p-5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 text-sm">{s.displayName}</span>
                    <button
                      type="button"
                      onClick={() => handleEditLimit(s)}
                      className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-medium cursor-pointer transition-colors flex items-center gap-1 shadow-2xs"
                      title="Click to change hourly sending limit"
                    >
                      <span>Limit: {s.hourlyLimit}/hr</span>
                      <span className="text-[10px] text-emerald-600">✏️ edit</span>
                    </button>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>{s.emailAddress}</span>
                    <span>•</span>
                    <span>
                      {s.smtpHost}:{s.smtpPort}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleVerifySender(s.id)}
                    className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-slate-50 rounded-lg transition-colors"
                    title="Verify SMTP connection"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteSender(s.id, s.displayName)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Delete sender"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 3. USER PROFILE CARD */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 md:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {user?.profilePicture ? (
            <img
              src={user.profilePicture}
              alt={user.name}
              className="w-12 h-12 rounded-full object-cover border border-slate-200"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 font-bold text-lg flex items-center justify-center">
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
          )}
          <div>
            <h4 className="text-base font-bold text-slate-900">{user?.name || "ReachInbox User"}</h4>
            <p className="text-xs text-slate-500">{user?.email}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Google ID: {user?.googleId || "Authenticated"}</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors self-start sm:self-auto"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
};
