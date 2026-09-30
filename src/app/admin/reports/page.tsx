"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { Download, FileSpreadsheet, CalendarDays } from "lucide-react";

export default function Reports() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingId, setExportingId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/events')
      .then(res => res.json())
      .then(data => {
        setEvents(data.events || []);
        setLoading(false);
      });
  }, []);

  const exportAttendance = async (eventId: string, eventName: string) => {
    setExportingId(eventId);
    try {
      // Fetch full attendance data
      const res = await fetch(`/api/admin/events/${eventId}/live`);
      const data = await res.json();
      
      const resParticipants = await fetch(`/api/admin/events/${eventId}/participants`);
      const dataParticipants = await resParticipants.json();
      
      // Combine data
      const attendanceMap = new Map();
      data.recentScans.forEach((scan: any) => {
        attendanceMap.set(scan.participantId, scan);
      });

      const exportData = dataParticipants.participants.map((p: any) => {
        const attendance = attendanceMap.get(p.id);
        return {
          "Roll Number": p.rollNumber,
          "Name": p.name,
          "Branch": p.branch || "-",
          "Section": p.section || "-",
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reports & Exports</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Download attendance reports for your events</p>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading events...</div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No events found.</div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {events.map((event) => (
              <div key={event.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 flex-shrink-0">
                    <CalendarDays className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg">{event.name}</h3>
                    <p className="text-sm text-slate-500 mt-1">{event.date} • {event._count?.participants || 0} Registered • {event._count?.attendance || 0} Present</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <button 
                    onClick={() => exportAttendance(event.id, event.name)}
                    disabled={exportingId === event.id}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-70 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {exportingId === event.id ? (
                      "Generating..."
                    ) : (
                      <><FileSpreadsheet className="w-4 h-4" /> Export Excel</>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
