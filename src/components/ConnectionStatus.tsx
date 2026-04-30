"use client";

interface ConnectionStatusProps {
  isConnected: boolean;
  onReconnect: () => void;
}

export function ConnectionStatus({ isConnected, onReconnect }: ConnectionStatusProps) {
  return (
    <button
      onClick={onReconnect}
      className="flex items-center gap-2 group"
      title={isConnected ? "Connected - click to reconnect" : "Disconnected - click to reconnect"}
    >
      <div
        className={`w-2 h-2 rounded-full transition-colors ${
          isConnected ? "bg-[var(--success)] animate-pulse-dot" : "bg-[var(--danger)]"
        }`}
      />
      <span className="text-xs text-[var(--muted)] hidden sm:inline">
        {isConnected ? "Connected" : "Offline"}
      </span>
      <svg
        className="w-3.5 h-3.5 text-[var(--muted)] group-hover:text-[var(--foreground)] transition-colors"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
    </button>
  );
}
