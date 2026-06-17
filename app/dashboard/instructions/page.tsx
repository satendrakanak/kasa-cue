import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { InstructionsManager } from "@/components/dashboard/instructions/instructions-manager";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function InstructionsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role === "admin") {
    redirect("/admin");
  }

  const settings = await prisma.userInstructionSettings.upsert({
    where: {
      userId: session.user.id,
    },
    create: {
      userId: session.user.id,
    },
    update: {},
    select: {
      customInstructions: true,
      defaultLanguage: true,
      desiMode: true,
    },
  });

  return (
    <DashboardShell activeItem="instructions" user={session.user}>
      <div className="border-b border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950 sm:px-6">
        <span className="font-semibold">Instructions:</span> Saved preferences
        are applied automatically when you start a new session.
      </div>
      <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <InstructionsManager initialSettings={settings} />
      </div>
    </DashboardShell>
  );
}
