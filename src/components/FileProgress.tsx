"use client";

import type { FileProgress as FileProgressType } from "@/types/transfer";

interface FileProgressProps {
  progress: FileProgressType;
}

export function FileProgress({ progress }: FileProgressProps) {
  const percent =
    progress.fileSize > 0
      ? Math.round((progress.bytesTransferred / progress.fileSize) * 100)
      : 0;

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex justify-between text-xs mb-1">
          <span className="truncate text-gray-700">{progress.fileName}</span>
          <span className="text-gray-500 ml-2 shrink-0">{percent}%</span>
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              progress.status === "completed"
                ? "bg-green-500"
                : progress.status === "failed"
                ? "bg-red-500"
                : "bg-blue-500"
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
