
import React, { useEffect, useRef, useState } from 'react';
import { loadImage, applyMosaic, applyBlur, applySolidColor, Rect } from '../utils/imageProcessing';
import { Button } from './ui/Button';
import { Download, RefreshCw, AlertCircle, Settings2, Eraser, Undo2, Grip, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';

interface MosaicWorkspaceProps {
  file: File;
  onReset: () => void;
}

const SOLID_COLORS = [
    '#000000', // Black
    '#FFFFFF', // White
    '#F3F4F6', // Gray-100
    '#FDE68A', // Amber-200
    '#FDBA74', // Orange-300
    '#FEF08A', // Yellow-200
    '#BBF7D0', // Green-200
    '#BFDBFE', // Blue-200
    '#E9D5FF', // Purple-200
    '#FBCFE8', // Pink-200
    '#FECACA', // Red-200
];

export const MosaicWorkspace: React.FC<MosaicWorkspaceProps> = ({ file, onReset }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseImageDataRef = useRef<ImageData | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [manualBoxes, setManualBoxes] = useState<Rect[]>([]);
  const [mosaicSize, setMosaicSize] = useState(12);
  const [opacity, setOpacity] = useState(1.0);
  const [mosaicStyle, setMosaicStyle] = useState<'pixelate' | 'blur'>('pixelate');
  const [solidColor, setSolidColor] = useState<string | null>(null); // null means standard mosaic (auto), string means solid color
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  // Reset manual boxes when file changes
  useEffect(() => {
    setManualBoxes([]);
  }, [file]);

  // Load image only
  useEffect(() => {
    const load = async () => {
      setProcessing(true);
      setError(null);
      setOriginalImage(null);

      try {
        const imageUrl = URL.createObjectURL(file);
        const img = await loadImage(imageUrl);
        setOriginalImage(img);
        
        // Clean up object URL
        URL.revokeObjectURL(imageUrl);

      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to process image.');
      } finally {
        setProcessing(false);
      }
    };

    load();
  }, [file]);

  // Effect for rendering (applying mosaic)
  useEffect(() => {
    if (!originalImage || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = originalImage.width;
    canvas.height = originalImage.height;

    // Draw original
    ctx.drawImage(originalImage, 0, 0);

    const commonOptions = {
        blockSize: mosaicSize,
        redThreshold: { r: 150, g: 80, b: 80 }
    };

    // Apply processing to manual boxes
    if (manualBoxes.length > 0) {
        if (mosaicStyle === 'pixelate') {
            if (solidColor !== null) {
                applySolidColor(ctx, originalImage.width, originalImage.height, manualBoxes, solidColor, opacity);
            } else {
                applyMosaic(ctx, originalImage.width, originalImage.height, manualBoxes, {
                    ...commonOptions,
                    ignoreRed: false // Don't ignore red for manual selection
                });
            }
        } else if (mosaicStyle === 'blur') {
            applyBlur(ctx, originalImage.width, originalImage.height, manualBoxes, commonOptions);
        }
    }

    // Cache the base image data (image + mosaic)
    baseImageDataRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Generate result URL
    setResultUrl(canvas.toDataURL('image/png'));

  }, [originalImage, manualBoxes, mosaicSize, mosaicStyle, solidColor, opacity]);

  const getCoordinates = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!baseImageDataRef.current) return;
    setIsDrawing(true);
    const pos = getCoordinates(e);
    setStartPos(pos);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !canvasRef.current || !baseImageDataRef.current) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const currentPos = getCoordinates(e);
    const w = currentPos.x - startPos.x;
    const h = currentPos.y - startPos.y;

    // Restore base image
    ctx.putImageData(baseImageDataRef.current, 0, 0);

    // Draw selection rect
    ctx.strokeStyle = '#3b82f6'; // blue-500
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(startPos.x, startPos.y, w, h);
    ctx.setLineDash([]);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const currentPos = getCoordinates(e);
    const w = currentPos.x - startPos.x;
    const h = currentPos.y - startPos.y;

    // Normalize rect (handle negative width/height)
    const newBox: Rect = {
        x: w < 0 ? currentPos.x : startPos.x,
        y: h < 0 ? currentPos.y : startPos.y,
        w: Math.abs(w),
        h: Math.abs(h)
    };

    // Only add if it has some size
    if (newBox.w > 5 && newBox.h > 5) {
        setManualBoxes(prev => [...prev, newBox]);
    } else {
        // If simply clicked or too small, restore the canvas
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx && baseImageDataRef.current) {
            ctx.putImageData(baseImageDataRef.current, 0, 0);
        }
    }
  };

  const handleUndo = () => {
    setManualBoxes(prev => prev.slice(0, -1));
  };

  const handleClearManual = () => {
    setManualBoxes([]);
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    const link = document.createElement('a');
    link.download = `mosaic-processed-${Date.now()}.png`;
    link.href = resultUrl;
    link.click();
  };

  return (
    <div className="flex flex-col lg:flex-row w-full max-w-6xl mx-auto gap-6">
      {/* Left Sidebar / Control Panel */}
      <div className="w-full lg:w-64 flex-shrink-0 space-y-6">
        <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm space-y-6">
            <h3 className="font-semibold text-zinc-800 flex items-center">
                <Settings2 className="w-5 h-5 mr-2" />
                Settings
            </h3>
            
            <div className="space-y-3">
                <label className="text-sm font-medium text-zinc-600 block">
                    Mosaic Style
                </label>
                <div className="flex bg-zinc-100 p-1 rounded-lg">
                    <button
                        onClick={() => setMosaicStyle('blur')}
                        className={clsx(
                            "flex-1 flex items-center justify-center py-1.5 text-xs font-medium rounded-md transition-all",
                            mosaicStyle === 'blur'
                                ? "bg-white text-blue-700 shadow-sm"
                                : "text-zinc-500 hover:text-zinc-700"
                        )}
                    >
                        <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                        Blur
                    </button>
                    <button
                        onClick={() => setMosaicStyle('pixelate')}
                        className={clsx(
                            "flex-1 flex items-center justify-center py-1.5 text-xs font-medium rounded-md transition-all",
                            mosaicStyle === 'pixelate'
                                ? "bg-white text-blue-700 shadow-sm"
                                : "text-zinc-500 hover:text-zinc-700"
                        )}
                    >
                        <Grip className="w-3.5 h-3.5 mr-1.5" />
                        Pixelate
                    </button>
                </div>
            </div>

            {mosaicStyle === 'pixelate' && (
            <div className="space-y-3 pt-4 border-t border-zinc-100">
                <label className="text-sm font-medium text-zinc-600 block">
                    Color
                </label>
                <div className="grid grid-cols-6 gap-2">
                    <button
                        onClick={() => setSolidColor(null)}
                        className={clsx(
                            "w-6 h-6 rounded-md border transition-all flex items-center justify-center bg-zinc-100",
                            solidColor === null ? "ring-2 ring-offset-1 ring-blue-500 border-transparent" : "border-zinc-200 hover:scale-110"
                        )}
                        title="Standard Mosaic"
                        aria-label="Standard Mosaic"
                    >
                         <div className="w-3 h-3 grid grid-cols-2 gap-px opacity-50">
                            <div className="bg-zinc-400"></div>
                            <div className="bg-zinc-300"></div>
                            <div className="bg-zinc-300"></div>
                            <div className="bg-zinc-400"></div>
                         </div>
                    </button>
                    {SOLID_COLORS.map((color) => (
                        <button
                            key={color}
                            onClick={() => setSolidColor(color)}
                            className={clsx(
                                "w-6 h-6 rounded-md border transition-all",
                                solidColor === color ? "ring-2 ring-offset-1 ring-blue-500 border-transparent" : "border-zinc-200 hover:scale-110"
                            )}
                            style={{ backgroundColor: color }}
                            aria-label={`Select color ${color}`}
                        />
                    ))}
                </div>
            </div>
            )}

            <div className="space-y-3 pt-4 border-t border-zinc-100">
                <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-zinc-600">
                        {solidColor !== null ? 'Opacity' : 'Intensity'}
                    </label>
                    <span className="text-xs font-mono bg-zinc-100 px-2 py-0.5 rounded text-zinc-600">
                        {solidColor !== null ? `${Math.round(opacity * 100)}%` : `${mosaicSize}px`}
                    </span>
                </div>
                {solidColor !== null ? (
                    <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.05"
                        value={opacity}
                        onChange={(e) => setOpacity(Number(e.target.value))}
                        className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                ) : (
                    <input 
                        type="range" 
                        min="2" 
                        max="50" 
                        value={mosaicSize}
                        onChange={(e) => setMosaicSize(Number(e.target.value))}
                        className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                )}
            </div>

            <div className="space-y-2 pt-4 border-t border-zinc-100">
                <label className="text-sm font-medium text-zinc-600 block">
                    Manual Edits
                </label>
                <div className="flex gap-2">
                     <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleUndo} 
                        disabled={manualBoxes.length === 0}
                        className="flex-1"
                     >
                        <Undo2 className="w-4 h-4 mr-2" />
                        Undo
                     </Button>
                     <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleClearManual} 
                        disabled={manualBoxes.length === 0}
                        className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                     >
                        <Eraser className="w-4 h-4 mr-2" />
                        Clear
                     </Button>
                </div>
                <p className="text-xs text-zinc-400">
                    Drag on image to add mosaic manually.
                </p>
            </div>

            <div className="pt-4 border-t border-zinc-100">
                 <Button variant="outline" onClick={onReset} className="w-full justify-center">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Upload New Image
                </Button>
            </div>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col space-y-4">
        <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-zinc-800">Preview</h2>
            <Button onClick={handleDownload} disabled={!resultUrl} size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download Result
            </Button>
        </div>

        <div className="relative w-full overflow-hidden bg-zinc-100 rounded-xl shadow-inner border border-zinc-200 flex justify-center items-center min-h-[500px] lg:h-[600px]">
            {processing && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10 backdrop-blur-sm">
                <div className="flex flex-col items-center space-y-3">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    <p className="text-sm text-zinc-500 font-medium">Processing image...</p>
                </div>
            </div>
            )}

            {error && (
            <div className="flex flex-col items-center text-red-500 p-8 text-center max-w-md">
                <AlertCircle className="w-12 h-12 mb-3 opacity-90" />
                <p className="font-medium text-lg mb-1">Detection Failed</p>
                <p className="text-sm opacity-80">{error}</p>
            </div>
            )}
            
            <div className="w-full h-full overflow-auto flex justify-center items-center p-4">
                 <canvas 
                ref={canvasRef} 
                className={clsx(
                    "max-w-full max-h-full shadow-lg object-contain",
                    !processing && "cursor-crosshair"
                )}
                style={{ display: error ? 'none' : 'block' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                />
            </div>
        </div>

        <div className="flex gap-2">
             {manualBoxes.length > 0 && (
                <div className="p-4 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 text-sm flex items-center shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mr-2.5"></div>
                    Added {manualBoxes.length} manual area(s).
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
