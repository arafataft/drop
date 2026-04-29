"use client";

interface ConnectionStatusProps {
  isConnected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function ConnectionStatus({ isConnected, onConnect, onDisconnect }: ConnectionStatusProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <div
          className={`w-2.5 h-2.5 rounded-full ${
            isConnected ? "bg-green-500" : "bg-gray-400"
          }`}
        />
        <span className="text-sm text-gray-600">
          {isConnected ? "Connected" : "Disconnected"}
        </span>
      </div>
      <button
        onClick={isConnected ? onDisconnect : onConnect}
        className={`text-sm px-3 py-1 rounded-md border transition-colors ${
          isConnected
            ? "border-red-300 text-red-600 hover:bg-red-50"
            : "border-blue-300 text-blue-600 hover:bg-blue-50"
        }`}
      >
        {isConnected ? "Disconnect" : "Connect"}
      </button>
    </div>
  );
}
