"use client";

import { useState, useEffect } from "react";
import { Save, AlertCircle, CheckCircle2 } from "lucide-react";

export default function RollNumberSettings() {
  const [settings, setSettings] = useState({
    pattern: "^\\d{2}[A-Z0-9]+$",
    yearIndexStart: 0,
    yearIndexEnd: 2,
    currentAcademicYear: new Date().getFullYear(),
    maxYears: 4
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(res => res.json())
      .then(data => {
        if (data.settings) {
          setSettings(prev => ({ ...prev, ...data.settings }));
        }
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      });
      if (!res.ok) throw new Error("Failed to save settings");
      setMessage({ type: "success", text: "Settings saved successfully!" });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Roll Number Configuration</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Configure how the system interprets student roll numbers to automatically determine their academic year.</p>
      </div>

      <div className="glass-panel rounded-2xl p-6 sm:p-8">
        {message.text && (
          <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
            <p>{message.text}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Roll Number Regex Pattern</label>
            <input 
              type="text" 
              value={settings.pattern}
              onChange={e => setSettings({...settings, pattern: e.target.value})}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder="^\d{2}[A-Z0-9]+$"
            />
            <p className="text-xs text-slate-500">Regular expression to validate roll numbers before processing.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Year Extract Start Index</label>
              <input 
                type="number" 
                value={settings.yearIndexStart}
                onChange={e => setSettings({...settings, yearIndexStart: parseInt(e.target.value)})}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Year Extract End Index</label>
              <input 
                type="number" 
                value={settings.yearIndexEnd}
                onChange={e => setSettings({...settings, yearIndexEnd: parseInt(e.target.value)})}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <p className="text-xs text-slate-500 -mt-2">For example, if roll number is <code>23A81A0501</code> and admission year is <code>23</code>, start=0, end=2.</p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Current Academic Year</label>
              <input 
                type="number" 
                value={settings.currentAcademicYear}
                onChange={e => setSettings({...settings, currentAcademicYear: parseInt(e.target.value)})}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-500">E.g., 2026. Used to calculate student's current year (1st, 2nd, etc).</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Max Duration (Years)</label>
              <input 
                type="number" 
                value={settings.maxYears}
                onChange={e => setSettings({...settings, maxYears: parseInt(e.target.value)})}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-500">Typically 4 for B.Tech.</p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl mb-6 border border-slate-200 dark:border-slate-700">
              <h4 className="text-sm font-semibold mb-2">Calculation Test</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                A student with roll number <strong>23A81A0501</strong> will have admission year <strong>2023</strong>.<br/>
                Current year is {settings.currentAcademicYear}.<br/>
                Student is in: <strong className="text-blue-600 dark:text-blue-400">{Math.min(settings.maxYears, Math.max(1, settings.currentAcademicYear - 2023))} Year</strong>
              </p>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/30 disabled:opacity-70"
            >
              {loading ? "Saving..." : <><Save className="w-5 h-5" /> Save Configuration</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
