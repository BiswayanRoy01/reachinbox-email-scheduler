import React, { useState } from "react";
import { format, addDays, setHours, setMinutes, isBefore } from "date-fns";
import { Clock, Calendar, Check, X } from "lucide-react";
import { cn } from "../../utils/cn";
import { toast } from "sonner";

interface SendLaterPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectScheduleTime: (date: Date) => void;
  currentScheduleTime: Date | null;
}

export const SendLaterPopover: React.FC<SendLaterPopoverProps> = ({
  isOpen,
  onClose,
  onSelectScheduleTime,
  currentScheduleTime,
}) => {
  const [selectedTime, setSelectedTime] = useState<Date | null>(
    currentScheduleTime || addDays(setMinutes(setHours(new Date(), 10), 0), 1)
  );

  const [customDateTime, setCustomDateTime] = useState<string>(() => {
    const d = currentScheduleTime || addDays(setMinutes(setHours(new Date(), 10), 0), 1);
    // Format YYYY-MM-DDTHH:mm
    return format(d, "yyyy-MM-dd'T'HH:mm");
  });

  if (!isOpen) return null;

  const now = new Date();
  const tomorrow = addDays(now, 1);

  // Quick Preset options dynamically calculated relative to current time
  const quickOptions = [
    {
      label: "Tomorrow at 9:00 AM",
      date: setMinutes(setHours(tomorrow, 9), 0),
    },
    {
      label: "Tomorrow at 10:00 AM",
      date: setMinutes(setHours(tomorrow, 10), 0),
    },
    {
      label: "Tomorrow at 11:00 AM",
      date: setMinutes(setHours(tomorrow, 11), 0),
    },
    {
      label: "Tomorrow at 3:00 PM",
      date: setMinutes(setHours(tomorrow, 15), 0),
    },
  ];

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomDateTime(val);
    if (val) {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        setSelectedTime(d);
      }
    }
  };

  const handleDone = () => {
    if (!selectedTime) {
      toast.error("Please pick a valid date and time");
      return;
    }

    if (isBefore(selectedTime, new Date())) {
      toast.error("Scheduled time must be in the future");
      return;
    }

    onSelectScheduleTime(selectedTime);
    toast.success(`Scheduled for ${format(selectedTime, "EEE, MMM d • h:mm a")}`);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 bottom-full mb-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 z-50 animate-in fade-in zoom-in-95 duration-100">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Send Later
            </h4>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Presets */}
        <div className="space-y-1.5 mb-4">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Suggested Times
          </span>
          {quickOptions.map((opt, idx) => {
            const isSelected =
              selectedTime &&
              format(selectedTime, "yyyy-MM-dd HH:mm") === format(opt.date, "yyyy-MM-dd HH:mm");

            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setSelectedTime(opt.date);
                  setCustomDateTime(format(opt.date, "yyyy-MM-dd'T'HH:mm"));
                }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-left transition-colors",
                  isSelected
                    ? "bg-emerald-50 text-emerald-900 border border-emerald-300"
                    : "hover:bg-slate-50 text-slate-700 border border-transparent"
                )}
              >
                <span>{opt.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
              </button>
            );
          })}
        </div>

        {/* Custom Date & Time Picker */}
        <div className="pt-3 border-t border-slate-100 mb-4">
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span>Pick Custom Date & Time</span>
          </label>
          <input
            type="datetime-local"
            min={format(now, "yyyy-MM-dd'T'HH:mm")}
            value={customDateTime}
            onChange={handleCustomChange}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDone}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg shadow-sm transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </>
  );
};
