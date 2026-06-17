import {
  BriefcaseBusiness,
  FileText,
  MessageSquareText,
  Play,
  Settings2,
  UserRoundCheck,
  WandSparkles,
} from "lucide-react";

export const sessionModes = [
  {
    id: "interview",
    title: "Interview",
    description: "Technical, HR, behavioral, and follow-up answers.",
    icon: UserRoundCheck,
    accent: "border-indigo-300 bg-indigo-50 text-indigo-700",
  },
  {
    id: "normal-talk",
    title: "Normal talk",
    description: "Everyday English, meeting replies, and confidence support.",
    icon: MessageSquareText,
    accent: "border-emerald-300 bg-emerald-50 text-emerald-700",
  },
  {
    id: "client-call",
    title: "Client call",
    description: "Short professional answers for updates, risks, and planning.",
    icon: BriefcaseBusiness,
    accent: "border-amber-300 bg-amber-50 text-amber-800",
  },
] as const;

export const setupSteps = [
  {
    label: "Optional",
    title: "Add profile context",
    body: "Resume, project notes, or meeting background.",
    action: "Attach in setup",
    icon: FileText,
  },
  {
    label: "Step 1",
    title: "Choose session mode",
    body: "Interview, client call, or normal conversation.",
    action: "Choose mode",
    icon: WandSparkles,
  },
  {
    label: "Step 2",
    title: "Tune answers",
    body: "Language, model, and saved context.",
    action: "Configure",
    icon: Settings2,
  },
  {
    label: "Step 3",
    title: "Start live session",
    body: "Open transcript, suggested replies, and timer.",
    action: "Start",
    icon: Play,
  },
];

export type SessionModeId = (typeof sessionModes)[number]["id"];
