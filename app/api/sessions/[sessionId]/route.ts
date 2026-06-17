import { getCurrentUser } from "@/lib/desktop-auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  const user = await getCurrentUser();

  if (!user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await context.params;
  const updatedSession = await prisma.communicationSession.updateMany({
    where: {
      id: sessionId,
      userId: user.id,
    },
    data: {
      endedAt: new Date(),
    },
  });

  if (!updatedSession.count) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  return Response.json({ ok: true });
}
