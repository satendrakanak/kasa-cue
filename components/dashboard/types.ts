import type { UserDocumentSummary, WorkspaceUser } from "@/components/workspace/types";

export type DashboardSessionSummary = {
  id: string;
  endedAt: string | null;
  mode: string;
  model: string;
  startedAt: string;
  title: string | null;
  turnsCount: number;
};

export type DashboardProps = {
  documents: UserDocumentSummary[];
  sessions: DashboardSessionSummary[];
  user: WorkspaceUser;
};
