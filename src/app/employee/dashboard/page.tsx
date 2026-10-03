"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, MapPin, QrCode } from "lucide-react";

interface ActiveEvent {
  id: string; eventId: string; name: string; date: string;
  startTime: string; endTime: string; venue: string | null; status: string;
}

export default function EmployeeDashboard() {
  const [events, setEvents] = useState<ActiveEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/events')
      .then(res => res.json())
      .then(data => {
        // Filter to only ACTIVE events for employees
        const activeEvents = (data.events || []).filter((e: ActiveEvent) => e.status === 'ACTIVE');
        setEvents(activeEvents);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Active Events</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Select an event to start scanning attendance</p>
      </div>

      {loading ? (
        <div className="text-center p-12 text-slate-500">Loading events...</div>
      ) : events.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl">
          <Calendar className="w-12 h-12 mx-auto text-slate-400 mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No Active Events</h3>
          <p className="text-slate-500">There are currently no active events available for scanning.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.map((event) => (
            <div key={event.id} className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
              <div>
                <span className="inline-block px-2.5 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-bold rounded-md mb-3 border border-green-200 dark:border-green-800">
                  {event.eventId}
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{event.name}</h3>
                <div className="space-y-2 mt-4 text-sm text-slate-600 dark:text-slate-400">
                  <p className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {event.date} ({event.startTime} - {event.endTime})</p>
                  <p className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {event.venue || 'TBA'}</p>
                </div>
              </div>
              <Link 
                href={`/employee/scan/${event.id}`}
                className="mt-6 flex justify-center items-center gap-2 w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/30"
              >
                <QrCode className="w-5 h-5" />
                Start Scanning
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
