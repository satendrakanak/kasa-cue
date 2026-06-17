import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type SaveInstructionsRequest = {
  customInstructions?: string;
  defaultLanguage?: string;
  desiMode?: boolean;
};

const ALLOWED_LANGUAGES = ["english", "hindi", "hinglish"];

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getOrCreateInstructionSettings(session.user.id);

  return Response.json({ settings });
}

export async function PUT(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as SaveInstructionsRequest;
  const customInstructions = body.customInstructions?.trim() ?? "";

  if (customInstructions.length > 2000) {
    return Response.json(
      { error: "Keep instructions under 2000 characters." },
      { status: 400 }
    );
  }

  const settings = await prisma.userInstructionSettings.upsert({
    where: {
      userId: session.user.id,
    },
    create: {
      customInstructions: customInstructions || null,
      defaultLanguage: normalizeLanguage(body.defaultLanguage),
      desiMode: body.desiMode ?? true,
      userId: session.user.id,
    },
    update: {
      customInstructions: customInstructions || null,
      defaultLanguage: normalizeLanguage(body.defaultLanguage),
      desiMode: body.desiMode ?? true,
    },
    select: {
      customInstructions: true,
      defaultLanguage: true,
      desiMode: true,
      updatedAt: true,
    },
  });

  return Response.json({ settings });
}

async function getOrCreateInstructionSettings(userId: string) {
  return prisma.userInstructionSettings.upsert({
    where: {
      userId,
    },
    create: {
      userId,
    },
    update: {},
    select: {
      customInstructions: true,
      defaultLanguage: true,
      desiMode: true,
      updatedAt: true,
    },
  });
}

function normalizeLanguage(value: string | undefined) {
  return ALLOWED_LANGUAGES.includes(value ?? "") ? value ?? "english" : "english";
}
