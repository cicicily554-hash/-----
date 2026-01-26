
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ProcessingOptions {
  blockSize: number;
  redThreshold: {
    r: number;
    g: number;
    b: number;
  };
  gridSize?: number; // Size of the grid for connected component analysis
  ignoreRed?: boolean; // Whether to ignore red pixels
}

const DEFAULT_OPTIONS: ProcessingOptions = {
  blockSize: 10,
  redThreshold: {
    r: 150,
    g: 80,
    b: 80,
  },
  gridSize: 5,
};

export const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

const isRed = (r: number, g: number, b: number, threshold = DEFAULT_OPTIONS.redThreshold) => {
  return r > threshold.r && g < threshold.g && b < threshold.b;
};

// Use Union-Find data structure for efficient component labeling
class UnionFind {
  parent: number[];
  
  constructor(size: number) {
    this.parent = new Array(size).fill(0).map((_, i) => i);
  }

  find(i: number): number {
    if (this.parent[i] === i) return i;
    this.parent[i] = this.find(this.parent[i]);
    return this.parent[i];
  }

  union(i: number, j: number) {
    const rootI = this.find(i);
    const rootJ = this.find(j);
    if (rootI !== rootJ) {
      this.parent[rootI] = rootJ;
    }
  }
}

export const detectRedBoxes = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options = DEFAULT_OPTIONS
): Rect[] => {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const gridSize = options.gridSize || 5;
  
  // Calculate grid dimensions
  const gridW = Math.ceil(width / gridSize);
  const gridH = Math.ceil(height / gridSize);
  const hasRed = new Uint8Array(gridW * gridH); // 1 if grid cell has red pixels
  
  // Step 1: Mark grid cells that contain red pixels
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      if (isRed(r, g, b, options.redThreshold)) {
        const gx = Math.floor(x / gridSize);
        const gy = Math.floor(y / gridSize);
        hasRed[gy * gridW + gx] = 1;
      }
    }
  }

  // Step 2: Connected Component Labeling on the grid
  const uf = new UnionFind(gridW * gridH);
  
  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      const idx = gy * gridW + gx;
      if (hasRed[idx]) {
        // Check right neighbor
        if (gx + 1 < gridW && hasRed[idx + 1]) {
          uf.union(idx, idx + 1);
        }
        // Check bottom neighbor
        if (gy + 1 < gridH && hasRed[idx + gridW]) {
          uf.union(idx, idx + gridW);
        }
        // Check diagonal neighbors (for better connectivity)
        if (gx + 1 < gridW && gy + 1 < gridH && hasRed[idx + gridW + 1]) {
          uf.union(idx, idx + gridW + 1);
        }
        if (gx - 1 >= 0 && gy + 1 < gridH && hasRed[idx + gridW - 1]) {
          uf.union(idx, idx + gridW - 1);
        }
      }
    }
  }

  // Step 3: Group grid cells by component root
  const components = new Map<number, { minX: number, maxX: number, minY: number, maxY: number }>();
  
  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      const idx = gy * gridW + gx;
      if (hasRed[idx]) {
        const root = uf.find(idx);
        
        if (!components.has(root)) {
          components.set(root, { 
            minX: gx, maxX: gx, 
            minY: gy, maxY: gy 
          });
        } else {
          const bounds = components.get(root)!;
          bounds.minX = Math.min(bounds.minX, gx);
          bounds.maxX = Math.max(bounds.maxX, gx);
          bounds.minY = Math.min(bounds.minY, gy);
          bounds.maxY = Math.max(bounds.maxY, gy);
        }
      }
    }
  }

  // Step 4: Convert grid bounds to image Rects
  const rects: Rect[] = [];
  components.forEach(bounds => {
    // Add a little padding to ensure we cover edges fully
    const x = bounds.minX * gridSize;
    const y = bounds.minY * gridSize;
    // Calculate width/height based on grid cells, ensuring we don't exceed image bounds
    const w = Math.min((bounds.maxX - bounds.minX + 1) * gridSize, width - x);
    const h = Math.min((bounds.maxY - bounds.minY + 1) * gridSize, height - y);
    
    // Filter out very small noise (e.g., single stray pixels)
    if (w > gridSize && h > gridSize) {
        rects.push({ x, y, w, h });
    }
  });

  return rects;
};

// Deprecated: kept for backward compatibility if needed, but redirects to new logic
export const detectRedBox = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options = DEFAULT_OPTIONS
): Rect | null => {
  const rects = detectRedBoxes(ctx, width, height, options);
  if (rects.length === 0) return null;
  
  // If multiple boxes, merge them into one (old behavior fallback)
  // But ideally we should change the consumer to use detectRedBoxes
  let minX = width, minY = height, maxX = 0, maxY = 0;
  rects.forEach(r => {
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.w);
    maxY = Math.max(maxY, r.y + r.h);
  });
  
  return {
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY
  };
};

export const applyMosaic = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  boxes: Rect | Rect[], // Support single or multiple boxes
  options = DEFAULT_OPTIONS
) => {
  const { blockSize } = options;
  const boxList = Array.isArray(boxes) ? boxes : [boxes];

  // We need to read the original data to calculate averages
  // Use willReadFrequently to optimize if possible, though strict mode is Canvas2D
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Helper to get pixel index
  const getIdx = (x: number, y: number) => (y * width + x) * 4;

  // Process each box
  boxList.forEach(box => {
    // Add padding to ensure the red border is covered
    const padding = 2;
    const startX = Math.max(0, box.x - padding);
    const startY = Math.max(0, box.y - padding);
    const endX = Math.min(width, box.x + box.w + padding);
    const endY = Math.min(height, box.y + box.h + padding);

    for (let y = startY; y < endY; y += blockSize) {
      for (let x = startX; x < endX; x += blockSize) {
        // Calculate average color for this block
        let totalR = 0, totalG = 0, totalB = 0, count = 0;
        
        // Iterate pixels in the block
        for (let by = 0; by < blockSize; by++) {
          for (let bx = 0; bx < blockSize; bx++) {
            const px = x + bx;
            const py = y + by;

            if (px >= endX || py >= endY) continue;

            const idx = getIdx(px, py);
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const a = data[idx + 3];

            // Ignore red pixels only if requested
            if (options.ignoreRed && isRed(r, g, b, options.redThreshold)) {
               continue;
            }
            
            // Skip fully transparent pixels to avoid darkening
            if (a === 0) continue;

            totalR += r;
            totalG += g;
            totalB += b;
            count++;
          }
        }

        let avgR, avgG, avgB;

        if (count > 0) {
          avgR = Math.round(totalR / count);
          avgG = Math.round(totalG / count);
          avgB = Math.round(totalB / count);
        } else {
          // Fallback: This block is entirely red or empty
          // Try to sample adjacent pixel
          const fallbackIdx = getIdx(Math.max(0, x - 1), Math.max(0, y));
          avgR = data[fallbackIdx];
          avgG = data[fallbackIdx + 1];
          avgB = data[fallbackIdx + 2];
        }

        // Fill the block with the average color
        ctx.fillStyle = `rgb(${avgR}, ${avgG}, ${avgB})`;
        ctx.fillRect(x, y, blockSize, blockSize);
      }
    }
  });
};

export const applyBlur = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  boxes: Rect | Rect[],
  options = DEFAULT_OPTIONS
) => {
  const { blockSize } = options;
  const blurAmount = Math.max(1, blockSize / 2); // Adjust blur based on block size
  const boxList = Array.isArray(boxes) ? boxes : [boxes];

  ctx.save();
  ctx.beginPath();
  
  boxList.forEach(box => {
    // Add padding
    const padding = 2;
    const x = Math.max(0, box.x - padding);
    const y = Math.max(0, box.y - padding);
    const w = Math.min(width - x, box.w + padding * 2);
    const h = Math.min(height - y, box.h + padding * 2);
    ctx.rect(x, y, w, h);
  });

  ctx.clip();
  ctx.filter = `blur(${blurAmount}px)`;
  
  // We need to draw the original image (or current canvas content) onto itself
  // However, since we are drawing ONTO the canvas, we should use the canvas as source
  // But drawing canvas onto itself with globalCompositeOperation might be tricky
  // Simplest is to assume the background is already drawn (which it is) and we just apply blur?
  // No, filter applies to *new* drawings.
  
  // So we draw the canvas content again.
  ctx.drawImage(ctx.canvas, 0, 0);
  
  ctx.restore();
};

export const applySolidColor = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  boxes: Rect | Rect[],
  color: string,
  opacity: number = 1.0
) => {
  const boxList = Array.isArray(boxes) ? boxes : [boxes];

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = color;
  
  boxList.forEach(box => {
    // Add padding
    const padding = 2;
    const x = Math.max(0, box.x - padding);
    const y = Math.max(0, box.y - padding);
    const w = Math.min(width - x, box.w + padding * 2);
    const h = Math.min(height - y, box.h + padding * 2);
    
    // Draw rounded rect? Or just rect. Let's do rect for now to match others.
    // If we want rounded, we can use roundRect
    ctx.beginPath();
    // ctx.roundRect(x, y, w, h, 8); // Optional: rounded corners
    ctx.rect(x, y, w, h);
    ctx.fill();
  });

  ctx.restore();
};
