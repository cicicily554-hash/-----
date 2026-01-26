
import React, { useCallback, useState, useEffect } from 'react';
import { Upload, FileImage } from 'lucide-react';
import { clsx } from 'clsx';

interface ImageUploaderProps {
  onImageSelect: (file: File) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelect }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0 && files[0].type.startsWith('image/')) {
        onImageSelect(files[0]);
      }
    },
    [onImageSelect]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        onImageSelect(e.target.files[0]);
      }
    },
    [onImageSelect]
  );

  return (
    <div
      className={clsx(
        'relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
        isDragging
          ? 'border-blue-500 bg-blue-50'
          : 'border-zinc-300 bg-zinc-50 hover:bg-zinc-100'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        accept="image/*"
        onChange={handleFileChange}
      />
      
      <div className="flex flex-col items-center space-y-3 text-zinc-500">
        <div className="p-4 bg-white rounded-full shadow-sm">
          <Upload className="w-8 h-8 text-blue-500" />
        </div>
        <div className="text-center">
          <p className="text-lg font-medium text-zinc-700">
            Click, drag image here, or <span className="text-blue-600">Ctrl+V</span> to paste
          </p>
          <p className="text-sm text-zinc-400">
            Supports JPG, PNG, WebP
          </p>
        </div>
      </div>
    </div>
  );
};
