import { getCurrentUser } from "@/lib/desktop-auth";
import { prisma } from "@/lib/prisma";
import { buildSessionContextMemory } from "@/lib/session-context-memory";

type SaveTurnRequest = {
  content?: string;
  model?: string;
  speaker?: "other" | "user" | "assistant";
};

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  const user = await getCurrentUser();

  if (!user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await context.params;
  const body = (await request.json()) as SaveTurnRequest;
  const content = body.content?.trim() ?? "";
  const speaker = body.speaker ?? "user";

  if (!content) {
    return Response.json({ error: "Content is required" }, { status: 400 });
  }

  const owningSession = await prisma.communicationSession.findFirst({
    where: {
      id: sessionId,
      userId: user.id,
    },
    select: {
      id: true,
    },
  });

  if (!owningSession) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  const turn = await prisma.communicationTurn.create({
    data: {
      content,
      model: body.model || null,
      sessionId,
      speaker,
    },
    select: {
      id: true,
      createdAt: true,
      speaker: true,
    },
  });
  const recentTurns = await prisma.communicationTurn.findMany({
    where: {
      sessionId,
    },
    orderBy: {
      createdAt: "asc",
    },
    take: 30,
    select: {
      content: true,
      speaker: true,
    },
  });
  const contextMemory = buildSessionContextMemory(recentTurns);

  await prisma.communicationSession.updateMany({
    data: {
      context: contextMemory,
    },
    where: {
      id: sessionId,
      userId: user.id,
    },
  });

  return Response.json({ turn });
}
