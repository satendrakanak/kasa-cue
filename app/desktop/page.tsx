import { DesktopLoginPrompt } from "@/components/desktop/desktop-login-prompt";
import { DesktopSessionLauncher } from "@/components/desktop/desktop-session-launcher";
import { getCurrentUser } from "@/lib/desktop-auth";
import { prisma } from "@/lib/prisma";

export default async function DesktopPage() {
  const user = await getCurrentUser();

  if (!user?.id) {
    return <DesktopLoginPrompt />;
  }

  const documents = await prisma.userDocument.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      contentType: true,
      createdAt: true,
      documentType: true,
      fileName: true,
      id: true,
      sizeBytes: true,
    },
  });

  return (
    <DesktopSessionLauncher
      documents={documents.map((document) => ({
        ...document,
        createdAt: document.createdAt.toISOString(),
      }))}
      userName={user.name ?? "Kasa User"}
    />
  );
}
