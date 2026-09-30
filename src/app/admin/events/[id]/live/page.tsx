"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, CheckCircle2, XCircle, Activity, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function LiveDashboard() {
  const params = useParams();
  const [data, setData] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isPolling, setIsPolling] = useState(true);

  const fetchLiveStats = async () => {
    try {
      const res = await fetch(`/api/admin/events/${params.id}/live`);
      const json = await res.json();
      if (json.event) {
        setData(json);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLiveStats();
    let interval: NodeJS.Timeout;
    if (isPolling) {
      interval = setInterval(fetchLiveStats, 3000);
    }
    return () => clearInterval(interval);
  }, [params.id, isPolling]);

  if (!data) return <div className="p-8 text-center">Loading live dashboard...</div>;

  const percentage = data.registered > 0 ? Math.round((data.present / data.registered) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link href={`/admin/events/${params.id}`} className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-2 transition-colors text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to Event
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            Live Dashboard 
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Real-time attendance tracking for {data.event.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">Updated: {lastUpdated.toLocaleTimeString()}</span>
          <button 
            onClick={() => setIsPolling(!isPolling)}
            className={`p-2 rounded-lg transition-colors ${isPolling ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}
            title={isPolling ? "Pause updates" : "Resume updates"}
          >
            <RefreshCw className={`w-5 h-5 ${isPolling ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-slate-500">Registered</p>
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600"><Users className="w-5 h-5" /></div>
          </div>
          <h3 className="text-3xl font-bold">{data.registered}</h3>
        </div>
        <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-green-500">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-slate-500">Present</p>
            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-600"><CheckCircle2 className="w-5 h-5" /></div>
          </div>
          <h3 className="text-3xl font-bold text-green-600">{data.present}</h3>
        </div>
        <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-red-500">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-slate-500">Absent</p>
            <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600"><XCircle className="w-5 h-5" /></div>
          </div>
          <h3 className="text-3xl font-bold text-red-600">{data.absent}</h3>
        </div>
        <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-slate-500">Attendance</p>
            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600"><Activity className="w-5 h-5" /></div>
          </div>
          <h3 className="text-3xl font-bold text-purple-600">{percentage}%</h3>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mt-3 overflow-hidden">
            <div className="bg-purple-600 h-1.5 rounded-full transition-all duration-500" style={{ width: `${percentage}%` }}></div>
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50">
          <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-500" /> Recent Scans
          </h3>
        </div>
        <div className="p-0">
          {data.recentScans.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No attendance recorded yet.</div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.recentScans.map((scan: any) => (
                <div key={scan.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors animate-fade-in">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{scan.participant.name}</p>
                      <p className="text-sm text-slate-500">{scan.participant.rollNumber} • {scan.participant.branch} - {scan.participant.section}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      Present
                    </span>
                    <p className="text-xs text-slate-400 mt-1">
                      {formatDistanceToNow(new Date(scan.attendanceTime), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
