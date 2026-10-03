"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface QrEvent { id: string; name: string; }
interface QrParticipant { id: string; rollNumber: string; name: string; branch: string | null; section: string | null; }

export default function QRGenerator() {
  const params = useParams();
  const [event, setEvent] = useState<QrEvent | null>(null);
  const [participants, setParticipants] = useState<QrParticipant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/events/${params.id}`).then(res => res.json()),
      fetch(`/api/admin/events/${params.id}/participants`).then(res => res.json())
    ]).then(([eventData, participantsData]) => {
      if (eventData.event) setEvent(eventData.event);
      if (participantsData.participants) setParticipants(participantsData.participants);
      setLoading(false);
    });
  }, [params.id]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!event) return <div className="p-8 text-center">Event not found</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link href={`/admin/events/${params.id}`} className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-2 transition-colors text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to Event
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Participant QR Codes</h1>
          <p className="text-slate-500 mt-1">Generate and print QR codes for {event.name}</p>
        </div>
        <button 
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Printer className="w-4 h-4" /> Print All
        </button>
      </div>

      <div className="print:hidden p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-lg text-sm">
        <p><strong>Note:</strong> Students can also use their standard college ID cards if they contain a QR/Barcode with their Roll Number.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 print:grid-cols-3 print:gap-4 print:p-0">
        {participants.map((p) => (
          <div key={p.id} className="glass-panel p-6 rounded-xl flex flex-col items-center text-center print:border print:border-black print:shadow-none print:break-inside-avoid">
            <div className="bg-white p-3 rounded-xl mb-4">
              <QRCodeSVG 
                value={p.rollNumber} 
                size={150}
                level="H"
                includeMargin={true}
              />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">{p.name}</h3>
            <p className="text-slate-500 dark:text-slate-400 font-mono mt-1">{p.rollNumber}</p>
            <div className="text-xs text-slate-400 mt-2">
              {p.branch} {p.section ? `- Sec ${p.section}` : ''}
            </div>
          </div>
        ))}

        {participants.length === 0 && (
          <div className="col-span-full p-12 text-center text-slate-500 glass-panel rounded-2xl print:hidden">
            No participants found. Please add participants to the event first.
          </div>
        )}
      </div>
      
      {/* Print-only styles injected via Tailwind but just to be safe */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { background: white; color: black; }
          .glass-panel { background: white; border: 1px solid #ccc; box-shadow: none; }
          .dark .glass-panel { background: white; color: black; border-color: black; }
          .dark .text-white { color: black !important; }
          .dark .text-slate-400 { color: #666 !important; }
          .print\\:hidden { display: none !important; }
          nav, header, aside { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; overflow: visible !important; height: auto !important; }
        }
      `}} />
    </div>
  );
}
