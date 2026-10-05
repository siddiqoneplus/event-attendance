"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import ExcelUploader from "@/components/ExcelUploader";
import { Calendar, MapPin, Activity, QrCode, UserPlus, X, Loader2, StopCircle, CheckCircle2, Award, Trash2, AlertTriangle, Search, SlidersHorizontal } from "lucide-react";
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
  const router = useRouter();
  const [event, setEvent] = useState<EventData | null>(null);
  const [participants, setParticipants] = useState<ParticipantData[]>([]);
  const [activeTab, setActiveTab] = useState("overview");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addingParticipant, setAddingParticipant] = useState(false);
  const [stoppingEvent, setStoppingEvent] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [modalError, setModalError] = useState("");
  const [modalSuccess, setModalSuccess] = useState("");
  const [newParticipant, setNewParticipant] = useState({ rollNumber: "", name: "", branch: "", section: "" });

  // Search & filter state
  const [search, setSearch] = useState("");
  const [filterBranch, setFilterBranch] = useState("");
  const [filterSection, setFilterSection] = useState("");

  // Derived unique values for filter dropdowns
  const branches = useMemo(() => [...new Set(participants.map(p => p.branch).filter(Boolean))].sort() as string[], [participants]);
  const sections = useMemo(() => [...new Set(participants.map(p => p.section).filter(Boolean))].sort() as string[], [participants]);

  // Filtered participants
  const filteredParticipants = useMemo(() => {
    const q = search.toLowerCase().trim();
    return participants.filter(p => {
      const matchSearch = !q || p.name.toLowerCase().includes(q) || p.rollNumber.toLowerCase().includes(q);
      const matchBranch = !filterBranch || p.branch === filterBranch;
      const matchSection = !filterSection || p.section === filterSection;
      return matchSearch && matchBranch && matchSection;
    });
  }, [participants, search, filterBranch, filterSection]);

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

  const handleStopEvent = async () => {
    if (!confirm(`Stop "${event?.name}"? Employees will no longer see this event.`)) return;
    setStoppingEvent(true);
    try {
      const res = await fetch(`/api/admin/events/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' })
      });
      if (res.ok) {
        await fetchEvent();
      }
    } finally {
      setStoppingEvent(false);
    }
  };

  const handleDeleteEvent = async () => {
    setDeletingEvent(true);
    try {
      const res = await fetch(`/api/admin/events/${params.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete event');
      router.push('/admin/events');
    } catch {
      setDeletingEvent(false);
      setShowDeleteModal(false);
    }
  };

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingParticipant(true);
    setModalError("");
    setModalSuccess("");
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
      const data = await res.json();
      if (res.ok) {
        if (data.addedCount === 0) {
          setModalError(`"${newParticipant.rollNumber.trim().toUpperCase()}" is already registered for this event.`);
        } else {
          setModalSuccess(`✓ ${newParticipant.name.trim()} added successfully!`);
          setNewParticipant({ rollNumber: "", name: "", branch: "", section: "" });
          fetchEvent();
          fetchParticipants();
        }
      } else {
        setModalError(data.error || "Failed to add participant. Please try again.");
      }
    } catch {
      setModalError("Network error. Please check your connection and try again.");
    } finally {
      setAddingParticipant(false);
    }
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setModalError("");
    setModalSuccess("");
    setNewParticipant({ rollNumber: "", name: "", branch: "", section: "" });
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
            <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${
              event.status === 'ACTIVE' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
              event.status === 'COMPLETED' ? 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400' :
              'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
            }`}>
              {event.status === 'COMPLETED' ? '⏹ Stopped' : event.status}
            </span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{event.name}</h1>
          <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {event.date} ({event.startTime} - {event.endTime})</span>
            <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {event.venue || 'TBA'}</span>
          </div>
        </div>

        {/* Stop event button — only shown if ACTIVE */}
        {event.status === 'ACTIVE' && (
          <button
            onClick={handleStopEvent}
            disabled={stoppingEvent}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-70 shadow-lg shadow-red-500/20 flex-shrink-0"
          >
            {stoppingEvent ? <Loader2 className="w-4 h-4 animate-spin" /> : <StopCircle className="w-4 h-4" />}
            {stoppingEvent ? 'Stopping...' : 'Stop Event'}
          </button>
        )}

        {/* Restart button if stopped */}
        {event.status === 'COMPLETED' && (
          <button
            onClick={async () => {
              if (!confirm('Reactivate this event? Employees will be able to scan again.')) return;
              await fetch(`/api/admin/events/${params.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'ACTIVE' })
              });
              await fetchEvent();
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-green-500/20 flex-shrink-0"
          >
            <CheckCircle2 className="w-4 h-4" /> Reactivate Event
          </button>
        )}

        {/* Generate Certificates */}
        <Link
          href={`/admin/events/${params.id}/certificates`}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-amber-500/20 flex-shrink-0"
        >
          <Award className="w-4 h-4" /> Certificates
        </Link>

        {/* Delete Event */}
        <button
          onClick={() => { setShowDeleteModal(true); setDeleteConfirmText(""); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl text-sm font-semibold transition-colors flex-shrink-0"
        >
          <Trash2 className="w-4 h-4" /> Delete Event
        </button>
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
              {/* Header row */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  Authorized Participants
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                    {filteredParticipants.length === participants.length
                      ? `${participants.length} total`
                      : `${filteredParticipants.length} of ${participants.length}`}
                  </span>
                </h3>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" /> Add Member Manually
                </button>
              </div>

              {/* Search & Filter bar */}
              <div className="px-4 py-3 bg-slate-50/70 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-700 flex flex-wrap gap-2 items-center">
                <div className="relative flex-1 min-w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name or roll number…"
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-slate-400" />
                  {branches.length > 0 && (
                    <select
                      value={filterBranch}
                      onChange={e => { setFilterBranch(e.target.value); setFilterSection(""); }}
                      className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    >
                      <option value="">All Branches</option>
                      {branches.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  )}
                  {sections.length > 0 && (
                    <select
                      value={filterSection}
                      onChange={e => setFilterSection(e.target.value)}
                      className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    >
                      <option value="">All Sections</option>
                      {sections.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  )}
                  {(search || filterBranch || filterSection) && (
                    <button
                      onClick={() => { setSearch(""); setFilterBranch(""); setFilterSection(""); }}
                      className="px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors border border-red-200 dark:border-red-800"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50">
                      <th className="p-3 border-b dark:border-slate-700 text-xs font-semibold text-slate-500 uppercase">#</th>
                      <th className="p-3 border-b dark:border-slate-700 text-xs font-semibold text-slate-500 uppercase">Roll Number</th>
                      <th className="p-3 border-b dark:border-slate-700 text-xs font-semibold text-slate-500 uppercase">Name</th>
                      <th className="p-3 border-b dark:border-slate-700 text-xs font-semibold text-slate-500 uppercase">Branch</th>
                      <th className="p-3 border-b dark:border-slate-700 text-xs font-semibold text-slate-500 uppercase">Section</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {filteredParticipants.map((p, i) => (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                        <td className="p-3 text-slate-400 text-xs w-10">{i + 1}</td>
                        <td className="p-3 font-mono font-medium text-slate-900 dark:text-white">{p.rollNumber}</td>
                        <td className="p-3 text-slate-700 dark:text-slate-300">{p.name}</td>
                        <td className="p-3">
                          {p.branch ? (
                            <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded text-xs font-medium">{p.branch}</span>
                          ) : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="p-3">
                          {p.section ? (
                            <span className="px-2 py-0.5 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded text-xs font-medium">{p.section}</span>
                          ) : <span className="text-slate-400">—</span>}
                        </td>
                      </tr>
                    ))}
                    {filteredParticipants.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-10 text-center text-slate-500">
                          {participants.length === 0 ? 'No participants registered yet.' : 'No participants match your search.'}
                        </td>
                      </tr>
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
              <button onClick={closeAddModal} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Inline success banner */}
            {modalSuccess && (
              <div className="mx-5 mt-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-xl flex items-center gap-2 text-green-700 dark:text-green-300 text-sm font-medium">
                {modalSuccess}
                <button onClick={() => setModalSuccess("")} className="ml-auto text-green-500 hover:text-green-700"><X className="w-4 h-4" /></button>
              </div>
            )}

            {/* Inline error banner */}
            {modalError && (
              <div className="mx-5 mt-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl flex items-center gap-2 text-red-700 dark:text-red-300 text-sm">
                {modalError}
                <button onClick={() => setModalError("")} className="ml-auto text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
              </div>
            )}
            
            <form onSubmit={handleAddParticipant} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Roll Number <span className="text-red-500">*</span></label>
                <input 
                  type="text" required
                  value={newParticipant.rollNumber}
                  onChange={e => { setNewParticipant({...newParticipant, rollNumber: e.target.value}); setModalError(""); setModalSuccess(""); }}
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

              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={closeAddModal} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
                  Done
                </button>
                <button type="submit" disabled={addingParticipant || !newParticipant.rollNumber || !newParticipant.name} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-70 flex items-center gap-2">
                  {addingParticipant ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Participant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ─────────────────── */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Delete Event?</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  This will permanently delete <strong>&ldquo;{event?.name}&rdquo;</strong> along with all attendance records and participant assignments. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="px-6 pb-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Type <span className="font-mono font-bold text-red-600 dark:text-red-400">{event?.name}</span> to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={e => setDeleteConfirmText(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                  placeholder="Type event name to confirm..."
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deletingEvent}
                  className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteEvent}
                  disabled={deletingEvent || deleteConfirmText !== event?.name}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                  {deletingEvent ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</> : <><Trash2 className="w-4 h-4" /> Delete Permanently</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
