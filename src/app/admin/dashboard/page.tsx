"use client";

import { useEffect, useState } from "react";
import { Users, CalendarCheck, CalendarDays, Activity, Percent } from "lucide-react";
import Link from "next/link";

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(res => res.json())
      .then(data => setStats(data));
  }, []);

  const statCards = [
    { title: "Total Events", value: stats?.totalEvents ?? "-", icon: CalendarDays, color: "from-blue-500 to-blue-600" },
    { title: "Active Events", value: stats?.activeEvents ?? "-", icon: Activity, color: "from-green-500 to-green-600" },
    { title: "Total Participants", value: stats?.totalParticipants ?? "-", icon: Users, color: "from-purple-500 to-purple-600" },
    { title: "Today's Attendance", value: stats?.todaysAttendance ?? "-", icon: CalendarCheck, color: "from-orange-500 to-orange-600" },
    { title: "Attendance Rate", value: `${stats?.attendancePercentage ?? 0}%`, icon: Percent, color: "from-pink-500 to-pink-600" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard Overview</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Welcome back. Here's what's happening today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="glass-panel p-5 rounded-2xl flex flex-col gap-4">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${card.color} flex items-center justify-center shadow-lg`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{card.title}</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{card.value}</h3>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Recent Events</h2>
          <Link href="/admin/events" className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline">
            View All
          </Link>
        </div>
        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="p-8 text-center text-slate-500 dark:text-slate-400">
            <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No recent events found. Create one to get started.</p>
            <Link href="/admin/events/create" className="inline-block mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
              Create Event
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
