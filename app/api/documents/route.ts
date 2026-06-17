import { auth } from "@/auth";
import { extractDocumentProfile } from "@/lib/document-extraction";
import { getDocumentsPrefix, uploadDocumentToS3 } from "@/lib/s3";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;
const ALLOWED_DOCUMENT_TYPES = ["resume", "reference"];

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const documents = await prisma.userDocument.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      contentType: true,
      createdAt: true,
      documentType: true,
      fileName: true,
      sizeBytes: true,
    },
  });

  return Response.json({ documents });
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const documentType = String(formData.get("documentType") ?? "");
    const clientExtractedText = String(formData.get("extractedText") ?? "").trim();

    if (!(file instanceof File)) {
      return Response.json({ error: "File is required." }, { status: 400 });
    }

    if (!ALLOWED_DOCUMENT_TYPES.includes(documentType)) {
      return Response.json(
        { error: "Document type must be resume or reference." },
        { status: 400 }
      );
    }

    if (!file.size || file.size > MAX_FILE_SIZE_BYTES) {
      return Response.json(
        { error: "Upload a file up to 8 MB." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = file.type || "application/octet-stream";
    const key = [
      getDocumentsPrefix(),
      session.user.id,
      documentType,
      `${Date.now()}-${sanitizeFileName(file.name)}`,
    ].join("/");

    const uploaded = await uploadDocumentToS3({
      body: buffer,
      contentType,
      key,
    });

    const document = await prisma.userDocument.create({
      data: {
        contentType,
        documentType,
        extractedText: normalizeExtractedText(clientExtractedText),
        fileName: file.name,
        s3Bucket: uploaded.bucket,
        s3Key: uploaded.key,
        sizeBytes: file.size,
        userId: session.user.id,
      },
      select: {
        id: true,
        contentType: true,
        createdAt: true,
        documentType: true,
        fileName: true,
        sizeBytes: true,
      },
    });
    const extractedText = await safeExtractDocumentProfile({
      buffer,
      contentType,
      documentType,
      fileName: file.name,
    });

    if (extractedText) {
      await prisma.userDocument.updateMany({
        data: {
          extractedText: normalizeExtractedText(extractedText),
        },
        where: {
          id: document.id,
          userId: session.user.id,
        },
      });
    }

    return Response.json({ document }, { status: 201 });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not upload document.",
      },
      { status: 500 }
    );
  }
}

async function safeExtractDocumentProfile(input: {
  buffer: Buffer;
  contentType: string;
  documentType: string;
  fileName: string;
}) {
  try {
    return await Promise.race([
      extractDocumentProfile({
        buffer: input.buffer,
        contentType: input.contentType,
        documentType: input.documentType,
        fileName: input.fileName,
      }),
      new Promise<string>((resolve) => {
        setTimeout(() => resolve(""), 10000);
      }),
    ]);
  } catch {
    return "";
  }
}

function sanitizeFileName(fileName: string) {
  return fileName
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function normalizeExtractedText(extractedText: string) {
  if (!extractedText) {
    return null;
  }

  return extractedText.slice(0, 12000);
}
