"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface QrScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: any) => void;
}

export default function QrScanner({ onScanSuccess, onScanFailure }: QrScannerProps) {
  const scannerRef = useRef<HTMLDivElement>(null);
  const [hasCameras, setHasCameras] = useState<boolean | null>(null);

  useEffect(() => {
    const html5QrCode = new Html5Qrcode("reader");
    let isMounted = true;
    let isScanProcessed = false;
    let isStarting = true;

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (!isMounted) return;
        if (devices && devices.length > 0) {
          setHasCameras(true);
          html5QrCode.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText) => {
              if (!isScanProcessed && isMounted) {
                isScanProcessed = true;
                // Pause instead of stop to avoid AbortError
                if (html5QrCode.getState() === 2) { // 2 = SCANNING
                    html5QrCode.pause(true);
                }
                onScanSuccess(decodedText);
              }
            },
            (errorMessage) => {
              if (onScanFailure && isMounted) onScanFailure(errorMessage);
            }
          ).then(() => {
              isStarting = false;
              if (!isMounted) {
                  html5QrCode.stop().catch(() => {});
              }
          }).catch((err) => {
              isStarting = false;
              console.error("Failed to start scanner", err);
          });
        } else {
          setHasCameras(false);
        }
      })
      .catch((err) => {
        if (isMounted) setHasCameras(false);
        console.error("Error getting cameras", err);
      });

    return () => {
      isMounted = false;
      try {
          if (!isStarting && html5QrCode.getState() !== 1) { // 1 = NOT_STARTED
              html5QrCode.stop().catch(() => {});
          }
      } catch (e) {}
    };
  }, [onScanSuccess, onScanFailure]);

  if (hasCameras === false) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400">
        <p className="text-sm">No camera found on this device.</p>
        <p className="text-xs mt-2">Please use a manual barcode scanner or type the token.</p>
      </div>
    );
  }

  return (
    <div className="w-full relative rounded-2xl overflow-hidden bg-slate-950/50 border border-slate-800">
      <div id="reader" ref={scannerRef} className="w-full"></div>
    </div>
  );
}
