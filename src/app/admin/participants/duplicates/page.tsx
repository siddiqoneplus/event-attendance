"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  GitMerge,
  Crown,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";

interface Participant {
  id: string;
  rollNumber: string;
  name: string;
  branch: string | null;
  section: string | null;
  createdAt: string;
  _count: { events: number; attendance: number };
}

interface DuplicateGroup {
  key: string;
  reason: string;
  participants: Participant[];
}

export default function DuplicatesPage() {
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Per-group state: which participant is the master, expanded state, merge status
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [masters, setMasters] = useState<Record<number, string>>({});
  const [merging, setMerging] = useState<Record<number, boolean>>({});
  const [merged, setMerged] = useState<Record<number, string>>({});

  const fetchDuplicates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/participants/duplicates");
      const data = await res.json();
      setGroups(data.groups ?? []);
      setTotalParticipants(data.totalParticipants ?? 0);

      // Default master = participant with the most events (most data)
      const initialMasters: Record<number, string> = {};
      (data.groups ?? []).forEach((g: DuplicateGroup, i: number) => {
        const best = [...g.participants].sort(
          (a, b) => b._count.events - a._count.events
        )[0];
        initialMasters[i] = best.id;
      });
      setMasters(initialMasters);
      setExpanded({});
      setMerged({});
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Defer so setState calls inside fetchDuplicates don't happen
    // synchronously in the effect body (React purity rule).
    const id = setTimeout(() => fetchDuplicates(), 0);
    return () => clearTimeout(id);
  }, [fetchDuplicates]);

  const handleMerge = async (groupIdx: number, group: DuplicateGroup) => {
    const masterId = masters[groupIdx];
    if (!masterId) return;
    const duplicateIds = group.participants
      .filter((p) => p.id !== masterId)
      .map((p) => p.id);

    setMerging((prev) => ({ ...prev, [groupIdx]: true }));
    try {
      const res = await fetch("/api/admin/participants/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ masterId, duplicateIds }),
      });
      const data = await res.json();
      if (res.ok) {
        setMerged((prev) => ({
          ...prev,
          [groupIdx]: `✓ Merged into "${data.master.name}" (${data.master.rollNumber}). Transferred ${data.eventsTransferred} event(s), ${data.attendanceTransferred} attendance record(s).`,
        }));
        // Remove group from list
        setGroups((prev) => prev.filter((_, i) => i !== groupIdx));
      } else {
        setMerged((prev) => ({
          ...prev,
          [groupIdx]: `Error: ${data.error}`,
        }));
      }
    } catch {
      setMerged((prev) => ({
        ...prev,
        [groupIdx]: "Network error. Please try again.",
      }));
    } finally {
      setMerging((prev) => ({ ...prev, [groupIdx]: false }));
    }
  };

  const filteredGroups = groups.filter((g) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return g.participants.some(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.rollNumber.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <GitMerge className="w-6 h-6 text-purple-500" />
            Duplicate Participants
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Detected from {totalParticipants} total participants across all events
          </p>
        </div>
        <button
          id="refresh-duplicates-btn"
          onClick={fetchDuplicates}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Stats banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-4 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
            <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Total Participants</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{totalParticipants}</p>
          </div>
        </div>
        <div className="glass-panel p-4 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Duplicate Groups</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{groups.length}</p>
          </div>
        </div>
        <div className="glass-panel p-4 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Redundant Records</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">
              {groups.reduce((acc, g) => acc + g.participants.length - 1, 0)}
            </p>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        </div>
      )}

      {!loading && groups.length === 0 && (
        <div className="glass-panel rounded-2xl p-16 text-center">
          <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4 opacity-80" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">No duplicates found!</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            All {totalParticipants} participants appear to be unique.
          </p>
        </div>
      )}

      {!loading && groups.length > 0 && (
        <>
          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by name or roll number..."
              className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="space-y-4">
            {filteredGroups.map((group) => {
              // Find original index to use as key for state maps
              const origIdx = groups.indexOf(group);
              const isExpanded = expanded[origIdx] ?? true;
              const masterId = masters[origIdx];
              const isMerging = merging[origIdx] ?? false;
              const mergeMsg = merged[origIdx];

              return (
                <div
                  key={origIdx}
                  className="glass-panel rounded-2xl overflow-hidden border border-orange-200/50 dark:border-orange-800/30"
                >
                  {/* Group header */}
                  <div className="flex items-center justify-between px-5 py-4 bg-orange-50/60 dark:bg-orange-900/10 border-b border-orange-200/50 dark:border-orange-800/30">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white text-sm">
                          {group.participants.length} records &mdash;{" "}
                          <span className="text-orange-600 dark:text-orange-400">
                            {group.reason}
                          </span>
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          &ldquo;{group.participants[0].name}&rdquo;
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        setExpanded((prev) => ({ ...prev, [origIdx]: !isExpanded }))
                      }
                      className="p-1.5 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-lg transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      )}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="p-5 space-y-4">
                      {/* Merge result message */}
                      {mergeMsg && (
                        <div
                          className={`p-3 rounded-xl text-sm font-medium ${
                            mergeMsg.startsWith("✓")
                              ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                              : "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                          }`}
                        >
                          {mergeMsg}
                        </div>
                      )}

                      {/* Participant cards */}
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">
                        Select the record to keep as master
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {group.participants.map((p) => {
                          const isMaster = masterId === p.id;
                          return (
                            <button
                              key={p.id}
                              onClick={() =>
                                setMasters((prev) => ({ ...prev, [origIdx]: p.id }))
                              }
                              className={`text-left p-4 rounded-xl border-2 transition-all ${
                                isMaster
                                  ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-3">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                                    isMaster
                                      ? "bg-purple-500 text-white"
                                      : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                                  }`}
                                >
                                  {isMaster ? (
                                    <Crown className="w-4 h-4" />
                                  ) : (
                                    p.name.charAt(0).toUpperCase()
                                  )}
                                </div>
                                {isMaster && (
                                  <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/40 px-2 py-0.5 rounded-full">
                                    MASTER
                                  </span>
                                )}
                                {!isMaster && (
                                  <span className="text-xs font-semibold text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <Trash2 className="w-3 h-3" />
                                    Will delete
                                  </span>
                                )}
                              </div>
                              <p className="font-semibold text-slate-900 dark:text-white text-sm leading-tight">
                                {p.name}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1">
                                {p.rollNumber}
                              </p>
                              {(p.branch || p.section) && (
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                                  {[p.branch, p.section].filter(Boolean).join(" · ")}
                                </p>
                              )}
                              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                  {p._count.events} event{p._count.events !== 1 ? "s" : ""}
                                </span>
                                <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                                  {p._count.attendance} attendance
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Info note */}
                      <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-xs text-blue-700 dark:text-blue-300">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>
                          All event registrations and attendance records from the{" "}
                          <strong>
                            {group.participants.length - 1} duplicate
                            {group.participants.length - 1 !== 1 ? "s" : ""}
                          </strong>{" "}
                          will be transferred to the master record. Duplicate records will be
                          permanently deleted.
                        </span>
                      </div>

                      {/* Merge button */}
                      <div className="flex justify-end">
                        <button
                          id={`merge-group-${origIdx}-btn`}
                          onClick={() => handleMerge(origIdx, group)}
                          disabled={isMerging || !masterId}
                          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-purple-500/20 disabled:opacity-60"
                        >
                          {isMerging ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <GitMerge className="w-4 h-4" />
                          )}
                          {isMerging ? "Merging..." : "Merge into Master"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
