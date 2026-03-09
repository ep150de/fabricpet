// ============================================
// RP1 Share Button — Share pet in RP1 Metaverse Browser
// ============================================
// Generates Scene Assembler JSON from the pet's equipped ordinal
// and provides Copy JSON / Deep Link / Download options.
// Uses pResource.sReference per omb.wiki/tools/scene-assembler/json
// ============================================

import { useState } from 'react';
import { useStore } from '../store/useStore';
import { generateSceneJSONString } from './SceneJSONGenerator';

type ShareMode = 'idle' | 'generating' | 'ready';

export function RP1ShareButton({ className = '' }: { className?: string }) {
  const { pet, wallet } = useStore();
  const inscriptions = wallet?.inscriptions || [];
  const [mode, setMode] = useState<ShareMode>('idle');
  const [sceneJSON, setSceneJSON] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [showPanel, setShowPanel] = useState(false);

  if (!pet) return null;

  const handleGenerate = () => {
    setMode('generating');

    // Generate Scene Assembler JSON
    const json = generateSceneJSONString(pet, inscriptions, {
      sceneSize: 20,
      petPosition: [0, 0.5, 0],
      includeImages: true,
    });

    setSceneJSON(json);
    setMode('ready');
    setShowPanel(true);
  };

  const handleCopyJSON = async () => {
    try {
      await navigator.clipboard.writeText(sceneJSON);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = sceneJSON;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadJSON = () => {
    const blob = new Blob([sceneJSON], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pet.name.toLowerCase().replace(/\s+/g, '-')}-fabricpet-scene.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenRP1 = () => {
    // RP1 deep link — opens in RP1 browser or Xverse browser
    const deepLink = `https://enter.rp1.com?start_cid=104`;
    window.open(deepLink, '_blank');
  };

  const hasOrdinal = !!pet.equippedOrdinal;

  return (
    <div className={className}>
      {/* Share Button */}
      <button
        onClick={handleGenerate}
        className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold py-3 rounded-xl hover:from-violet-600 hover:to-fuchsia-600 transition-all active:scale-98 flex items-center justify-center gap-2"
      >
        <span className="text-lg">🌐</span>
        <span>Share Pet in RP1 Metaverse</span>
      </button>

      {/* Share Panel */}
      {showPanel && (
        <div className="mt-3 bg-[#1a1a2e] rounded-xl border border-gray-800 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-gray-800">
            <h3 className="text-sm font-semibold text-fuchsia-300">🌐 RP1 Scene Assembler JSON</h3>
            <button
              onClick={() => setShowPanel(false)}
              className="text-gray-500 hover:text-gray-300 text-sm"
            >
              ✕
            </button>
          </div>

          {/* Info */}
          <div className="p-3 border-b border-gray-800">
            <div className="text-xs text-gray-400 space-y-1">
              <p>
                {hasOrdinal
                  ? `✅ Pet "${pet.name}" with ordinal inscription as 3D asset`
                  : `⚠️ No ordinal equipped — scene will be empty. Equip an ordinal first!`}
              </p>
              <p className="text-gray-500">
                Scene uses <code className="text-fuchsia-400">pResource.sReference</code> pointing to ordinals.com content URLs.
                Paste into Scene Assembler or import into your RP1 fabric.
              </p>
            </div>
          </div>

          {/* JSON Preview */}
          <div className="p-3 border-b border-gray-800">
            <pre className="bg-[#0f0f23] rounded-lg p-3 text-xs text-gray-300 max-h-40 overflow-auto font-mono whitespace-pre-wrap">
              {sceneJSON.slice(0, 500)}{sceneJSON.length > 500 ? '\n...' : ''}
            </pre>
          </div>

          {/* Action Buttons */}
          <div className="p-3 space-y-2">
            <button
              onClick={handleCopyJSON}
              className={`w-full font-semibold py-2.5 rounded-lg transition-all text-sm ${
                copied
                  ? 'bg-green-500/20 text-green-300 border border-green-500/50'
                  : 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/50 hover:bg-fuchsia-500/30'
              }`}
            >
              {copied ? '✅ Copied to Clipboard!' : '📋 Copy Scene JSON'}
            </button>

            <button
              onClick={handleDownloadJSON}
              className="w-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/50 hover:bg-indigo-500/30 font-semibold py-2.5 rounded-lg transition-all text-sm"
            >
              💾 Download .json File
            </button>

            <button
              onClick={handleOpenRP1}
              className="w-full bg-violet-500/20 text-violet-300 border border-violet-500/50 hover:bg-violet-500/30 font-semibold py-2.5 rounded-lg transition-all text-sm"
            >
              🚀 Open RP1 Browser
            </button>

            <div className="text-xs text-gray-600 text-center pt-1">
              Works in RP1 Browser, Xverse Browser, Meta Quest Browser
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
