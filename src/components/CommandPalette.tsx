"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  CalendarDays,
  Users,
  UserCog,
  ArrowRight,
  Loader2,
  X,
  Command,
} from "lucide-react";

interface SearchEvent {
  id: string;
  eventId: string;
  name: string;
  venue: string | null;
  status: string;
  date: string;
}

interface SearchParticipant {
  id: string;
  name: string;
  rollNumber: string;
  branch: string | null;
  section: string | null;
}

interface SearchUser {
  id: string;
  name: string;
  username: string;
  role: string;
  status: string;
}

interface SearchResults {
  events: SearchEvent[];
  participants: SearchParticipant[];
  users: SearchUser[];
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  UPCOMING: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  COMPLETED: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  DRAFT: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
};

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Extracted open action — resets transient state then opens, avoiding
  // synchronous setState calls inside a useEffect body.
  const openPalette = useCallback(() => {
    setQuery("");
    setResults(null);
    setSelectedIndex(0);
    setOpen(true);
    // Focus after paint so the input is mounted
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  // Open / close with Ctrl+K or Cmd+K
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => {
          if (!prev) openPalette();
          else setOpen(false);
          return prev; // actual toggle handled inside
        });
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openPalette]);

  // Debounced search — all setState calls happen inside async callbacks,
  // never synchronously in the effect body.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    debounceRef.current = setTimeout(async () => {
      if (!trimmed) {
        setResults(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        setResults(data);
        setSelectedIndex(0);
      } catch {
        // silent fail
      } finally {
        setLoading(false);
      }
    }, trimmed ? 250 : 0);
  }, [query]);

  // Flatten results for keyboard navigation
  const flatItems = useCallback(() => {
    if (!results) return [];
    const items: { type: "event" | "participant" | "user"; data: SearchEvent | SearchParticipant | SearchUser }[] = [
      ...results.events.map((d) => ({ type: "event" as const, data: d })),
      ...results.participants.map((d) => ({ type: "participant" as const, data: d })),
      ...results.users.map((d) => ({ type: "user" as const, data: d })),
    ];
    return items;
  }, [results]);

  const navigateTo = useCallback(
    (type: string, data: SearchEvent | SearchParticipant | SearchUser) => {
      setOpen(false);
      if (type === "event") router.push(`/admin/events/${(data as SearchEvent).id}`);
      else if (type === "user") router.push(`/admin/users`);
      else router.push(`/admin/events`);
    },
    [router]
  );

  // Arrow key + Enter navigation
  useEffect(() => {
    if (!open) return;
    const items = flatItems();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, items.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && items[selectedIndex]) {
        const { type, data } = items[selectedIndex];
        navigateTo(type, data);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, flatItems, selectedIndex, navigateTo]);

  const totalResults = results
    ? results.events.length + results.participants.length + results.users.length
    : 0;

  let itemIndex = 0;

  if (!open) {
    return (
      <button
        id="global-search-btn"
        onClick={openPalette}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 text-sm transition-colors border border-slate-200 dark:border-slate-600"
        title="Global Search (Ctrl+K)"
      >
        <Search className="w-3.5 h-3.5" />
        <span className="hidden sm:inline text-xs">Search...</span>
        <kbd className="hidden sm:flex items-center gap-0.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded px-1 py-0.5 font-mono shadow-sm">
          <Command className="w-2.5 h-2.5" />K
        </kbd>
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={() => setOpen(false)}
      />

      {/* Palette */}
      <div
        id="command-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Global search"
        className="fixed top-[15vh] left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4"
        style={{ animation: "paletteIn 0.18s cubic-bezier(.4,0,.2,1) both" }}
      >
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Input */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-slate-700">
            {loading ? (
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin shrink-0" />
            ) : (
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
            )}
            <input
              ref={inputRef}
              id="command-palette-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search events, participants, users..."
              className="flex-1 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 text-base outline-none"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            )}
            <kbd
              onClick={() => setOpen(false)}
              className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Esc
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto">
            {!query && (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                <Search className="w-10 h-10 opacity-20" />
                <p className="text-sm">Type to search across events, participants &amp; users</p>
              </div>
            )}

            {query && !loading && totalResults === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                <p className="text-sm">No results for <span className="font-semibold text-slate-600 dark:text-slate-300">&ldquo;{query}&rdquo;</span></p>
              </div>
            )}

            {results && results.events.length > 0 && (
              <ResultSection title="Events" icon={<CalendarDays className="w-3.5 h-3.5" />}>
                {results.events.map((event) => {
                  const idx = itemIndex++;
                  return (
                    <ResultRow
                      key={event.id}
                      isSelected={selectedIndex === idx}
                      onClick={() => navigateTo("event", event)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                          <CalendarDays className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{event.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{event.eventId} {event.venue ? `· ${event.venue}` : ""} · {event.date}</p>
                        </div>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[event.status] ?? STATUS_COLORS.DRAFT}`}>
                        {event.status}
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                    </ResultRow>
                  );
                })}
              </ResultSection>
            )}

            {results && results.participants.length > 0 && (
              <ResultSection title="Participants" icon={<Users className="w-3.5 h-3.5" />}>
                {results.participants.map((p) => {
                  const idx = itemIndex++;
                  return (
                    <ResultRow
                      key={p.id}
                      isSelected={selectedIndex === idx}
                      onClick={() => navigateTo("participant", p)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center shrink-0">
                          <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{p.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {p.rollNumber}{p.branch ? ` · ${p.branch}` : ""}{p.section ? ` · ${p.section}` : ""}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                    </ResultRow>
                  );
                })}
              </ResultSection>
            )}

            {results && results.users.length > 0 && (
              <ResultSection title="Users" icon={<UserCog className="w-3.5 h-3.5" />}>
                {results.users.map((u) => {
                  const idx = itemIndex++;
                  return (
                    <ResultRow
                      key={u.id}
                      isSelected={selectedIndex === idx}
                      onClick={() => navigateTo("user", u)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0 text-sm font-bold text-slate-600 dark:text-slate-300">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{u.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">@{u.username} · {u.role}</p>
                        </div>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${u.status === "ACTIVE" ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" : "bg-red-100 text-red-700"}`}>
                        {u.status}
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                    </ResultRow>
                  );
                })}
              </ResultSection>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1"><kbd className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1 font-mono">↑↓</kbd> Navigate</span>
            <span className="flex items-center gap-1"><kbd className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1 font-mono">↵</kbd> Open</span>
            <span className="flex items-center gap-1"><kbd className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1 font-mono">Esc</kbd> Close</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes paletteIn {
          from { opacity: 0; transform: translate(-50%, -12px) scale(0.97); }
          to   { opacity: 1; transform: translate(-50%, 0)      scale(1);    }
        }
      `}</style>
    </>
  );
}

function ResultSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider bg-slate-50/80 dark:bg-slate-800/50">
        {icon}
        {title}
      </div>
      <div className="py-1">{children}</div>
    </div>
  );
}

function ResultRow({
  children,
  isSelected,
  onClick,
  onMouseEnter,
}: {
  children: React.ReactNode;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${
        isSelected
          ? "bg-blue-50 dark:bg-blue-900/20"
          : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
      }`}
    >
      {children}
    </button>
  );
}
