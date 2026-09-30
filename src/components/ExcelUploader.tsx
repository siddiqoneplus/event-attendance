"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, X, Check, AlertCircle } from "lucide-react";

export default function ExcelUploader({ eventId, onUploadSuccess }: { eventId: string, onUploadSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [dataPreview, setDataPreview] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  
  const [mapping, setMapping] = useState<{ [key: string]: string }>({
    rollNumber: "",
    name: "",
    branch: "",
    section: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFile(file);
    setError("");
    setSuccess("");

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        if (data.length < 2) throw new Error("Excel file seems empty or invalid");
        
        const headers = data[0] as string[];
        setColumns(headers);
        
        const preview = data.slice(1, 6).map((row: any) => {
          let obj: any = {};
          headers.forEach((h, i) => obj[h] = row[i]);
          return obj;
        });
        
        setDataPreview(preview);
        
        // Auto-map columns
        const newMapping = { ...mapping };
        headers.forEach(h => {
          const lower = h.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (lower.includes('roll') || lower.includes('reg')) newMapping.rollNumber = h;
          if (lower.includes('name')) newMapping.name = h;
          if (lower.includes('branch') || lower.includes('dept')) newMapping.branch = h;
          if (lower.includes('sec')) newMapping.section = h;
        });
        setMapping(newMapping);

      } catch (err: any) {
        setError("Error parsing Excel: " + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  const processAndUpload = async () => {
    if (!mapping.rollNumber || !mapping.name) {
      setError("Roll Number and Name columns must be mapped.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const bstr = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsBinaryString(file!);
      });

      const wb = XLSX.read(bstr, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(ws);

      const participants = rawData.map((row: any) => ({
        rollNumber: String(row[mapping.rollNumber] || "").trim(),
        name: String(row[mapping.name] || "").trim(),
        branch: mapping.branch ? String(row[mapping.branch] || "").trim() : null,
        section: mapping.section ? String(row[mapping.section] || "").trim() : null,
      })).filter(p => p.rollNumber && p.name);

      if (participants.length === 0) throw new Error("No valid records found after mapping.");

      const res = await fetch(`/api/admin/events/${eventId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participants })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      setSuccess(`Successfully imported ${result.addedCount} new participants.`);
      setFile(null);
      setDataPreview([]);
      onUploadSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!file) {
    return (
      <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 text-center bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
        <Upload className="w-10 h-10 mx-auto text-slate-400 mb-4" />
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Upload Excel or CSV file containing participant list
        </p>
        <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium cursor-pointer transition-colors">
          <FileSpreadsheet className="w-4 h-4" />
          Browse Files
          <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} />
        </label>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
      <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="w-6 h-6 text-green-600" />
          <div>
            <h3 className="font-medium text-slate-900 dark:text-white">{file.name}</h3>
            <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
        </div>
        <button onClick={() => setFile(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
          <X className="w-5 h-5 text-slate-500" />
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3 text-green-700 text-sm">
          <Check className="w-5 h-5 flex-shrink-0" />
          <p>{success}</p>
        </div>
      )}

      {dataPreview.length > 0 && !success && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.keys(mapping).map((field) => (
              <div key={field} className="space-y-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">
                  {field.replace(/([A-Z])/g, ' $1').trim()} {['rollNumber', 'name'].includes(field) && <span className="text-red-500">*</span>}
                </label>
                <select
                  value={mapping[field]}
                  onChange={(e) => setMapping({...mapping, [field]: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Ignore --</option>
                  {columns.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            ))}
          </div>

          <div>
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Data Preview</h4>
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800">
                    {columns.map(c => <th key={c} className="p-2 border-b dark:border-slate-700 font-medium">{c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {dataPreview.map((row, i) => (
                    <tr key={i} className="border-b dark:border-slate-700 last:border-0">
                      {columns.map(c => <td key={c} className="p-2 text-slate-600 dark:text-slate-400">{row[c]}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button
            onClick={processAndUpload}
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-70 flex justify-center items-center gap-2"
          >
            {loading ? "Processing..." : "Confirm & Import Participants"}
          </button>
        </div>
      )}
    </div>
  );
}
