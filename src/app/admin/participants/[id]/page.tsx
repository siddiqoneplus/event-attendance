"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  BookOpen,
  Calendar,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Percent,
  Activity,
  Hash,
} from "lucide-react";

interface EventRecord {
  id: string;
  eventId: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  venue: string | null;
  status: string;
  attended: boolean;
  attendanceTime: string | null;
}

interface ParticipantProfile {
  id: string;
  rollNumber: string;
  name: string;
  branch: string | null;
  section: string | null;
  admissionYear: number | null;
  academicYear: string | null;
  createdAt: string;
  totalEvents: number;
  totalAttended: number;
  attendanceRate: number;
  events: EventRecord[];
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:    "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  UPCOMING:  "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  COMPLETED: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400",
  DRAFT:     "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
};

export default function ParticipantProfilePage() {
  const params = useParams();
  const id = params.id as string;

  const [profile, setProfile] = useState<ParticipantProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/participants/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setProfile(data.participant);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load participant");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const tid = setTimeout(() => fetchProfile(), 0);
    return () => clearTimeout(tid);
  }, [fetchProfile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="text-center py-20 text-slate-500 dark:text-slate-400">
        <User className="w-12 h-12 mx-auto mb-4 opacity-20" />
        <p>{error || "Participant not found"}</p>
        <Link href="/admin/events" className="mt-4 inline-block text-blue-500 hover:underline text-sm">
          ← Back to Events
        </Link>
      </div>
    );
  }

  const attended = profile.events.filter(e => e.attended);
  const absent   = profile.events.filter(e => !e.attended);

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      {/* Back nav */}
      <div>
        <button onClick={() => history.back()} className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Profile Hero */}
        <div className="glass-panel rounded-2xl p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold shrink-0 shadow-lg">
            {profile.name.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{profile.name}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <span className="inline-flex items-center gap-1.5 text-sm font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                <Hash className="w-3.5 h-3.5" />{profile.rollNumber}
              </span>
              {profile.branch && (
                <span className="text-xs font-semibold px-2.5 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 rounded-full">
                  {profile.branch}
                </span>
              )}
              {profile.section && (
                <span className="text-xs font-semibold px-2.5 py-1 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 rounded-full">
                  Section {profile.section}
                </span>
              )}
              {profile.academicYear && (
                <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" />{profile.academicYear}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Registered on {new Date(profile.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Events Registered", value: profile.totalEvents, icon: Calendar, color: "from-blue-500 to-blue-600" },
          { label: "Events Attended", value: profile.totalAttended, icon: CheckCircle2, color: "from-green-500 to-green-600" },
          { label: "Events Missed", value: profile.totalEvents - profile.totalAttended, icon: XCircle, color: "from-red-500 to-red-600" },
          { label: "Attendance Rate", value: `${profile.attendanceRate}%`, icon: Percent, color: "from-purple-500 to-purple-600" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="glass-panel p-5 rounded-2xl flex flex-col gap-3">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${s.color} flex items-center justify-center shadow-md`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{s.label}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">{s.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Attendance Rate Bar */}
      {profile.totalEvents > 0 && (
        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500" />
              Attendance Progress
            </span>
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              {profile.totalAttended} / {profile.totalEvents}
            </span>
          </div>
          <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${profile.attendanceRate}%`,
                background: profile.attendanceRate >= 75
                  ? "linear-gradient(to right, #22c55e, #16a34a)"
                  : profile.attendanceRate >= 50
                  ? "linear-gradient(to right, #f59e0b, #d97706)"
                  : "linear-gradient(to right, #ef4444, #dc2626)",
              }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-xs text-slate-400">
            <span>0%</span>
            <span className={profile.attendanceRate >= 75 ? "text-green-500 font-semibold" : profile.attendanceRate >= 50 ? "text-amber-500 font-semibold" : "text-red-500 font-semibold"}>
              {profile.attendanceRate}%
            </span>
            <span>100%</span>
          </div>
        </div>
      )}

      {/* Attended Events */}
      {attended.length > 0 && (
        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-700 bg-green-50/60 dark:bg-green-900/10">
            <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Attended ({attended.length})
            </h2>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {attended.map((ev) => (
              <EventRow key={ev.id} event={ev} attended />
            ))}
          </div>
        </div>
      )}

      {/* Absent Events */}
      {absent.length > 0 && (
        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-700 bg-red-50/60 dark:bg-red-900/10">
            <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
              <XCircle className="w-4 h-4 text-red-400" />
              Not Attended ({absent.length})
            </h2>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {absent.map((ev) => (
              <EventRow key={ev.id} event={ev} attended={false} />
            ))}
          </div>
        </div>
      )}

      {profile.totalEvents === 0 && (
        <div className="glass-panel rounded-2xl p-12 text-center text-slate-400">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>This participant is not registered for any events yet.</p>
        </div>
      )}
    </div>
  );
}

function EventRow({ event, attended }: { event: EventRecord; attended: boolean }) {
  return (
    <Link
      href={`/admin/events/${event.id}`}
      className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group"
    >
      {/* Attended indicator */}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${attended ? "bg-green-100 dark:bg-green-900/40" : "bg-slate-100 dark:bg-slate-800"}`}>
        {attended
          ? <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
          : <XCircle className="w-4 h-4 text-slate-400" />
        }
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
            {event.name}
          </p>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[event.status] ?? STATUS_COLORS.DRAFT}`}>
            {event.status}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{event.date}</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{event.startTime} – {event.endTime}</span>
          {event.venue && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{event.venue}</span>}
        </div>
      </div>

      <div className="shrink-0 text-right">
        {attended && event.attendanceTime ? (
          <div className="text-right">
            <p className="text-xs font-semibold text-green-600 dark:text-green-400">Scanned in</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {new Date(event.attendanceTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        ) : (
          <p className="text-xs text-slate-400">Absent</p>
        )}
      </div>
    </Link>
  );
}
