"use client";

import type { TransferSession } from "@/types/transfer";
import { FileProgress } from "./FileProgress";

interface TransferListProps {
  sessions: TransferSession[];
}

export function TransferList({ sessions }: TransferListProps) {
  if (sessions.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-700">Transfers</h3>
      {sessions.map((session) => (
        <div
          key={session.id}
          className="border border-gray-200 rounded-lg p-3"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-700">
              {session.direction === "sending" ? "Sending to" : "Receiving from"}{" "}
              <strong>{session.peerAlias}</strong>
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                session.status === "completed"
                  ? "bg-green-100 text-green-700"
                  : session.status === "failed"
                  ? "bg-red-100 text-red-700"
                  : session.status === "rejected"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {session.status}
            </span>
          </div>
          <div className="space-y-1">
            {Array.from(session.fileProgress.values()).map((fp) => (
              <FileProgress key={fp.fileId} progress={fp} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
