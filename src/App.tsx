
import React, { useState, useEffect } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { MosaicWorkspace } from './components/MosaicWorkspace';
import { ScanFace } from 'lucide-react';

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleImageSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleReset = () => {
    setSelectedFile(null);
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.items) {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            if (blob) {
              handleImageSelect(blob);
            }
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <ScanFace className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              AutoMosaic
            </h1>
          </div>
          <div className="text-sm text-zinc-500 hidden sm:block">
            Intelligent Privacy Protection Tool
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-8">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
              Privacy Mosaic Tool
            </h2>
            <p className="text-lg text-zinc-600">
              Upload or paste a screenshot. Manually select areas to blur or pixelate. Your privacy, your control.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-zinc-200 p-6 sm:p-10 transition-all duration-300">
            {!selectedFile ? (
              <div className="space-y-6">
                <ImageUploader onImageSelect={handleImageSelect} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-zinc-100 max-w-2xl mx-auto">
                  <Feature 
                    title="Manual Selection" 
                    desc="Drag to select any area you want to hide." 
                  />
                  <Feature 
                    title="Smart Styles" 
                    desc="Choose between Blur, Pixelate, or Solid Color masks." 
                  />
                </div>
              </div>
            ) : (
              <MosaicWorkspace file={selectedFile} onReset={handleReset} />
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-zinc-200 mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-zinc-400 text-sm">
            &copy; {new Date().getFullYear()} AutoMosaic Tool. All processing is done locally in your browser.
          </p>
        </div>
      </footer>
    </div>
  );
}

const Feature = ({ title, desc }: { title: string; desc: string }) => (
  <div className="text-center p-4 rounded-xl bg-zinc-50 border border-zinc-100">
    <h3 className="font-semibold text-zinc-900 mb-2">{title}</h3>
    <p className="text-sm text-zinc-500">{desc}</p>
  </div>
);

export default App;
