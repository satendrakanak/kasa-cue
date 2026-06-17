import { auth } from "@/auth";
import type { ActiveWorkspaceSession } from "@/components/workspace/types";
import CopilotApp from "@/components/copilot-app";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

type WorkspacePageProps = {
  searchParams: Promise<{
    sessionId?: string;
  }>;
};

export default async function WorkspacePage({ searchParams }: WorkspacePageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { sessionId } = await searchParams;

  if (!sessionId) {
    redirect("/dashboard");
  }

  let activeSession = await prisma.communicationSession.findFirst({
    where: {
      id: sessionId,
      userId: session.user.id,
    },
    select: {
      id: true,
      context: true,
      instructions: true,
      language: true,
      mode: true,
      model: true,
      referenceDocumentIds: true,
      referenceFiles: true,
      resumeDocumentId: true,
      resumeFileName: true,
      startedAt: true,
      title: true,
      tone: true,
    },
  });

  if (!activeSession) {
    redirect("/dashboard");
  }

  if (
    activeSession.mode === "interview" &&
    !activeSession.resumeDocumentId
  ) {
    const latestResume = await prisma.userDocument.findFirst({
      where: {
        documentType: "resume",
        userId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        fileName: true,
        id: true,
      },
    });

    if (latestResume) {
      await prisma.communicationSession.update({
        data: {
          resumeDocumentId: latestResume.id,
          resumeFileName: latestResume.fileName,
        },
        where: {
          id: activeSession.id,
        },
      });

      activeSession = {
        ...activeSession,
        resumeDocumentId: latestResume.id,
        resumeFileName: latestResume.fileName,
      };
    }
  }

  return (
    <CopilotApp
      activeSession={{
        ...activeSession,
        mode: normalizeMode(activeSession.mode),
        referenceDocumentIds: normalizeStringArray(
          activeSession.referenceDocumentIds
        ),
        referenceFiles: normalizeStringArray(activeSession.referenceFiles),
        startedAt: activeSession.startedAt.toISOString(),
      }}
      user={session.user}
    />
  );
}

function normalizeMode(value: string): ActiveWorkspaceSession["mode"] {
  if (
    value === "interview" ||
    value === "normal-talk" ||
    value === "client-call"
  ) {
    return value;
  }

  return "client-call";
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}
