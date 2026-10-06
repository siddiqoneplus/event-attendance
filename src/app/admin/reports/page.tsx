"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { FileSpreadsheet, CalendarDays, Trash2, Loader2, AlertTriangle, X, Users, CheckCircle2 } from "lucide-react";
import { calculateStudentYear, type RollNumberConfig, DEFAULT_CONFIG } from "@/lib/rollNumber";

interface EventItem {
  id: string;
  name: string;
  date: string;
  status: string;
  _count?: { participants: number; attendance: number };
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  COMPLETED: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  DRAFT:     "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  UPCOMING:  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function Reports() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [rollConfig, setRollConfig] = useState<RollNumberConfig>(DEFAULT_CONFIG);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<EventItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    fetch('/api/admin/events')
      .then(res => res.json())
      .then(data => {
        setEvents(data.events || []);
        setLoading(false);
      });
    fetch('/api/admin/settings')
      .then(res => res.json())
      .then(data => {
        if (data.settings) setRollConfig(prev => ({ ...prev, ...data.settings }));
      });
  }, []);

  const exportAttendance = async (eventId: string, eventName: string) => {
    setExportingId(eventId);
    try {
      const [resAttendance, resParticipants] = await Promise.all([
        fetch(`/api/admin/events/${eventId}/attendance`),
        fetch(`/api/admin/events/${eventId}/participants`)
      ]);

      const dataAttendance = await resAttendance.json();
      const dataParticipants = await resParticipants.json();

      const attendanceMap = new Map<string, { attendanceTime: string }>();
      (dataAttendance.attendance || []).forEach((scan: { participantId: string; attendanceTime: string }) => {
        attendanceMap.set(scan.participantId, scan);
      });

      const exportData = (dataParticipants.participants || []).map((p: {
        id: string; rollNumber: string; name: string;
        branch: string | null; section: string | null;
        admissionYear?: number | null; academicYear?: string | null;
      }) => {
        const attendance = attendanceMap.get(p.id);
        const yearResult = calculateStudentYear(p.rollNumber, rollConfig);
        const yearLabel = yearResult.valid ? yearResult.label : (p.admissionYear ? `${p.admissionYear}` : '-');
        return {
          "Roll Number": p.rollNumber,
          "Name": p.name,
          "Branch": p.branch || "-",
          "Section": p.section || "-",
          "Year": yearLabel,
          "Attendance Status": attendance ? "Present" : "Absent",
          "Date": attendance ? new Date(attendance.attendanceTime).toLocaleDateString() : "-",
          "Time": attendance ? new Date(attendance.attendanceTime).toLocaleTimeString() : "-",
        };
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Attendance");
      XLSX.writeFile(wb, `${eventName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_attendance.xlsx`);
    } catch (err) {
      console.error(err);
      alert("Failed to export report");
    } finally {
      setExportingId(null);
    }
  };

  const openDeleteModal = (event: EventItem) => {
    setDeleteTarget(event);
    setDeleteConfirm("");
    setDeleteError("");
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/admin/events/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      setEvents(prev => prev.filter(e => e.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reports &amp; Exports</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Download attendance reports or delete events</p>
      </div>

      {/* Events list */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading events...
          </div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No events found.</div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {events.map((event) => (
              <div
                key={event.id}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
              >
                {/* Event info */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 flex-shrink-0">
                    <CalendarDays className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 dark:text-white text-lg">{event.name}</h3>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[event.status] || STATUS_COLORS.DRAFT}`}>
                        {event.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                      <span>{event.date}</span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" /> {event._count?.participants || 0} Registered
                      </span>
                      <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {event._count?.attendance || 0} Present
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => exportAttendance(event.id, event.name)}
                    disabled={exportingId === event.id}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {exportingId === event.id
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                      : <><FileSpreadsheet className="w-4 h-4" /> Export Excel</>
                    }
                  </button>

                  <button
                    onClick={() => openDeleteModal(event)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Delete Confirmation Modal ─────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            {/* Modal header */}
            <div className="p-6 flex items-start gap-4 border-b border-slate-100 dark:border-slate-800">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Delete Event?</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  This permanently deletes <strong>&ldquo;{deleteTarget.name}&rdquo;</strong> along with all attendance records and participant assignments. This cannot be undone.
                </p>
              </div>
              <button onClick={() => setDeleteTarget(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {deleteError && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm border border-red-100 dark:border-red-900/50">
                  {deleteError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Type <span className="font-mono font-bold text-red-600 dark:text-red-400">{deleteTarget.name}</span> to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirm}
                  onChange={e => setDeleteConfirm(e.target.value)}
                  placeholder="Type event name to confirm..."
                  autoFocus
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting || deleteConfirm !== deleteTarget.name}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                  {deleting
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</>
                    : <><Trash2 className="w-4 h-4" /> Delete Permanently</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
