"use client";

import { BriefcaseBusiness, Clock, Play, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { DesktopSessionType, DesktopSetupStep } from "./types";

const sessionTypes: Array<{
  description: string;
  duration: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  type: DesktopSessionType;
}> = [
  {
    description: "Technical, HR, behavioral, and follow-up answers.",
    duration: "Unlimited",
    icon: UserRound,
    label: "Interview",
    type: "interview",
  },
  {
    description: "Natural support for everyday conversation.",
    duration: "Unlimited",
    icon: Play,
    label: "Normal talk",
    type: "normal",
  },
  {
    description: "Professional updates, risks, and planning replies.",
    duration: "Unlimited",
    icon: BriefcaseBusiness,
    label: "Client call",
    type: "client",
  },
];

type SessionTypePanelProps = {
  onSelectType: (type: DesktopSessionType) => void;
  onStepChange: (step: DesktopSetupStep) => void;
  selectedType: DesktopSessionType;
};

export function SessionTypePanel({
  onSelectType,
  onStepChange,
  selectedType,
}: SessionTypePanelProps) {
  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1 text-sm font-semibold">
        <button className="rounded-xl bg-white py-2 shadow-sm" type="button">
          Create
        </button>
        <button
          className="rounded-xl py-2 text-slate-500 transition hover:bg-white/70 hover:text-slate-950"
          onClick={() => onStepChange("past")}
          type="button"
        >
          Past Sessions
        </button>
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-base font-semibold">Select Session Type</h2>
          <span className="grid size-5 place-items-center rounded-full border border-slate-300 text-xs text-slate-500">
            i
          </span>
        </div>
        <div className="grid gap-3">
          {sessionTypes.map((item) => {
            const Icon = item.icon;
            const isActive = item.type === selectedType;

            return (
              <button
              className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition ${
                isActive
                  ? "border-slate-950 bg-slate-50 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50 hover:text-slate-950"
                }`}
                key={item.type}
                onClick={() => onSelectType(item.type)}
                type="button"
              >
                <div className="flex items-center gap-3">
                  <Icon className="size-5 text-slate-900" />
                  <div>
                    <p className="font-semibold">{item.label}</p>
                    <p className="text-xs text-slate-500">{item.description}</p>
                  </div>
                </div>
                <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  <Clock className="size-3" />
                  {item.duration}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <Button
        className="h-11 w-full rounded-xl bg-slate-950 text-white hover:bg-slate-800 hover:text-white"
        onClick={() => onStepChange("details")}
        type="button"
      >
        Create Session
      </Button>
    </div>
  );
}
