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
      className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all animate-fade-in ${
        dragOver
          ? "border-[var(--accent)] bg-[var(--accent)]/10 scale-[1.02] backdrop-blur-xl"
          : "border-[var(--glass-border)] hover:border-[var(--muted)] glass"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />
      <div className="flex flex-col items-center gap-3">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
          dragOver ? "bg-[var(--accent)]/20" : "bg-[var(--card-border)]"
        }`}>
          <svg className={`w-6 h-6 transition-colors ${dragOver ? "text-[var(--accent)]" : "text-[var(--muted)]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
          </svg>
        </div>
        <div>
          <p className="text-sm text-[var(--foreground)]">
            {dragOver ? "Drop to send" : "Drop files or tap to browse"}
          </p>
          <p className="text-xs text-[var(--muted)] mt-1">Any file type</p>
        </div>
      </div>
    </div>
  );
}
