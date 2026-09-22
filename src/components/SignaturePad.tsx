import React, { useRef, useState, useEffect, useCallback } from 'react';
import { RotateCcw, Check, PenTool } from 'lucide-react';

interface SignaturePadProps {
  onSignatureChange: (dataUrl: string | null) => void;
  initialSignature?: string | null;
  label?: string;
  helperText?: string;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  onSignatureChange,
  initialSignature,
  label = 'Assinatura Online do Cliente / Locatário',
  helperText = 'Assine com o dedo no celular ou com o mouse no computador',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Initialize canvas resolution and sizing
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Set internal resolution
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.strokeStyle = '#0f172a'; // Deep slate ink
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // If there's an initial signature, draw it
      if (initialSignature) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          ctx.drawImage(img, 0, 0, rect.width, rect.height);
          setHasDrawn(true);
        };
        img.src = initialSignature;
      }
    }
  }, [initialSignature]);

  useEffect(() => {
    setupCanvas();
    window.addEventListener('resize', setupCanvas);
    return () => window.removeEventListener('resize', setupCanvas);
  }, [setupCanvas]);

  const getCanvasCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.setPointerCapture(e.pointerId);
    setIsDrawing(true);
    const coords = getCanvasCoordinates(e);
    lastPointRef.current = coords;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.arc(coords.x, coords.y, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentPoint = getCanvasCoordinates(e);
    const lastPoint = lastPointRef.current || currentPoint;

    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(currentPoint.x, currentPoint.y);
    ctx.stroke();

    lastPointRef.current = currentPoint;
    if (!hasDrawn) {
      setHasDrawn(true);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch (err) {
        // Ignored if pointer wasn't captured
      }
    }
    setIsDrawing(false);
    lastPointRef.current = null;

    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      onSignatureChange(dataUrl);
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, rect.width * dpr, rect.height * dpr);
    setHasDrawn(false);
    onSignatureChange(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <PenTool className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            {label}
          </span>
        </div>
        {hasDrawn && (
          <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
            <Check className="w-3 h-3" /> Assinado
          </span>
        )}
      </div>

      <div className="relative rounded-xl overflow-hidden border-2 border-dashed border-amber-500/50 bg-white shadow-inner">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ touchAction: 'none' }}
          className="w-full h-36 sm:h-40 cursor-crosshair block select-none"
        />

        {/* Guideline line at bottom */}
        <div className="absolute bottom-6 left-6 right-6 pointer-events-none border-b border-dashed border-slate-300 flex items-center justify-center">
          <span className="text-[10px] text-slate-400 tracking-wider uppercase font-medium bg-white px-2 -mb-2">
            Assine acima desta linha
          </span>
        </div>

        {/* Clear Button */}
        {hasDrawn && (
          <button
            type="button"
            onClick={clearSignature}
            className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-900 text-white text-[11px] font-bold flex items-center gap-1 transition-all shadow-sm"
          >
            <RotateCcw className="w-3 h-3 text-amber-400" />
            <span>Limpar</span>
          </button>
        )}
      </div>

      <div className="flex items-center justify-between text-[10px] text-zinc-400 px-1">
        <span>{helperText}</span>
        <span className="text-zinc-500">Validade digital contratual</span>
      </div>
    </div>
  );
};
