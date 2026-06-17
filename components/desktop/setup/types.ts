import type { UserDocumentSummary } from "@/components/workspace/types";

export type DesktopSetupStep = "home" | "details" | "audio" | "past";

export type DesktopSessionType = "interview" | "normal" | "client";

export type DesktopSessionDraft = {
  autoAnswer: boolean;
  company: string;
  humanize: boolean;
  instructions: string;
  language: string;
  model: string;
  position: string;
  referenceDocumentIds: string[];
  resumeDocumentId: string;
  sessionType: DesktopSessionType;
};

export type DesktopDocumentGroups = {
  references: UserDocumentSummary[];
  resumes: UserDocumentSummary[];
};
