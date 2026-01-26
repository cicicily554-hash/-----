# Product Requirements Document: Intelligent Mosaic Tool

## 1. Project Overview
A web-based tool that allows users to upload a screenshot containing a red rectangular selection. The tool automatically detects the red box, applies a mosaic effect to the content within the box and the entire area vertically below it, and removes the red border from the final image.

## 2. User Flow
1.  **Upload**: User opens the webpage and uploads an image (drag & drop or file selection).
2.  **Preview**: The uploaded image is displayed.
3.  **Process**:
    *   The system automatically scans the image for a red rectangular frame.
    *   If detected, it generates a processed image where:
        *   The area inside the red box is pixelated (mosaic).
        *   The area from the bottom of the red box to the bottom of the image is also pixelated (based on user requirement "red box and area below").
        *   The red border itself is removed/overwritten by the mosaic or surrounding content.
4.  **Result**: The user sees the processed image side-by-side or toggled with the original.
5.  **Download**: User clicks a button to download the processed image.

## 3. Key Features
*   **Red Frame Detection**: Algorithm to identify high-red-intensity rectangular shapes.
*   **Mosaic Processing**: Pixelation algorithm applied to the target region (Box + Below).
*   **Red Removal**: Logic to ensure the red pixels of the frame are not visible in the result.
*   **Client-Side Processing**: All image manipulation happens in the browser for speed and privacy.

## 4. UI/UX Requirements
*   Clean, simple interface.
*   Responsive design.
*   Clear "Before/After" comparison.
*   Adjustable settings (Optional but good): Mosaic strength, Red sensitivity.
