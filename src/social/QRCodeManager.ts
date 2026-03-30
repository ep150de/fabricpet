// ============================================
// QR Code Manager — Generate & scan QR codes for pet visiting
// ============================================
// Uses the `qrcode` npm package (MIT license) for real, scannable QR codes
// and the native BarcodeDetector API for scanning.
// ============================================

import QRCode from 'qrcode';

/**
 * Generate a QR code as a data URL using the qrcode library.
 * Encodes the FabricPet visit deep link with the user's pubkey.
 */
export function generateVisitQRDataUrl(pubkey: string, baseUrl?: string): string {
  const url = baseUrl || `${window.location.origin}${window.location.pathname}`;
  const deepLink = `${url}?rp1_action=visit&pubkey=${pubkey}`;
  // Return empty string initially, caller should use async version
  // This sync version kicks off async generation
  return generateQRAsync(deepLink);
}

/**
 * Generate a battle challenge QR code.
 */
export function generateBattleQRDataUrl(pubkey: string, petName: string, baseUrl?: string): string {
  const url = baseUrl || `${window.location.origin}${window.location.pathname}`;
  const deepLink = `${url}?rp1_action=battle&challenger=${pubkey}&name=${encodeURIComponent(petName)}`;
  return generateQRAsync(deepLink);
}

/**
 * Async QR generation — returns a proper scannable QR code data URL.
 */
export async function generateQRDataUrlAsync(data: string): Promise<string> {
  try {
    return await QRCode.toDataURL(data, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
  } catch (e) {
    console.error('[QR] Failed to generate QR code:', e);
    return '';
  }
}

/**
 * Sync wrapper that returns a placeholder and generates async.
 * For backward compatibility with existing sync callers.
 */
const qrCache = new Map<string, string>();

function generateQRAsync(data: string): string {
  // Return cached version if available
  if (qrCache.has(data)) {
    return qrCache.get(data)!;
  }

  // Generate async and cache
  generateQRDataUrlAsync(data).then(url => {
    qrCache.set(data, url);
  });

  // Return a simple fallback while generating
  return generateFallbackQR(data);
}

/**
 * Simple canvas fallback for immediate display while real QR generates.
 */
function generateFallbackQR(data: string): string {
  const canvas = document.createElement('canvas');
  const size = 256;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = '#333333';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Generating QR...', size / 2, size / 2);

  return canvas.toDataURL('image/png');
}

/**
 * Parse a scanned QR code URL to extract visit/battle info.
 */
export function parseQRCode(text: string): { action: string; pubkey: string; name?: string } | null {
  try {
    const url = new URL(text);
    const action = url.searchParams.get('rp1_action');
    const pubkey = url.searchParams.get('pubkey') || url.searchParams.get('challenger');
    if (action && pubkey) {
      return {
        action,
        pubkey,
        name: url.searchParams.get('name') || undefined,
      };
    }
    // Also accept raw npub/hex pubkeys
    if (text.startsWith('npub1') || /^[0-9a-f]{64}$/i.test(text)) {
      return { action: 'visit', pubkey: text };
    }
    return null;
  } catch {
    // Not a URL — check if it's a raw pubkey
    if (text.startsWith('npub1') || /^[0-9a-f]{64}$/i.test(text)) {
      return { action: 'visit', pubkey: text };
    }
    return null;
  }
}

// ============================================
// QR Scanner — Uses native BarcodeDetector or camera fallback
// ============================================

/**
 * Check if QR scanning is supported (BarcodeDetector API).
 */
export function isQRScanSupported(): boolean {
  return typeof (window as any).BarcodeDetector !== 'undefined';
}

/**
 * Scan a QR code from a video element using BarcodeDetector.
 */
export async function scanQRFromVideo(video: HTMLVideoElement): Promise<string | null> {
  if (!isQRScanSupported()) return null;

  try {
    const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
    const barcodes = await detector.detect(video);
    if (barcodes.length > 0) {
      return barcodes[0].rawValue;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Start continuous QR scanning from camera.
 * Returns a cleanup function.
 */
export function startQRScanner(
  videoElement: HTMLVideoElement,
  onDetected: (data: string) => void,
  intervalMs: number = 500
): { stop: () => void; stream: Promise<MediaStream | null> } {
  let running = true;
  let streamRef: MediaStream | null = null;

  const stream = navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
  }).then(async (mediaStream) => {
    streamRef = mediaStream;
    videoElement.srcObject = mediaStream;
    await videoElement.play();

    // Scan loop
    const scan = async () => {
      if (!running) return;
      const result = await scanQRFromVideo(videoElement);
      if (result) {
        onDetected(result);
      }
      if (running) {
        setTimeout(scan, intervalMs);
      }
    };
    scan();

    return mediaStream;
  }).catch((e) => {
    console.error('[QR Scanner] Camera error:', e);
    return null;
  });

  return {
    stop: () => {
      running = false;
      if (streamRef) {
        streamRef.getTracks().forEach(t => t.stop());
      }
    },
    stream,
  };
}
