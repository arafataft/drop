"use client";

import { useState, useRef, useEffect } from "react";

interface DeviceAliasInputProps {
  alias: string;
  onAliasChange: (alias: string) => void;
}

export function DeviceAliasInput({ alias, onAliasChange }: DeviceAliasInputProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(alias);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(alias);
  }, [alias]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== alias) {
      onAliasChange(trimmed);
    } else {
      setValue(alias);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSubmit}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
          if (e.key === "Escape") {
            setValue(alias);
            setEditing(false);
          }
        }}
        className="text-sm px-2 py-1 border border-blue-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
        maxLength={32}
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="text-sm px-2 py-1 rounded-md hover:bg-gray-100 text-gray-700 transition-colors"
      title="Click to edit alias"
    >
      {alias}
    </button>
  );
}
