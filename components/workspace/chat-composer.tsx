"use client";

import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ChatComposerProps = {
  disabled: boolean;
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
};

export function ChatComposer({
  disabled,
  value,
  onChange,
  onSend,
}: ChatComposerProps) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-end gap-3">
        <div className="min-w-0 flex-1">
          <Label htmlFor="chat-message" className="mb-2 block">
            Chat
          </Label>
          <Textarea
            id="chat-message"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSend();
              }
            }}
            className="min-h-14 resize-none bg-white text-base leading-7"
            placeholder="Type your question or paste client/interviewer line. Press Enter to answer."
          />
        </div>
        <Button
          className="h-14 min-w-28 gap-2 bg-slate-950 text-white hover:bg-slate-800"
          disabled={disabled || !value.trim()}
          onClick={onSend}
          type="button"
        >
          <Send className="size-4" />
          Send
        </Button>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Press Enter to send. Use Shift + Enter for a new line.
      </p>
    </div>
  );
}
