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
        className="text-sm px-2.5 py-1 rounded-lg bg-[var(--card)] border border-[var(--accent)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] w-28"
        maxLength={32}
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="text-sm px-2.5 py-1 rounded-lg hover:bg-[var(--card)] text-[var(--foreground)] transition-colors font-medium"
      title="Click to edit name"
    >
      {alias}
    </button>
  );
}
