"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function QRScanner() {
  const params = useParams();
  const router = useRouter();
  const [event, setEvent] = useState<any>(null);
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanning, setScanning] = useState(true);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetch(`/api/admin/events/${params.eventId}`)
      .then(res => res.json())
      .then(data => {
        if (data.event) setEvent(data.event);
      });
  }, [params.eventId]);

  const resumeScanning = () => {
    setScanResult(null);
    setScanning(true);
  };

  async function processScan(decodedText: string) {
    try {
      const res = await fetch('/api/employee/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: params.eventId,
          scannedData: decodedText
        })
      });

      const data = await res.json();
      setScanResult(data);

      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = setTimeout(() => {
        resumeScanning();
      }, 3000);

    } catch (err: any) {
      setScanResult({ status: 'ERROR', error: err.message });
      setTimeout(resumeScanning, 3000);
    }
  }

  useEffect(() => {
    if (!scanning) return;

    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
      },
      false
    );

    scannerRef.current = scanner;

    scanner.render(
      async (decodedText) => {
        scanner.pause(true);
        setScanning(false);
        await processScan(decodedText);
      },
      (error) => {
        // ignore errors
      }
    );

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(e => console.error(e));
      }
    };
  }, [scanning, params.eventId]);

  if (!event) return <div className="text-center p-8">Loading event...</div>;

  return (
    <div className="max-w-md mx-auto animate-fade-in">
      <Link href="/employee/dashboard" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl">
        <div className="bg-slate-900 text-white p-4 text-center border-b border-slate-800">
          <h2 className="font-bold truncate">{event.name}</h2>
          <p className="text-xs text-slate-400 mt-1 flex items-center justify-center gap-1">
            <span className={`w-2 h-2 rounded-full ${event.status === 'ACTIVE' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
            {event.status}
          </p>
        </div>

        <div className="p-0 bg-black relative">
          {scanning ? (
            <div id="qr-reader" className="w-full border-none"></div>
          ) : (
            <div className="w-full aspect-square flex items-center justify-center bg-slate-900">
              <RefreshCw className="w-8 h-8 text-slate-600 animate-spin" />
            </div>
          )}

          {/* Overlay Status */}
          {scanResult && (
            <div className={`absolute inset-0 flex flex-col items-center justify-center p-6 text-center backdrop-blur-md bg-opacity-90 ${
              scanResult.status === 'SUCCESS' ? 'bg-green-900/90 text-green-50' : 
              scanResult.status === 'DUPLICATE' ? 'bg-yellow-900/90 text-yellow-50' : 
              'bg-red-900/90 text-red-50'
            } animate-fade-in z-50`}>
              {scanResult.status === 'SUCCESS' && <CheckCircle2 className="w-16 h-16 mb-4 text-green-400" />}
              {scanResult.status === 'DUPLICATE' && <AlertCircle className="w-16 h-16 mb-4 text-yellow-400" />}
              {['INVALID', 'NOT_REGISTERED', 'EVENT_CLOSED', 'ERROR'].includes(scanResult.status) && <XCircle className="w-16 h-16 mb-4 text-red-400" />}
              
              <h3 className="text-2xl font-bold mb-2">
                {scanResult.status === 'SUCCESS' ? 'Attendance Marked!' : 
                 scanResult.status === 'DUPLICATE' ? 'Already Marked' : 'Scan Rejected'}
              </h3>
              <p className="text-sm opacity-90 mb-6">{scanResult.error || scanResult.message}</p>
              
              {scanResult.participant && (
                <div className="w-full bg-black/30 rounded-xl p-4 text-left">
                  <p className="font-bold text-lg">{scanResult.participant.name}</p>
                  <p className="text-sm opacity-80">{scanResult.participant.rollNumber}</p>
                  <div className="flex gap-2 mt-2 text-xs opacity-70">
                    {scanResult.participant.branch && <span>{scanResult.participant.branch}</span>}
                    {scanResult.participant.section && <span>• Sec {scanResult.participant.section}</span>}
                  </div>
                </div>
              )}

              <button 
                onClick={resumeScanning}
                className="mt-8 px-6 py-2 bg-white/20 hover:bg-white/30 rounded-full text-sm font-medium transition-colors"
              >
                Scan Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
