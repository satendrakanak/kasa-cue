"use client";

import { Mic } from "lucide-react";

type LiveTranscriptStripProps = {
  liveTranscript: string;
  transcript: string;
};

export function LiveTranscriptStrip({
  liveTranscript,
  transcript,
}: LiveTranscriptStripProps) {
  const text =
    liveTranscript ||
    getLastTranscriptLine(transcript) ||
    "Listening for the conversation. Spoken text will appear here.";

  return (
    <section className="rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-slate-950 text-white">
          <Mic className="size-3.5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Live transcript
          </p>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-800">
            {text}
          </p>
        </div>
      </div>
    </section>
  );
}

function getLastTranscriptLine(transcript: string) {
  return transcript
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .at(-1);
}
