"use client";

import { ArrowLeft, Clock3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { DesktopSetupStep } from "./types";

type PastSessionsPanelProps = {
  onStepChange: (step: DesktopSetupStep) => void;
};

export function PastSessionsPanel({ onStepChange }: PastSessionsPanelProps) {
  return (
    <div className="space-y-5 p-5">
      <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1 text-sm font-semibold">
        <button
          className="rounded-xl py-2.5 text-slate-500"
          onClick={() => onStepChange("home")}
          type="button"
        >
          Create
        </button>
        <button className="rounded-xl bg-white py-2.5 shadow-sm" type="button">
          Past Sessions
        </button>
      </div>

      <div className="rounded-2xl border border-dashed border-slate-200 px-5 py-10 text-center">
        <Clock3 className="mx-auto mb-3 size-8 text-slate-400" />
        <h2 className="text-base font-semibold">No desktop sessions yet</h2>
        <p className="mt-1 text-sm text-slate-500">
          Completed sessions will stay available in your dashboard history.
        </p>
      </div>

      <Button
        className="h-12 w-full rounded-xl gap-2"
        onClick={() => onStepChange("home")}
        type="button"
        variant="outline"
      >
        <ArrowLeft className="size-4" />
        Back
      </Button>
    </div>
  );
}
