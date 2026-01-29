# Technical Design Document: Intelligent Mosaic Tool

## 1. Tech Stack

* **Frontend**: React + TypeScript

* **Build Tool**: Vite

* **Styling**: Tailwind CSS

* **Image Processing**: HTML5 Canvas API (for pixel manipulation)

## 2. Component Structure

* `App`: Main container.

* `ImageUploader`: Component for drag-and-drop file input.

* `Workspace`: Component handling the canvas operations and preview.

* `Controls`: Buttons for "Process", "Download", and parameter sliders.

## 3. Core Algorithms

### 3.1. Red Box Detection

1. Iterate through image pixels via `ctx.getImageData`.
2. Identify "Red" pixels based on threshold: `R > 150 && G < 80 && B < 80` (values to be tuned).
3. Find the bounding box of all red pixels:

   * `minX`, `minY` (Top-Left)

   * `maxX`, `maxY` (Bottom-Right)
4. Validate if it forms a rough rectangle (optional, for robustness).

### 3.2. Mosaic Application

1. Define Target Region:

   * `x`: `minX` to `maxX`

   * `y`: `minY` to `imageHeight` (covering the box and everything below it).
2. **Mosaic Loop**:

   * Divide the target region into `blockSize x blockSize` chunks (e.g., 10x10).

   * For each chunk, calculate the average color.

   * **Crucial Step for Red Removal**: When calculating the average color, ignore pixels that are detected as "Red Border". If a chunk is entirely red (unlikely), borrow color from the neighbor.

   * Fill the chunk with the calculated average color.

### 3.3. Rendering

1. Draw the original image to an off-screen canvas.
2. Apply the Mosaic Logic.
3. Render the result to the visible canvas.

## 4. Data Flow

1. User Selects File -> `File` object.
2. `FileReader` -> DataURL -> `HTMLImageElement`.
3. `Image` -> `Canvas` (Analysis & Processing).
4. `Canvas` -> DataURL (for Download).

## 5. Directory Structure

```
src/
  components/
    ImageUploader.tsx
    MosaicProcessor.tsx
    ui/ (Button, Slider, etc.)
  utils/
    imageProcessing.ts (Core logic)
  App.tsx
```

