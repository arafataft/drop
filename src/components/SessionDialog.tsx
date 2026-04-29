"use client";

import type { FileDto } from "@/types/transfer";
import { formatFileSize } from "@/lib/file-utils";

interface SessionDialogProps {
  peerAlias: string;
  files: FileDto[];
  onAccept: (fileIds: string[]) => void;
  onReject: () => void;
}

export function SessionDialog({ peerAlias, files, onAccept, onReject }: SessionDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Incoming Transfer</h2>
          <p className="text-sm text-gray-600 mt-1">
            <strong>{peerAlias}</strong> wants to send you {files.length} file(s):
          </p>
        </div>

        <div className="max-h-64 overflow-y-auto p-4">
          <ul className="space-y-2">
            {files.map((file) => (
              <li key={file.id} className="flex justify-between text-sm">
                <span className="text-gray-700 truncate mr-4">{file.name}</span>
                <span className="text-gray-500 shrink-0">{formatFileSize(file.size)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex gap-2 p-4 border-t border-gray-200">
          <button
            onClick={onReject}
            className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Reject
          </button>
          <button
            onClick={() => onAccept(files.map((f) => f.id))}
            className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}
