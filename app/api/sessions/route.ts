import { getCurrentUser } from "@/lib/desktop-auth";
import { prisma } from "@/lib/prisma";

type CreateSessionRequest = {
  context?: string;
  instructions?: string;
  language?: string;
  mode?: string;
  model?: string;
  referenceDocumentIds?: string[];
  referenceFiles?: string[];
  resumeDocumentId?: string;
  resumeFileName?: string;
  title?: string;
  tone?: string;
};

export async function GET() {
  const user = await getCurrentUser();

  if (!user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessions = await prisma.communicationSession.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      startedAt: "desc",
    },
    take: 20,
    select: {
      id: true,
      title: true,
      mode: true,
      model: true,
      language: true,
      startedAt: true,
      endedAt: true,
      resumeFileName: true,
      referenceFiles: true,
      _count: {
        select: {
          turns: true,
        },
      },
    },
  });

  return Response.json({ sessions });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as CreateSessionRequest;
  const instructionSettings = await prisma.userInstructionSettings.findUnique({
    where: {
      userId: user.id,
    },
    select: {
      customInstructions: true,
      defaultLanguage: true,
      desiMode: true,
    },
  });
  const savedInstructions = buildSavedInstructions(instructionSettings);
  const communicationSession = await prisma.communicationSession.create({
    data: {
      context: body.context?.trim() || null,
      instructions: [body.instructions?.trim(), savedInstructions]
        .filter(Boolean)
        .join("\n\n") || null,
      language:
        body.language && body.language !== "auto"
          ? body.language
          : instructionSettings?.defaultLanguage ?? "auto",
      mode: body.mode || "client-call",
      model: body.model || "gpt-4o-mini",
      referenceDocumentIds: body.referenceDocumentIds?.length
        ? body.referenceDocumentIds
        : undefined,
      referenceFiles: body.referenceFiles?.length ? body.referenceFiles : undefined,
      resumeDocumentId: body.resumeDocumentId?.trim() || null,
      resumeFileName: body.resumeFileName?.trim() || null,
      title: body.title?.trim() || createDefaultTitle(body.mode),
      tone: body.tone?.trim() || "adaptive-genuine",
      userId: user.id,
    },
    select: {
      id: true,
      title: true,
      startedAt: true,
    },
  });

  return Response.json({ session: communicationSession });
}

function createDefaultTitle(mode: string | undefined) {
  if (mode === "interview") {
    return "Interview session";
  }

  if (mode === "normal-talk") {
    return "Normal talk session";
  }

  return "Client call session";
}

function buildSavedInstructions(
  settings: {
    customInstructions: string | null;
    defaultLanguage: string;
    desiMode: boolean;
  } | null
) {
  if (!settings) {
    return "";
  }

  return [
    settings.desiMode
      ? "Desi mode: make answers sound natural for Indian professional conversations."
      : "",
    settings.customInstructions
      ? `Saved user instructions: ${settings.customInstructions}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}
