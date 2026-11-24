import React, { useState, KeyboardEvent } from "react";
import { X, Upload, Users, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface RecipientChipInputProps {
  recipients: string[];
  onChange: (recipients: string[]) => void;
  onOpenUploadModal: () => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const RecipientChipInput: React.FC<RecipientChipInputProps> = ({
  recipients,
  onChange,
  onOpenUploadModal,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);

  const addRecipient = (raw: string) => {
    const email = raw.trim().toLowerCase();
    if (!email) return;

    if (!EMAIL_REGEX.test(email)) {
      setInputError(`"${email}" is not a valid email address`);
      return;
    }

    if (recipients.includes(email)) {
      setInputError(`"${email}" is already added`);
      return;
    }

    setInputError(null);
    onChange([...recipients, email]);
    setInputValue("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      e.preventDefault();
      addRecipient(inputValue);
    } else if (e.key === "Backspace" && !inputValue && recipients.length > 0) {
      onChange(recipients.slice(0, -1));
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text");
    // Split by commas, semicolons, whitespace, or newlines
    const parts = pasteData.split(/[\s,;]+/);
    const validToAdd: string[] = [];
    let duplicates = 0;
    let invalid = 0;

    const currentSet = new Set(recipients);

    parts.forEach((p) => {
      const email = p.trim().toLowerCase();
      if (!email) return;
      if (!EMAIL_REGEX.test(email)) {
        invalid++;
        return;
      }
      if (currentSet.has(email) || validToAdd.includes(email)) {
        duplicates++;
        return;
      }
      validToAdd.push(email);
    });

    if (validToAdd.length > 0) {
      onChange([...recipients, ...validToAdd]);
      toast.success(`Added ${validToAdd.length} recipient(s)`);
    }
    if (invalid > 0 || duplicates > 0) {
      toast.info(
        `Ignored ${invalid} invalid address(es) and ${duplicates} duplicate(s)`
      );
    }
    setInputValue("");
  };

  const removeRecipient = (indexToRemove: number) => {
    onChange(recipients.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <label className="font-semibold text-slate-700 uppercase tracking-wider">
          To (Recipients)
        </label>
        <button
          type="button"
          onClick={onOpenUploadModal}
          className="inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800 font-medium transition-colors"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload CSV / TXT</span>
        </button>
      </div>

      {/* Chips Container */}
      <div className="min-h-[46px] p-2 bg-white border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all flex flex-wrap items-center gap-1.5">
        {recipients.map((email, idx) => (
          <span
            key={idx}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-900 border border-emerald-300 transition-all animate-in fade-in zoom-in-95 duration-100"
          >
            <span>{email}</span>
            <button
              type="button"
              onClick={() => removeRecipient(idx)}
              className="w-3.5 h-3.5 rounded-full hover:bg-emerald-200/60 flex items-center justify-center text-emerald-700 hover:text-emerald-950 transition-colors"
            >
              <X className="w-2.5 h-2.5 stroke-[2.5]" />
            </button>
          </span>
        ))}

        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            if (inputError) setInputError(null);
          }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={() => {
            if (inputValue.trim()) {
              addRecipient(inputValue);
            }
          }}
          placeholder={recipients.length === 0 ? "Enter email addresses separated by enter or commas..." : "Add more..."}
          className="flex-1 min-w-[200px] border-none bg-transparent px-2 py-1 text-xs md:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
        />
      </div>

      {inputError && (
        <p className="text-xs text-rose-600 flex items-center gap-1 mt-1">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{inputError}</span>
        </p>
      )}

      {recipients.length > 0 && (
        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
          <span>{recipients.length} recipient(s) ready</span>
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-slate-400 hover:text-rose-600 transition-colors"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
};
