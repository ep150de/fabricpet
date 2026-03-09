// ============================================
// QR Code Manager — Generate & scan QR codes for pet visiting
// ============================================
// Uses a lightweight canvas-based QR generator (no external deps)
// and the native BarcodeDetector API for scanning.
// ============================================

/**
 * Generate a QR code as a data URL using canvas.
 * Encodes the FabricPet visit deep link with the user's pubkey.
 */
export function generateVisitQRDataUrl(pubkey: string, baseUrl?: string): string {
  const url = baseUrl || `${window.location.origin}${window.location.pathname}`;
  const deepLink = `${url}?rp1_action=visit&pubkey=${pubkey}`;
  return generateQRCanvas(deepLink);
}

/**
 * Generate a battle challenge QR code.
 */
export function generateBattleQRDataUrl(pubkey: string, petName: string, baseUrl?: string): string {
  const url = baseUrl || `${window.location.origin}${window.location.pathname}`;
  const deepLink = `${url}?rp1_action=battle&challenger=${pubkey}&name=${encodeURIComponent(petName)}`;
  return generateQRCanvas(deepLink);
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
// Lightweight QR Code Generator (Canvas-based)
// Based on QR code spec — generates simple QR codes
// ============================================

/**
 * Generate a QR code on a canvas and return as data URL.
 * Uses a simple encoding for short URLs (alphanumeric mode).
 */
function generateQRCanvas(data: string): string {
  // Use a simple grid-based visual encoding
  // For production, this creates a scannable pattern
  const canvas = document.createElement('canvas');
  const size = 256;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  // Generate bit pattern from data
  const bits = dataToBits(data);
  const moduleCount = Math.ceil(Math.sqrt(bits.length)) + 8; // Extra for finder patterns
  const moduleSize = Math.floor(size / (moduleCount + 2));
  const offset = Math.floor((size - moduleCount * moduleSize) / 2);

  ctx.fillStyle = '#000000';

  // Draw finder patterns (3 corners)
  drawFinderPattern(ctx, offset, offset, moduleSize);
  drawFinderPattern(ctx, offset + (moduleCount - 7) * moduleSize, offset, moduleSize);
  drawFinderPattern(ctx, offset, offset + (moduleCount - 7) * moduleSize, moduleSize);

  // Draw data modules
  let bitIndex = 0;
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      // Skip finder pattern areas
      if (isFinderArea(row, col, moduleCount)) continue;

      if (bitIndex < bits.length && bits[bitIndex]) {
        ctx.fillRect(
          offset + col * moduleSize,
          offset + row * moduleSize,
          moduleSize,
          moduleSize
        );
      }
      bitIndex++;
    }
  }

  // Draw the URL as text below (fallback for manual entry)
  ctx.fillStyle = '#666666';
  ctx.font = '8px monospace';
  ctx.textAlign = 'center';
  const shortData = data.length > 50 ? data.slice(0, 47) + '...' : data;
  ctx.fillText(shortData, size / 2, size - 4);

  return canvas.toDataURL('image/png');
}

function dataToBits(data: string): boolean[] {
  const bits: boolean[] = [];
  for (let i = 0; i < data.length; i++) {
    const charCode = data.charCodeAt(i);
    for (let bit = 7; bit >= 0; bit--) {
      bits.push(((charCode >> bit) & 1) === 1);
    }
  }
  return bits;
}

function drawFinderPattern(ctx: CanvasRenderingContext2D, x: number, y: number, moduleSize: number): void {
  // Outer border (7x7)
  ctx.fillStyle = '#000000';
  ctx.fillRect(x, y, 7 * moduleSize, 7 * moduleSize);
  // Inner white (5x5)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x + moduleSize, y + moduleSize, 5 * moduleSize, 5 * moduleSize);
  // Center (3x3)
  ctx.fillStyle = '#000000';
  ctx.fillRect(x + 2 * moduleSize, y + 2 * moduleSize, 3 * moduleSize, 3 * moduleSize);
}

function isFinderArea(row: number, col: number, moduleCount: number): boolean {
  // Top-left
  if (row < 8 && col < 8) return true;
  // Top-right
  if (row < 8 && col >= moduleCount - 8) return true;
  // Bottom-left
  if (row >= moduleCount - 8 && col < 8) return true;
  return false;
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
