"use client";

import { CornerDownLeft, X } from "lucide-react";

type DesktopChatBarProps = {
  disabled?: boolean;
  onChange: (value: string) => void;
  onClose: () => void;
  onSend: () => void;
  value: string;
};

export function DesktopChatBar({
  disabled = false,
  onChange,
  onClose,
  onSend,
  value,
}: DesktopChatBarProps) {
  const canSend = value.trim().length > 0 && !disabled;

  return (
    <div className="desktop-no-drag flex h-12 items-center gap-2 rounded-2xl bg-slate-950/85 px-3 text-sm text-slate-100 shadow-2xl ring-1 ring-white/10 backdrop-blur">
      <input
        className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-slate-500"
        disabled={disabled}
        placeholder="Enter a message..."
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            if (canSend) {
              onSend();
            }
          }
        }}
      />
      <button
        className="inline-flex h-8 shrink-0 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-45"
        disabled={!canSend}
        onClick={onSend}
        type="button"
      >
        Send
        <CornerDownLeft className="size-3.5" />
      </button>
      <button
        className="grid size-8 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-white/10 hover:text-white"
        onClick={onClose}
        type="button"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
