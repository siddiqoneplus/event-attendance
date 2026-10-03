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

export default function QRScanner() {
  const params = useParams();
  const [event, setEvent] = useState<EventData | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetch(`/api/admin/events/${params.eventId}`)
      .then(res => res.json())
      .then(data => {
        if (data.event) setEvent(data.event);
      });
  }, [params.eventId]);

  const stopCamera = useCallback(async () => {
    if (html5QrcodeRef.current) {
      try {
        await html5QrcodeRef.current.stop();
        html5QrcodeRef.current.clear();
      } catch {
        // ignore
      }
      html5QrcodeRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const processScan = useCallback(async (decodedText: string) => {
    if (processing) return;
    setProcessing(true);

    // Stop camera while processing
    await stopCamera();

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
    } catch (err: unknown) {
      setScanResult({ status: 'ERROR', error: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setProcessing(false);
    }
  }, [params.eventId, processing, stopCamera]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setScanResult(null);

    // Dynamically import html5-qrcode to avoid SSR issues
    const { Html5Qrcode } = await import("html5-qrcode");

    const html5Qrcode = new Html5Qrcode("qr-reader");
    html5QrcodeRef.current = html5Qrcode;

    try {
      await html5Qrcode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          processScan(decodedText);
        },
        () => {
          // QR not found yet, ignore
        }
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

  const handleScanNext = useCallback(() => {
    setScanResult(null);
    startCamera();
  }, [startCamera]);

  // Cleanup on unmount
  useEffect(() => {
    const timeoutRef = scanTimeoutRef;
    return () => {
      stopCamera();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
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
          <p className="text-xs text-slate-400 mt-1 flex items-center justify-center gap-1">
            <span className={`w-2 h-2 rounded-full ${event.status === 'ACTIVE' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
            {event.status}
          </p>
        </div>

        {/* Camera / Scanner area */}
        <div className="relative bg-black min-h-[320px] flex items-center justify-center">

          {/* The QR reader element — always visible to DOM for dimension calculation but visually hidden when inactive */}
          <div
            id="qr-reader"
            className="w-full absolute inset-0"
            style={{ opacity: cameraActive ? 1 : 0, zIndex: cameraActive ? 10 : -1, pointerEvents: cameraActive ? 'auto' : 'none' }}
          />

          {/* Idle state: show start button */}
          {!cameraActive && !processing && !scanResult && (
            <div className="flex flex-col items-center gap-4 p-8 text-white text-center">
              <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
                <Camera className="w-10 h-10 text-white" />
              </div>
              <div>
                <p className="font-semibold text-lg">Ready to Scan</p>
                <p className="text-sm text-slate-400 mt-1">Point camera at participant&apos;s QR code</p>
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
                <Camera className="w-5 h-5" />
                Start Camera
              </button>
            </div>
          )}

          {/* Processing spinner */}
          {processing && (
            <div className="flex flex-col items-center gap-3 text-white">
              <RefreshCw className="w-10 h-10 animate-spin text-blue-400" />
              <p className="text-sm text-slate-300">Processing...</p>
            </div>
          )}

          {/* Result Overlay */}
          {scanResult && (
            <div className={`absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-50 ${
              scanResult.status === 'SUCCESS' ? 'bg-green-900/95 text-green-50' :
              scanResult.status === 'DUPLICATE' ? 'bg-yellow-900/95 text-yellow-50' :
              'bg-red-900/95 text-red-50'
            }`}>
              {scanResult.status === 'SUCCESS' && <CheckCircle2 className="w-16 h-16 mb-4 text-green-400" />}
              {scanResult.status === 'DUPLICATE' && <AlertCircle className="w-16 h-16 mb-4 text-yellow-400" />}
              {!['SUCCESS', 'DUPLICATE'].includes(scanResult.status) && <XCircle className="w-16 h-16 mb-4 text-red-400" />}

              <h3 className="text-2xl font-bold mb-2">
                {scanResult.status === 'SUCCESS' ? 'Attendance Marked!' :
                 scanResult.status === 'DUPLICATE' ? 'Already Marked' : 'Scan Rejected'}
              </h3>
              <p className="text-sm opacity-90 mb-4">{scanResult.error || scanResult.message}</p>

              {scanResult.participant && (
                <div className="w-full bg-black/30 rounded-xl p-4 text-left mb-2">
                  <p className="font-bold text-lg">{scanResult.participant.name}</p>
                  <p className="text-sm opacity-80 font-mono">{scanResult.participant.rollNumber}</p>
                  <div className="flex gap-2 mt-1 text-xs opacity-70">
                    {scanResult.participant.branch && <span>{scanResult.participant.branch}</span>}
                    {scanResult.participant.section && <span>• Sec {scanResult.participant.section}</span>}
                  </div>
                </div>
              )}

              <button
                onClick={handleScanNext}
                className="mt-4 px-6 py-2 bg-white/20 hover:bg-white/30 rounded-full text-sm font-medium transition-colors"
              >
                Scan Next
              </button>
            </div>
          )}
        </div>

        {/* Stop camera button */}
        {cameraActive && (
          <div className="bg-slate-900 p-4 flex justify-center">
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
