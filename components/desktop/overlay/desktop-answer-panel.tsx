"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Grip,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";

type DesktopAnswerPanelProps = {
  canGoNext: boolean;
  canGoPrevious: boolean;
  copied: boolean;
  historyLabel: string;
  isGenerating: boolean;
  onClear: () => void;
  onCopy: () => void;
  onNext: () => void;
  onOpacityChange: (opacity: number) => void;
  onPrevious: () => void;
  opacity: number;
  reply: string;
};

export function DesktopAnswerPanel({
  canGoNext,
  canGoPrevious,
  copied,
  historyLabel,
  isGenerating,
  onClear,
  onCopy,
  onNext,
  onOpacityChange,
  onPrevious,
  opacity,
  reply,
}: DesktopAnswerPanelProps) {
  function startResize(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = window.innerWidth;
    const startHeight = window.innerHeight;

    function resize(moveEvent: globalThis.PointerEvent) {
      const width = startWidth + (moveEvent.clientX - startX);
      const height = startHeight + (moveEvent.clientY - startY);

      void window.kasaDesktop?.resizeOverlay?.({ height, width });
    }

    function stopResize() {
      window.removeEventListener("pointermove", resize);
      window.removeEventListener("pointerup", stopResize);
    }

    window.addEventListener("pointermove", resize);
    window.addEventListener("pointerup", stopResize, { once: true });
  }

  return (
    <section className="desktop-no-drag relative overflow-hidden rounded-2xl bg-slate-950/90 text-slate-100 shadow-2xl ring-1 ring-white/10 backdrop-blur">
      <div className="flex h-11 items-center justify-between border-b border-white/10 px-3">
        <div className="flex items-center gap-2 text-slate-400">
          <button
            aria-label="Previous result"
            className="grid size-7 place-items-center rounded-lg transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-slate-400"
            disabled={!canGoPrevious}
            onClick={onPrevious}
            type="button"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            aria-label="Next result"
            className="grid size-7 place-items-center rounded-lg transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-slate-400"
            disabled={!canGoNext}
            onClick={onNext}
            type="button"
          >
            <ChevronRight className="size-4" />
          </button>
          {historyLabel ? (
            <span className="min-w-9 rounded-lg bg-white/5 px-2 py-1 text-center text-[11px] font-semibold text-slate-300">
              {historyLabel}
            </span>
          ) : null}
          <button
            aria-label="Clear result"
            className="grid size-7 place-items-center rounded-lg transition hover:bg-white/10 hover:text-white"
            onClick={onClear}
            type="button"
          >
            <ChevronDown className="size-4" />
          </button>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          <span>Opacity</span>
          <input
            className="accent-amber-500"
            max="1"
            min="0.35"
            step="0.05"
            type="range"
            value={opacity}
            onChange={(event) => onOpacityChange(Number(event.target.value))}
          />
          <span>{Math.round(opacity * 100)}%</span>
          <Button
            className="size-8 rounded-xl bg-slate-900 p-0 text-slate-300 hover:bg-slate-800"
            onClick={onCopy}
            type="button"
            variant="ghost"
          >
            <Clipboard className={`size-4 ${copied ? "text-emerald-300" : ""}`} />
          </Button>
          <Button
            className="size-8 rounded-xl bg-slate-900 p-0 text-slate-400 hover:bg-slate-800"
            onClick={onClear}
            type="button"
            variant="ghost"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <div className="h-[calc(100vh-150px)] min-h-[240px] overflow-y-auto p-5">
        {isGenerating && !reply ? (
          <div className="text-slate-500">Thinking...</div>
        ) : (
          <AnswerContent text={reply} />
        )}
      </div>
      <button
        aria-label="Resize answer window"
        className="absolute bottom-2 right-2 grid size-8 cursor-nwse-resize place-items-center rounded-xl bg-slate-900/90 text-slate-400 ring-1 ring-white/10 transition hover:bg-slate-800 hover:text-white"
        onPointerDown={startResize}
        type="button"
      >
        <Grip className="size-4 rotate-45" />
      </button>
    </section>
  );
}

function AnswerContent({ text }: { text: string }) {
  const blocks = parseFencedBlocks(text);

  return (
    <div className="space-y-5 text-[15px] leading-7 text-slate-200">
      {blocks.map((block, index) =>
        block.type === "code" ? (
          <div
            className="overflow-hidden rounded-xl border border-cyan-400/20 bg-slate-950 shadow-lg shadow-cyan-950/20"
            key={`${block.type}-${index}`}
          >
            <div className="border-b border-cyan-400/10 bg-slate-900 px-4 py-2 text-xs font-bold uppercase tracking-widest text-cyan-300">
              {block.language || "Code"}
            </div>
            <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-6 text-slate-100">
              <code>{block.content.trimEnd()}</code>
            </pre>
          </div>
        ) : (
          <RichTextBlock content={block.content} key={`${block.type}-${index}`} />
        )
      )}
    </div>
  );
}

function RichTextBlock({ content }: { content: string }) {
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <div className="space-y-3.5">
      {lines.map((line, index) => {
        const heading = parseHeading(line);
        const bullet = parseBullet(line);

        if (heading) {
          return (
            <h3
              className="border-l-2 border-cyan-300 pl-3 text-base font-semibold text-white"
              key={`${line}-${index}`}
            >
              {renderInline(heading)}
            </h3>
          );
        }

        if (bullet) {
          return (
            <div
              className="grid grid-cols-[18px_1fr] gap-2 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2"
              key={`${line}-${index}`}
            >
              <span className="mt-2 size-1.5 rounded-full bg-emerald-300" />
              <p>{renderInline(bullet)}</p>
            </div>
          );
        }

        return (
          <p className="text-slate-200" key={`${line}-${index}`}>
            {renderInline(line)}
          </p>
        );
      })}
    </div>
  );
}

function parseHeading(line: string) {
  const markdownHeading = line.match(/^#{1,3}\s+(.+)$/);

  if (markdownHeading?.[1]) {
    return markdownHeading[1].trim();
  }

  const compactHeading = line.match(/^\*\*(.{2,60})\*\*:?\s*$/);

  if (compactHeading?.[1]) {
    return compactHeading[1].trim();
  }

  if (/^[A-Z][A-Za-z\s/,-]{2,42}:$/.test(line)) {
    return line.slice(0, -1).trim();
  }

  return null;
}

function parseBullet(line: string) {
  const bullet = line.match(/^[-*•]\s+(.+)$/);

  if (bullet?.[1]) {
    return bullet[1].trim();
  }

  const numbered = line.match(/^\d+[.)]\s+(.+)$/);

  return numbered?.[1]?.trim() ?? null;
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong
          className="rounded-md bg-amber-300/15 px-1 font-semibold text-amber-200"
          key={`${part}-${index}`}
        >
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          className="rounded-md border border-cyan-300/15 bg-cyan-300/10 px-1.5 py-0.5 font-mono text-[0.9em] text-cyan-200"
          key={`${part}-${index}`}
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    return <HighlightImportantWords key={`${part}-${index}`} text={part} />;
  });
}

function HighlightImportantWords({ text }: { text: string }) {
  const pattern =
    /\b(API|React|Next\.js|Node|TypeScript|JavaScript|SQL|database|error|bug|fix|approach|solution|answer|important|key|complexity|edge case|performance|security|resume|experience|project|manager|client|update|deadline|clarify|follow-up|status|priority|meeting|call|today|tomorrow|blocker|risk)\b/gi;
  const exactPattern =
    /^(API|React|Next\.js|Node|TypeScript|JavaScript|SQL|database|error|bug|fix|approach|solution|answer|important|key|complexity|edge case|performance|security|resume|experience|project|manager|client|update|deadline|clarify|follow-up|status|priority|meeting|call|today|tomorrow|blocker|risk)$/i;
  const parts = text.split(pattern).filter(Boolean);

  return parts.map((part, index) =>
    exactPattern.test(part) ? (
      <span className="font-semibold text-emerald-200" key={`${part}-${index}`}>
        {part}
      </span>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    )
  );
}

type ParsedBlock =
  | { content: string; type: "text" }
  | { content: string; language: string; type: "code" };

function parseFencedBlocks(text: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  const fencePattern = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = fencePattern.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index).trim();

    if (before) {
      blocks.push({ content: before, type: "text" });
    }

    blocks.push({
      content: match[2] ?? "",
      language: match[1] ?? "code",
      type: "code",
    });
    lastIndex = match.index + match[0].length;
  }

  const remaining = text.slice(lastIndex).trim();

  if (remaining || blocks.length === 0) {
    blocks.push({ content: remaining || text, type: "text" });
  }

  return blocks;
}
