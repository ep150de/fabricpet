// ============================================
// QR Code Generator — Create scannable QR codes for pet sharing
// ============================================

import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface QRCodeGeneratorProps {
  npub: string;
  petName: string;
  size?: number;
}

export function QRCodeGenerator({ npub, petName, size = 200 }: QRCodeGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && npub) {
      // Generate QR code with deep link
      const deepLink = `fabricpet://join?npub=${npub}&name=${encodeURIComponent(petName)}`;
      
      QRCode.toCanvas(
        canvasRef.current,
        deepLink,
        {
          width: size,
          margin: 2,
          color: {
            dark: '#ffffff',
            light: '#0f0f23',
          },
          errorCorrectionLevel: 'M',
        },
        (error) => {
          if (error) {
            console.error('[QRCode] Generation failed:', error);
          }
        }
      );
    }
  }, [npub, petName, size]);

  return (
    <div className="flex flex-col items-center">
      <canvas 
        ref={canvasRef} 
        className="rounded-xl border border-gray-700"
      />
      <p className="text-xs text-gray-500 mt-2 text-center">
        Scan to add {petName}
      </p>
      <p className="text-xs text-gray-600 mt-1 font-mono truncate max-w-[200px]">
        {npub.slice(0, 12)}...{npub.slice(-4)}
      </p>
    </div>
  );
}

/**
 * Generate QR code data URL for sharing
 */
export async function generateQRCodeDataUrl(npub: string, petName: string): Promise<string> {
  const deepLink = `fabricpet://join?npub=${npub}&name=${encodeURIComponent(petName)}`;
  
  try {
    return await QRCode.toDataURL(deepLink, {
      width: 200,
      margin: 2,
      color: {
        dark: '#ffffff',
        light: '#0f0f23',
      },
      errorCorrectionLevel: 'M',
    });
  } catch (error) {
    console.error('[QRCode] Data URL generation failed:', error);
    return '';
  }
}
