"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, ArrowLeft, Camera, CameraOff } from "lucide-react";
import type { Html5Qrcode } from "html5-qrcode";
import Link from "next/link";

interface EventData {
  id: string;
  name: string;
  status: string;
  eventId: string;
}

interface ScanParticipant {
  name: string;
  rollNumber: string;
  branch?: string;
  section?: string;
}

interface ScanResult {
  status: string;
  message?: string;
  error?: string;
  participant?: ScanParticipant;
}

const RESULT_DISPLAY_MS = 3000; // auto-clear result after 3 seconds
const DEBOUNCE_MS = 2500;       // ignore re-scans of same QR within 2.5s

export default function QRScanner() {
  const params = useParams();
  const [event, setEvent] = useState<EventData | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const resultTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastScannedRef = useRef<string>("");
  const lastScannedTimeRef = useRef<number>(0);

  useEffect(() => {
    fetch(`/api/admin/events/${params.eventId}`)
      .then(res => res.json())
      .then(data => { if (data.event) setEvent(data.event); });
  }, [params.eventId]);

  const showResult = useCallback((result: ScanResult) => {
    setScanResult(result);
    if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    resultTimerRef.current = setTimeout(() => setScanResult(null), RESULT_DISPLAY_MS);
  }, []);

  const processScan = useCallback(async (decodedText: string) => {
    const now = Date.now();
    // Debounce: skip if same QR scanned too recently
    if (decodedText === lastScannedRef.current && now - lastScannedTimeRef.current < DEBOUNCE_MS) return;
    if (processing) return;

    lastScannedRef.current = decodedText;
    lastScannedTimeRef.current = now;
    setProcessing(true);

    try {
      const res = await fetch('/api/employee/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: params.eventId, scannedData: decodedText })
      });
      const data = await res.json();
      showResult(data);
    } catch (err: unknown) {
      showResult({ status: 'ERROR', error: err instanceof Error ? err.message : 'Scan failed' });
    } finally {
      setProcessing(false);
    }
  }, [params.eventId, processing, showResult]);

  const stopCamera = useCallback(async () => {
    if (html5QrcodeRef.current) {
      try {
        await html5QrcodeRef.current.stop();
        html5QrcodeRef.current.clear();
      } catch { /* ignore */ }
      html5QrcodeRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    const { Html5Qrcode } = await import("html5-qrcode");
    const html5Qrcode = new Html5Qrcode("qr-reader");
    html5QrcodeRef.current = html5Qrcode;

    try {
      await html5Qrcode.start(
        { facingMode: "environment" },
        { fps: 15, qrbox: { width: 240, height: 240 }, aspectRatio: 1.0 },
        (decodedText) => processScan(decodedText),
        () => { /* scanning, not found yet — ignore */ }
      );
      setCameraActive(true);
    } catch (err: unknown) {
      html5QrcodeRef.current = null;
      const e = err instanceof Error ? err : new Error(String(err));
      if (e.name === "NotAllowedError" || e.message.includes("permission")) {
        setCameraError("Camera permission denied. Please allow camera access in your browser settings.");
      } else if (e.message.includes("No cameras found") || e.message.includes("NotFoundError")) {
        setCameraError("No camera found on this device.");
      } else {
        setCameraError(`Could not start camera: ${e.message}`);
      }
    }
  }, [processScan]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    };
  }, [stopCamera]);

  if (!event) return (
    <div className="flex items-center justify-center h-48">
      <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
    </div>
  );

  return (
    <div className="max-w-md mx-auto animate-fade-in">
      <Link href="/employee/dashboard" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 text-center border-b border-slate-800">
          <h2 className="font-bold truncate">{event.name}</h2>
          <p className="text-xs text-slate-400 mt-1 flex items-center justify-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${event.status === 'ACTIVE' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            {event.status}
            {processing && <span className="ml-2 text-blue-400 flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> Processing...</span>}
          </p>
        </div>

        {/* Camera viewport */}
        <div className="relative bg-black" style={{ minHeight: 300 }}>

          {/* QR reader — always in DOM, visible only when active */}
          <div
            id="qr-reader"
            className="w-full absolute inset-0"
            style={{ opacity: cameraActive ? 1 : 0, zIndex: cameraActive ? 10 : -1, pointerEvents: cameraActive ? 'auto' : 'none' }}
          />

          {/* Idle / start screen */}
          {!cameraActive && (
            <div className="flex flex-col items-center gap-4 p-8 text-white text-center" style={{ minHeight: 300, justifyContent: 'center' }}>
              <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
                <Camera className="w-10 h-10 text-white" />
              </div>
              <div>
                <p className="font-semibold text-lg">Ready to Scan</p>
                <p className="text-sm text-slate-400 mt-1">Tap below to start the camera</p>
              </div>
              {cameraError && (
                <div className="bg-red-900/50 border border-red-700 text-red-200 text-sm rounded-xl p-3 max-w-xs">
                  {cameraError}
                </div>
              )}
              <button
                onClick={startCamera}
                className="mt-2 flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-all shadow-lg"
              >
                <Camera className="w-5 h-5" /> Start Camera
              </button>
            </div>
          )}
        </div>

        {/* Result banner — below camera, auto-dismisses */}
        <div className={`transition-all duration-300 overflow-hidden ${scanResult ? 'max-h-40' : 'max-h-0'}`}>
          {scanResult && (
            <div className={`p-4 flex items-start gap-3 ${
              scanResult.status === 'SUCCESS' ? 'bg-green-600 text-white' :
              scanResult.status === 'DUPLICATE' ? 'bg-yellow-500 text-white' :
              'bg-red-600 text-white'
            }`}>
              {scanResult.status === 'SUCCESS' && <CheckCircle2 className="w-6 h-6 flex-shrink-0 mt-0.5" />}
              {scanResult.status === 'DUPLICATE' && <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />}
              {!['SUCCESS', 'DUPLICATE'].includes(scanResult.status) && <XCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />}

              <div className="min-w-0">
                <p className="font-bold text-sm">
                  {scanResult.status === 'SUCCESS' ? 'Attendance Marked!' :
                   scanResult.status === 'DUPLICATE' ? 'Already Marked' : 'Not Registered'}
                </p>
                {scanResult.participant ? (
                  <p className="text-sm opacity-90 truncate">{scanResult.participant.name} &bull; {scanResult.participant.rollNumber}</p>
                ) : (
                  <p className="text-xs opacity-80">{scanResult.error || scanResult.message}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Stop camera button */}
        {cameraActive && (
          <div className="bg-slate-900 p-3 flex justify-center">
            <button
              onClick={stopCamera}
              className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg text-sm font-medium transition-colors border border-red-800"
            >
              <CameraOff className="w-4 h-4" /> Stop Camera
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
