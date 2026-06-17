"use client";

import { LogOut, Mic, Sparkles, Timer, WandSparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type SessionTopBarProps = {
  autoAnswer: boolean;
  canAnswer: boolean;
  durationLabel: string;
  isGenerating: boolean;
  isListening: boolean;
  listenStatus: string;
  onAnswer: () => void;
  onAutoAnswerChange: (enabled: boolean) => void;
  onEnd: () => void;
};

export function SessionTopBar({
  autoAnswer,
  canAnswer,
  durationLabel,
  isGenerating,
  isListening,
  listenStatus,
  onAnswer,
  onAutoAnswerChange,
  onEnd,
}: SessionTopBarProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <Badge
          className={
            isListening
              ? "h-10 gap-2 bg-emerald-600 px-4 text-white hover:bg-emerald-600"
              : "h-10 gap-2 bg-slate-900 px-4 text-white hover:bg-slate-900"
          }
        >
          <Mic className={isListening ? "size-4 animate-pulse" : "size-4"} />
          {listenStatus}
        </Badge>

        <div className="flex items-center gap-3">
          <div className="flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3">
            <Switch
              checked={autoAnswer}
              onCheckedChange={onAutoAnswerChange}
              size="sm"
            />
            <Label className="text-sm font-semibold text-slate-800">
              Auto answer
            </Label>
          </div>

          <Badge className="h-10 gap-2 bg-slate-100 px-4 text-slate-900 hover:bg-slate-100">
            <Timer className="size-4" />
            {durationLabel}
          </Badge>

          <Button
            className="h-10 min-w-32 gap-2"
            onClick={onEnd}
            type="button"
            variant="outline"
          >
            <LogOut className="size-4" />
            End session
          </Button>

          <Button
            className="h-10 min-w-32 gap-2 bg-slate-950 text-white hover:bg-slate-800"
            disabled={isGenerating || !canAnswer}
            onClick={onAnswer}
            type="button"
          >
            {isGenerating ? (
              <Sparkles className="size-4 animate-pulse" />
            ) : (
              <WandSparkles className="size-4" />
            )}
            Answer
          </Button>
        </div>
      </div>
    </header>
  );
}
