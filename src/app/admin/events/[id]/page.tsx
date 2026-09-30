"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ExcelUploader from "@/components/ExcelUploader";
import { Calendar, MapPin, Users, Activity, QrCode } from "lucide-react";
import Link from "next/link";

export default function EventDetails() {
  const params = useParams();
  const [event, setEvent] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("overview");

  const fetchEvent = async () => {
    const res = await fetch(`/api/admin/events/${params.id}`);
    const data = await res.json();
    if (data.event) setEvent(data.event);
  };

  const fetchParticipants = async () => {
    const res = await fetch(`/api/admin/events/${params.id}/participants`);
    const data = await res.json();
    if (data.participants) setParticipants(data.participants);
  };

  useEffect(() => {
    fetchEvent();
    fetchParticipants();
  }, [params.id]);

  if (!event) return <div className="p-8 text-center text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-2.5 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-bold rounded-md">
              {event.eventId}
            </span>
            <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${event.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
              {event.status}
            </span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{event.name}</h1>
          <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {event.date} ({event.startTime} - {event.endTime})</span>
            <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {event.venue || 'TBA'}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700">
        {['overview', 'participants', 'attendance'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === tab ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-panel p-5 rounded-2xl">
              <p className="text-sm text-slate-500">Registered</p>
              <h3 className="text-2xl font-bold mt-1">{event._count?.participants || 0}</h3>
            </div>
            <div className="glass-panel p-5 rounded-2xl">
              <p className="text-sm text-slate-500">Present</p>
              <h3 className="text-2xl font-bold mt-1 text-green-600">{event._count?.attendance || 0}</h3>
            </div>
            <div className="glass-panel p-5 rounded-2xl lg:col-span-2">
              <h3 className="text-lg font-semibold mb-3">Quick Actions</h3>
              <div className="flex gap-3">
                <Link href={`/admin/events/${event.id}/qr`} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium">
                  <QrCode className="w-4 h-4" /> Generate Event QR
                </Link>
                <Link href={`/admin/events/${event.id}/live`} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
                  <Activity className="w-4 h-4" /> Live Dashboard
                </Link>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'participants' && (
          <div className="space-y-6">
            <ExcelUploader eventId={event.id} onUploadSuccess={() => { fetchEvent(); fetchParticipants(); }} />
            
            <div className="glass-panel rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 flex justify-between items-center">
                <h3 className="font-semibold text-slate-900 dark:text-white">Authorized Participants ({participants.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50">
                      <th className="p-3 border-b dark:border-slate-700">Roll Number</th>
                      <th className="p-3 border-b dark:border-slate-700">Name</th>
                      <th className="p-3 border-b dark:border-slate-700">Branch</th>
                      <th className="p-3 border-b dark:border-slate-700">Section</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {participants.map(p => (
                      <tr key={p.id}>
                        <td className="p-3 font-medium">{p.rollNumber}</td>
                        <td className="p-3">{p.name}</td>
                        <td className="p-3">{p.branch || '-'}</td>
                        <td className="p-3">{p.section || '-'}</td>
                      </tr>
                    ))}
                    {participants.length === 0 && (
                      <tr><td colSpan={4} className="p-8 text-center text-slate-500">No participants registered yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="glass-panel p-8 text-center rounded-2xl">
            <Activity className="w-12 h-12 mx-auto text-slate-400 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">Live Attendance Tracking</h3>
            <p className="text-slate-500 mb-6">Open the live dashboard to view real-time scans.</p>
            <Link href={`/admin/events/${event.id}/live`} className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors">
              Open Live Dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
