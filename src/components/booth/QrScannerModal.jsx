import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  QrCode, X, Camera, Keyboard, Loader2, ScanLine
} from "lucide-react";
import { parseQrScan } from "@/lib/qrUtils";

/**
 * QR Scanner Modal
 * Supports:
 *   1. Camera scan via jsQR (lazy loaded)
 *   2. Manual token / paste input as fallback
 *
 * Props:
 *   open: boolean
 *   onClose: () => void
 *   onScan: (token: string) => void   — called with the parsed token
 */
export default function QrScannerModal({ open, onClose, onScan }) {
  const [mode, setMode] = useState("camera"); // "camera" | "manual"
  const [manualInput, setManualInput] = useState("");
  const [cameraError, setCameraError] = useState(null);
  const [scanning, setScanning] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const jsQrRef = useRef(null);

  // Start camera when modal opens in camera mode
  useEffect(() => {
    if (!open) return;
    setManualInput("");
    setCameraError(null);
    if (mode === "camera") {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  const loadJsQr = async () => {
    if (jsQrRef.current) return jsQrRef.current;
    try {
      const mod = await import("https://esm.sh/jsqr@1.4.0");
      jsQrRef.current = mod.default;
      return mod.default;
    } catch {
      return null;
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      const jsQR = await loadJsQr();
      if (!jsQR) {
        setCameraError("Tidak dapat memuat library QR scanner. Gunakan input manual.");
        setScanning(false);
        return;
      }
      scanLoop(jsQR);
    } catch (err) {
      setCameraError("Kamera tidak dapat diakses. Gunakan input manual atau pastikan izin kamera diberikan.");
      setScanning(false);
    }
  };

  const scanLoop = (jsQR) => {
    const tick = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || !open) return;

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });
        if (code) {
          const token = parseQrScan(code.data);
          if (token) {
            stopCamera();
            setScanning(false);
            onScan(token);
            return;
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const stopCamera = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const token = parseQrScan(manualInput);
    if (token) {
      onScan(token);
      setManualInput("");
    }
  };

  const handleClose = () => {
    stopCamera();
    setManualInput("");
    setMode("camera");
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" />
            <span className="font-semibold text-base">Scan QR Kupon</span>
          </div>
          <button onClick={handleClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-border">
          <button
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors
              ${mode === "camera" ? "text-primary border-b-2 border-primary bg-primary/5" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setMode("camera")}
          >
            <Camera className="w-4 h-4" /> Kamera
          </button>
          <button
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors
              ${mode === "manual" ? "text-primary border-b-2 border-primary bg-primary/5" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setMode("manual")}
          >
            <Keyboard className="w-4 h-4" /> Manual
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {mode === "camera" ? (
            <div className="space-y-3">
              <div className="relative bg-black rounded-xl overflow-hidden aspect-square w-full flex items-center justify-center">
                <video
                  ref={videoRef}
                  className="absolute inset-0 w-full h-full object-cover"
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />
                {/* Scan overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 relative">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />
                    {scanning && (
                      <div className="absolute inset-x-0 top-0 h-0.5 bg-primary/80 animate-[scan_2s_ease-in-out_infinite]"
                        style={{ animation: "scan 2s ease-in-out infinite" }} />
                    )}
                  </div>
                </div>
                {!scanning && !cameraError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}
              </div>
              {cameraError ? (
                <div className="text-xs text-destructive bg-destructive/10 rounded-lg p-3">{cameraError}</div>
              ) : (
                <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
                  <ScanLine className="w-3.5 h-3.5" />
                  Arahkan kamera ke QR code pada kupon peserta
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Masukkan token QR atau paste hasil scan secara manual:
                </p>
                <Input
                  autoFocus
                  placeholder="Token QR (contoh: QUEUE:abc123... atau tempel hasil scan)"
                  value={manualInput}
                  onChange={e => setManualInput(e.target.value)}
                  className="font-mono text-sm"
                />
                {manualInput && !parseQrScan(manualInput) && (
                  <p className="text-xs text-destructive mt-1">Format token tidak valid.</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={!parseQrScan(manualInput)}>
                <QrCode className="w-4 h-4 mr-2" /> Verifikasi Token
              </Button>
            </form>
          )}
        </div>

        <style>{`
          @keyframes scan {
            0% { top: 0%; }
            50% { top: calc(100% - 2px); }
            100% { top: 0%; }
          }
        `}</style>
      </div>
    </div>
  );
}