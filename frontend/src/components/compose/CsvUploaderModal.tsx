import React, { useState, useRef } from "react";
import Papa from "papaparse";
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Trash2,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { recipientApi } from "../../services/recipient.api";

interface CsvUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddRecipients: (newRecipients: string[]) => void;
  existingRecipients: string[];
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const CsvUploaderModal: React.FC<CsvUploaderModalProps> = ({
  isOpen,
  onClose,
  onAddRecipients,
  existingRecipients,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<string>("");
  const [parsedRows, setParsedRows] = useState<any[]>([]);

  const [totalDetected, setTotalDetected] = useState(0);
  const [validEmails, setValidEmails] = useState<string[]>([]);
  const [invalidEmails, setInvalidEmails] = useState<string[]>([]);
  const [duplicateCount, setDuplicateCount] = useState(0);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    parseFile(selected);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (!dropped) return;
    setFile(dropped);
    parseFile(dropped);
  };

  const parseFile = (fileToParse: File) => {
    // If text file (.txt), parse line by line
    if (fileToParse.name.endsWith(".txt")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = (event.target?.result as string) || "";
        const lines = text.split(/[\r\n,;]+/);
        processParsedData(lines.map((l) => ({ email: l.trim() })), "email");
      };
      reader.readAsText(fileToParse);
      return;
    }

    // CSV file parsing with PapaParse
    Papa.parse(fileToParse, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as any[];
        setParsedRows(rows);

        const detectedColumns = results.meta.fields || [];
        setColumns(detectedColumns);

        // Auto-detect email column
        const potentialEmailCol =
          detectedColumns.find((col) =>
            /email|e-mail|recipient|mail/i.test(col)
          ) || detectedColumns[0] || "email";

        setSelectedColumn(potentialEmailCol);
        processParsedData(rows, potentialEmailCol);
      },
      error: (err) => {
        toast.error(`CSV parsing error: ${err.message}`);
      },
    });
  };

  const processParsedData = (rows: any[], emailCol: string) => {
    const valid: string[] = [];
    const invalid: string[] = [];
    let dups = 0;

    const existingSet = new Set(existingRecipients.map((r) => r.toLowerCase()));
    const seenInFile = new Set<string>();

    rows.forEach((row) => {
      const raw = row[emailCol] ? String(row[emailCol]).trim() : "";
      if (!raw) return;

      const lower = raw.toLowerCase();
      if (!EMAIL_REGEX.test(lower)) {
        invalid.push(raw);
        return;
      }

      if (existingSet.has(lower) || seenInFile.has(lower)) {
        dups++;
        return;
      }

      seenInFile.add(lower);
      valid.push(lower);
    });

    setTotalDetected(valid.length + invalid.length + dups);
    setValidEmails(valid);
    setInvalidEmails(invalid);
    setDuplicateCount(dups);
  };

  const handleColumnChange = (newCol: string) => {
    setSelectedColumn(newCol);
    processParsedData(parsedRows, newCol);
  };

  const handleImport = () => {
    if (validEmails.length === 0) {
      toast.error("No valid email addresses to import");
      return;
    }

    onAddRecipients(validEmails);
    toast.success(`Imported ${validEmails.length} valid recipient(s)`);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setFile(null);
    setColumns([]);
    setSelectedColumn("");
    setParsedRows([]);
    setTotalDetected(0);
    setValidEmails([]);
    setInvalidEmails([]);
    setDuplicateCount(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Upload Recipient List
              </h3>
              <p className="text-xs text-slate-500">
                Upload CSV or TXT file to batch import recipient emails
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {!file ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-emerald-500/80 rounded-2xl p-8 text-center cursor-pointer bg-slate-50/50 hover:bg-emerald-50/20 transition-all flex flex-col items-center justify-center gap-3"
            >
              <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-200/80 flex items-center justify-center text-emerald-600">
                <Upload className="w-6 h-6 stroke-[1.75]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Click to upload or drag & drop
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  CSV or TXT files up to 10MB
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* File Info Bar */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">
                      Uploaded: {file.name}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-colors"
                  title="Remove and select another file"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Column Selector if multiple CSV columns exist */}
              {columns.length > 1 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Select Email Column
                  </label>
                  <select
                    value={selectedColumn}
                    onChange={(e) => handleColumnChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    {columns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Stats Summary Cards */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Total Detected
                  </span>
                  <span className="text-lg font-bold text-slate-900 mt-0.5 block">
                    {totalDetected}
                  </span>
                </div>

                <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl text-center">
                  <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider block">
                    Valid Emails
                  </span>
                  <span className="text-lg font-bold text-emerald-800 mt-0.5 block">
                    {validEmails.length}
                  </span>
                </div>

                <div className="p-3 bg-rose-50/60 border border-rose-100 rounded-xl text-center">
                  <span className="text-[10px] font-semibold text-rose-700 uppercase tracking-wider block">
                    Invalid / Dups
                  </span>
                  <span className="text-lg font-bold text-rose-800 mt-0.5 block">
                    {invalidEmails.length + duplicateCount}
                  </span>
                </div>
              </div>

              {/* Preview List */}
              {validEmails.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Valid Recipients Preview (showing first 8)
                  </h4>
                  <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white p-1">
                    {validEmails.slice(0, 8).map((email, idx) => (
                      <div
                        key={idx}
                        className="py-1 px-2.5 text-xs text-slate-700 flex items-center justify-between"
                      >
                        <span>{email}</span>
                        <Check className="w-3 h-3 text-emerald-600" />
                      </div>
                    ))}
                    {validEmails.length > 8 && (
                      <div className="py-1 px-2.5 text-[11px] text-slate-400 italic text-center">
                        + {validEmails.length - 8} more recipients...
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!file || validEmails.length === 0}
            onClick={handleImport}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-medium rounded-xl shadow-sm transition-all"
          >
            Import {validEmails.length > 0 ? `${validEmails.length} Recipients` : "Recipients"}
          </button>
        </div>
      </div>
    </div>
  );
};
