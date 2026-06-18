import { redirect } from "next/navigation";

import { DesktopOverlay } from "@/components/desktop/desktop-overlay";
import { getCurrentUser } from "@/lib/desktop-auth";
import { prisma } from "@/lib/prisma";

type DesktopOverlayPageProps = {
  searchParams: Promise<{
    sessionId?: string;
  }>;
};

export default async function DesktopOverlayPage({
  searchParams,
}: DesktopOverlayPageProps) {
  const user = await getCurrentUser();

  if (!user?.id) {
    redirect("/desktop");
  }

  const { sessionId = "" } = await searchParams;
  const session = sessionId
    ? await prisma.communicationSession.findFirst({
        where: {
          id: sessionId,
          userId: user.id,
        },
        select: {
          language: true,
          mode: true,
          model: true,
          tone: true,
        },
      })
    : null;

  return (
    <DesktopOverlay
      initialLanguage={session?.language ?? "english"}
      initialMode={session?.mode ?? "normal-talk"}
      initialModel={session?.model ?? "gpt-4o-mini"}
      initialSessionId={sessionId}
      initialTone={session?.tone ?? "adaptive-genuine"}
    />
  );
}
