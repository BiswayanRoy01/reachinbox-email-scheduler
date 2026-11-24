import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from "date-fns";

export function formatDateTime(dateInput?: string | Date | null): string {
  if (!dateInput) return "—";
  const date = typeof dateInput === "string" ? parseISO(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "—";

  if (isToday(date)) {
    return `Today at ${format(date, "h:mm a")}`;
  }
  if (isYesterday(date)) {
    return `Yesterday at ${format(date, "h:mm a")}`;
  }
  return format(date, "EEE, MMM d • h:mm a");
}

export function formatShortDate(dateInput?: string | Date | null): string {
  if (!dateInput) return "—";
  const date = typeof dateInput === "string" ? parseISO(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "—";

  if (isToday(date)) {
    return format(date, "h:mm a");
  }
  return format(date, "MMM d, h:mm a");
}

export function formatScheduledBadge(dateInput?: string | Date | null): string {
  if (!dateInput) return "Scheduled";
  const date = typeof dateInput === "string" ? parseISO(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "Scheduled";

  if (isToday(date)) {
    return `Today ${format(date, "h:mm a")}`;
  }
  return format(date, "EEE h:mm a");
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function truncateText(text: string, maxLength: number): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}
