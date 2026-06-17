import { redirect } from "next/navigation";

import { DesktopOverlay } from "@/components/desktop/desktop-overlay";
import { getCurrentUser } from "@/lib/desktop-auth";

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

  return <DesktopOverlay initialSessionId={sessionId} />;
}
