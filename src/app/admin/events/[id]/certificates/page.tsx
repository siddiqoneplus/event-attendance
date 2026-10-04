"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Upload, Download, Award, Users, Sliders,
  CheckCircle2, AlertCircle, Loader2, Eye, ImageIcon
} from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";

interface Attendee {
  id: string;
  rollNumber: string;
  name: string;
  branch: string | null;
  section: string | null;
}

interface EventInfo {
  id: string;
  name: string;
  date: string;
  venue: string | null;
}

interface CertConfig {
  templateBase64: string | null;
  nameX: number;
  nameY: number;
  fontSize: number;
  fontColor: string;
  fontFamily: string;
  bold: boolean;
  maxWidth: number;
  showRoll: boolean;
  rollX: number;
  rollY: number;
  rollFontSize: number;
}

const DEFAULT_CONFIG: CertConfig = {
  templateBase64: null,
  nameX: 50,
  nameY: 55,
  fontSize: 52,
  fontColor: "#1e3a5f",
  fontFamily: "Georgia",
  bold: true,
  maxWidth: 70,
  showRoll: false,
  rollX: 50,
  rollY: 62,
  rollFontSize: 28,
};

export default function CertificatesPage() {
  const params = useParams();
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [config, setConfig] = useState<CertConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [activeTab, setActiveTab] = useState<"setup" | "preview">("setup");
  const [previewName, setPreviewName] = useState("Student Full Name");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Load event + saved config ────────────────────────────────
  useEffect(() => {
    fetch(`/api/admin/events/${params.id}/certificates`)
      .then(r => r.json())
      .then(data => {
        if (data.event) setEvent(data.event);
        if (data.attendees) setAttendees(data.attendees);
        if (data.certConfig) setConfig(prev => ({ ...prev, ...data.certConfig }));
        setLoading(false);
      });
  }, [params.id]);

  // ─── Draw preview whenever config or previewName changes ──────
  const drawPreview = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !config.templateBase64) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      // Draw name
      const nameFont = `${config.bold ? "bold " : ""}${config.fontSize}px ${config.fontFamily}`;
      ctx.font = nameFont;
      ctx.fillStyle = config.fontColor;
      ctx.textAlign = "center";
      const nameX = (config.nameX / 100) * canvas.width;
      const nameY = (config.nameY / 100) * canvas.height;
      const maxPx = (config.maxWidth / 100) * canvas.width;
      ctx.fillText(previewName, nameX, nameY, maxPx);

      // Draw roll number if enabled
      if (config.showRoll) {
        ctx.font = `${config.rollFontSize}px ${config.fontFamily}`;
        ctx.fillStyle = config.fontColor;
        ctx.textAlign = "center";
        const rollX = (config.rollX / 100) * canvas.width;
        const rollY = (config.rollY / 100) * canvas.height;
        ctx.fillText("23A81A0501", rollX, rollY);
      }
    };
    img.src = config.templateBase64!;
  }, [config, previewName]);

  useEffect(() => {
    if (activeTab === "preview") drawPreview();
  }, [activeTab, drawPreview]);

  // ─── Handle template image upload ─────────────────────────────
  const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Please upload an image file (PNG, JPG)." });
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      const base64 = ev.target?.result as string;
      setConfig(prev => ({ ...prev, templateBase64: base64 }));
      setMessage({ type: "success", text: `Template "${file.name}" loaded!` });
    };
    reader.readAsDataURL(file);
  };

  // ─── Save config to MongoDB ────────────────────────────────────
  const handleSaveConfig = async () => {
    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      const res = await fetch(`/api/admin/events/${params.id}/certificates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error("Failed to save");
      setMessage({ type: "success", text: "Certificate configuration saved!" });
    } catch {
      setMessage({ type: "error", text: "Failed to save configuration." });
    } finally {
      setSaving(false);
    }
  };

  // ─── Generate one certificate on a canvas ─────────────────────
  const generateCertificate = (
    attendee: Attendee,
    templateImg: HTMLImageElement
  ): Promise<Blob> => {
    return new Promise(resolve => {
      const offscreen = document.createElement("canvas");
      offscreen.width = templateImg.width;
      offscreen.height = templateImg.height;
      const ctx = offscreen.getContext("2d")!;

      ctx.drawImage(templateImg, 0, 0);

      // Name
      ctx.font = `${config.bold ? "bold " : ""}${config.fontSize}px ${config.fontFamily}`;
      ctx.fillStyle = config.fontColor;
      ctx.textAlign = "center";
      const nameX = (config.nameX / 100) * offscreen.width;
      const nameY = (config.nameY / 100) * offscreen.height;
      const maxPx = (config.maxWidth / 100) * offscreen.width;
      ctx.fillText(attendee.name, nameX, nameY, maxPx);

      // Roll number
      if (config.showRoll) {
        ctx.font = `${config.rollFontSize}px ${config.fontFamily}`;
        ctx.textAlign = "center";
        const rollX = (config.rollX / 100) * offscreen.width;
        const rollY = (config.rollY / 100) * offscreen.height;
        ctx.fillText(attendee.rollNumber, rollX, rollY);
      }

      offscreen.toBlob(blob => resolve(blob!), "image/png");
    });
  };

  // ─── Generate all certificates as ZIP ─────────────────────────
  const handleGenerateZip = async () => {
    if (!config.templateBase64) {
      setMessage({ type: "error", text: "Please upload a certificate template first." });
      return;
    }
    if (attendees.length === 0) {
      setMessage({ type: "error", text: "No students marked present for this event." });
      return;
    }

    setGenerating(true);
    setProgress(0);
    setMessage({ type: "", text: "" });

    try {
      // Pre-load the template image once
      const templateImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = config.templateBase64!;
      });

      const zip = new JSZip();
      const folder = zip.folder("certificates")!;

      for (let i = 0; i < attendees.length; i++) {
        const attendee = attendees[i];
        const blob = await generateCertificate(attendee, templateImg);
        const filename = `${attendee.rollNumber}_${attendee.name.replace(/\s+/g, "_")}.png`;
        folder.file(filename, blob);
        setProgress(Math.round(((i + 1) / attendees.length) * 100));
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const eventName = event?.name.replace(/[^a-z0-9]/gi, "_").toLowerCase() || "event";
      saveAs(zipBlob, `${eventName}_certificates.zip`);
      setMessage({ type: "success", text: `✅ ${attendees.length} certificates downloaded!` });
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Generation failed." });
    } finally {
      setGenerating(false);
      setProgress(0);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin" />
        Loading certificate settings...
      </div>
    );
  }

  const inputCls = "w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all";

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link
            href={`/admin/events/${params.id}`}
            className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-2 transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Event
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Award className="w-7 h-7 text-amber-500" />
            Certificate Generator
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {event?.name} — {attendees.length} student{attendees.length !== 1 ? "s" : ""} present
          </p>
        </div>

        <button
          onClick={handleGenerateZip}
          disabled={generating || !config.templateBase64 || attendees.length === 0}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-xl font-semibold shadow-lg shadow-amber-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Generating {progress}%</>
          ) : (
            <><Download className="w-5 h-5" /> Download All ({attendees.length}) ZIP</>
          )}
        </button>
      </div>

      {/* Progress bar */}
      {generating && (
        <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-2 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Status message */}
      {message.text && (
        <div className={`p-4 rounded-xl flex items-start gap-3 text-sm ${message.type === "success" ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800" : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"}`}>
          {message.type === "success" ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <p>{message.text}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
        {(["setup", "preview"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${activeTab === tab ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
          >
            {tab === "setup" ? <><Sliders className="w-4 h-4 inline mr-1.5" />Setup</> : <><Eye className="w-4 h-4 inline mr-1.5" />Preview</>}
          </button>
        ))}
      </div>

      {activeTab === "setup" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Template Upload */}
          <div className="glass-panel rounded-2xl p-6 space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-blue-500" /> Certificate Template
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Upload a PNG or JPG image as your certificate background. Your college logo, border, and decorative elements should already be in this image.
            </p>

            <div
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 ${config.templateBase64 ? "border-green-400 bg-green-50/50 dark:bg-green-900/10" : "border-slate-300 dark:border-slate-600"}`}
            >
              {config.templateBase64 ? (
                <>
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">Template loaded! Click to replace.</p>
                  <img src={config.templateBase64} alt="Template" className="w-full max-h-40 object-contain rounded-lg mt-2 shadow" />
                </>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-slate-400" />
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Click to upload template</p>
                  <p className="text-xs text-slate-400">PNG, JPG • A4 landscape recommended</p>
                </>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleTemplateUpload} />
          </div>

          {/* Text Positioning */}
          <div className="glass-panel rounded-2xl p-6 space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-purple-500" /> Text Settings
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Name X Position (%)</label>
                <input type="number" min={0} max={100} value={config.nameX} onChange={e => setConfig(p => ({ ...p, nameX: +e.target.value }))} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Name Y Position (%)</label>
                <input type="number" min={0} max={100} value={config.nameY} onChange={e => setConfig(p => ({ ...p, nameY: +e.target.value }))} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Font Size (px)</label>
                <input type="number" min={10} max={200} value={config.fontSize} onChange={e => setConfig(p => ({ ...p, fontSize: +e.target.value }))} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Max Width (%)</label>
                <input type="number" min={10} max={100} value={config.maxWidth} onChange={e => setConfig(p => ({ ...p, maxWidth: +e.target.value }))} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Font Color</label>
                <div className="flex gap-2">
                  <input type="color" value={config.fontColor} onChange={e => setConfig(p => ({ ...p, fontColor: e.target.value }))} className="h-10 w-12 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer p-1 bg-white dark:bg-slate-800" />
                  <input type="text" value={config.fontColor} onChange={e => setConfig(p => ({ ...p, fontColor: e.target.value }))} className={inputCls} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Font Family</label>
                <select value={config.fontFamily} onChange={e => setConfig(p => ({ ...p, fontFamily: e.target.value }))} className={inputCls}>
                  <option>Georgia</option>
                  <option>Times New Roman</option>
                  <option>Arial</option>
                  <option>Verdana</option>
                  <option>Trebuchet MS</option>
                  <option>Palatino Linotype</option>
                  <option>Book Antiqua</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <div className={`relative w-10 h-6 rounded-full transition-colors ${config.bold ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-600"}`} onClick={() => setConfig(p => ({ ...p, bold: !p.bold }))}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${config.bold ? "translate-x-5" : "translate-x-1"}`} />
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Bold Name</span>
            </label>

            <div className="border-t border-slate-200 dark:border-slate-700 pt-3 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <div className={`relative w-10 h-6 rounded-full transition-colors ${config.showRoll ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-600"}`} onClick={() => setConfig(p => ({ ...p, showRoll: !p.showRoll }))}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${config.showRoll ? "translate-x-5" : "translate-x-1"}`} />
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Show Roll Number</span>
              </label>
              {config.showRoll && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Roll X (%)</label>
                    <input type="number" min={0} max={100} value={config.rollX} onChange={e => setConfig(p => ({ ...p, rollX: +e.target.value }))} className={inputCls} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Roll Y (%)</label>
                    <input type="number" min={0} max={100} value={config.rollY} onChange={e => setConfig(p => ({ ...p, rollY: +e.target.value }))} className={inputCls} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Roll Font (px)</label>
                    <input type="number" min={10} max={100} value={config.rollFontSize} onChange={e => setConfig(p => ({ ...p, rollFontSize: +e.target.value }))} className={inputCls} />
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-60"
            >
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "Save Configuration"}
            </button>
          </div>
        </div>
      )}

      {activeTab === "preview" && (
        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Live Preview</h3>
              <p className="text-sm text-slate-500">Edit the name below to preview any student&apos;s certificate.</p>
            </div>
            <input
              type="text"
              value={previewName}
              onChange={e => { setPreviewName(e.target.value); drawPreview(); }}
              placeholder="Preview name..."
              className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
            />
          </div>

          {config.templateBase64 ? (
            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
              <canvas ref={canvasRef} className="w-full" />
            </div>
          ) : (
            <div className="p-16 flex flex-col items-center gap-3 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
              <ImageIcon className="w-12 h-12 opacity-30" />
              <p className="text-sm">Upload a template in Setup to see a preview here.</p>
            </div>
          )}
        </div>
      )}

      {/* Attendee list */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-green-500" /> Present Students ({attendees.length})
          </h3>
          <span className="text-xs text-slate-500">Certificates will be generated for all students below</span>
        </div>
        {attendees.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No students have been marked present for this event yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-96 overflow-y-auto">
            {attendees.map((a, i) => (
              <div key={a.id} className="px-4 py-3 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                <span className="text-xs font-mono text-slate-400 w-6">{i + 1}</span>
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">{a.name}</p>
                  <p className="text-xs text-slate-500 font-mono">{a.rollNumber} {a.branch ? `• ${a.branch}` : ""} {a.section ? `- ${a.section}` : ""}</p>
                </div>
                <button
                  onClick={() => { setPreviewName(a.name); setActiveTab("preview"); drawPreview(); }}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex-shrink-0"
                >
                  Preview
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
