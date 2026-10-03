"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import ExcelUploader from "@/components/ExcelUploader";
import { Calendar, MapPin, Activity, QrCode, UserPlus, X, Loader2 } from "lucide-react";
import Link from "next/link";

interface EventData {
  id: string;
  eventId: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  venue: string | null;
  status: string;
  _count?: { participants: number; attendance: number };
}

interface ParticipantData {
  id: string;
  rollNumber: string;
  name: string;
  branch: string | null;
  section: string | null;
}

export default function EventDetails() {
  const params = useParams();
  const [event, setEvent] = useState<EventData | null>(null);
  const [participants, setParticipants] = useState<ParticipantData[]>([]);
  const [activeTab, setActiveTab] = useState("overview");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addingParticipant, setAddingParticipant] = useState(false);
  const [newParticipant, setNewParticipant] = useState({ rollNumber: "", name: "", branch: "", section: "" });

  const fetchEvent = useCallback(async () => {
    const res = await fetch(`/api/admin/events/${params.id}`);
    const data = await res.json();
    if (data.event) setEvent(data.event);
  }, [params.id]);

  const fetchParticipants = useCallback(async () => {
    const res = await fetch(`/api/admin/events/${params.id}/participants`);
    const data = await res.json();
    if (data.participants) setParticipants(data.participants);
  }, [params.id]);

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingParticipant(true);
    try {
      const res = await fetch(`/api/admin/events/${params.id}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          participants: [{
            rollNumber: newParticipant.rollNumber.trim().toUpperCase(),
            name: newParticipant.name.trim(),
            branch: newParticipant.branch.trim() || null,
            section: newParticipant.section.trim() || null
          }] 
        })
      });
      if (res.ok) {
        const data = await res.json();
        setIsAddModalOpen(false);
        setNewParticipant({ rollNumber: "", name: "", branch: "", section: "" });
        fetchEvent();
        fetchParticipants();
        if (data.addedCount === 0) {
          alert("This participant is already registered for this event.");
        }
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch {
      alert("Failed to add participant. Please try again.");
    } finally {
      setAddingParticipant(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line
    fetchEvent();
    fetchParticipants();
  }, [fetchEvent, fetchParticipants]);

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
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h3 className="font-semibold text-slate-900 dark:text-white">Authorized Participants ({participants.length})</h3>
                <button 
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" /> Add Member Manually
                </button>
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

      {/* Add Participant Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-500" />
                Add Participant
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <form onSubmit={handleAddParticipant} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Roll Number <span className="text-red-500">*</span></label>
                <input 
                  type="text" required
                  value={newParticipant.rollNumber}
                  onChange={e => setNewParticipant({...newParticipant, rollNumber: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. 21A91A0501"
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Full Name <span className="text-red-500">*</span></label>
                <input 
                  type="text" required
                  value={newParticipant.name}
                  onChange={e => setNewParticipant({...newParticipant, name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. John Doe"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Branch</label>
                  <input 
                    type="text"
                    value={newParticipant.branch}
                    onChange={e => setNewParticipant({...newParticipant, branch: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. CSE"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Section</label>
                  <input 
                    type="text"
                    value={newParticipant.section}
                    onChange={e => setNewParticipant({...newParticipant, section: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. A"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={addingParticipant || !newParticipant.rollNumber || !newParticipant.name} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-70 flex items-center gap-2">
                  {addingParticipant ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Participant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
