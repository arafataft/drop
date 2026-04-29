"use client";

import { useRef, useState, useCallback } from "react";

interface FilePickerProps {
  onFilesSelected: (files: FileList) => void;
}

export function FilePicker({ onFilesSelected }: FilePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (files && files.length > 0) {
        onFilesSelected(files);
      }
    },
    [onFilesSelected]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
        dragOver
          ? "border-blue-400 bg-blue-50"
          : "border-gray-300 hover:border-gray-400"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />
      <p className="text-gray-600">
        Drop files here or <span className="text-blue-600 underline">browse</span>
      </p>
      <p className="text-xs text-gray-400 mt-1">Any file type, any size</p>
    </div>
  );
}
