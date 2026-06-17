import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deleteDocumentFromS3 } from "@/lib/s3";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ documentId: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { documentId } = await context.params;
  const document = await prisma.userDocument.findFirst({
    where: {
      id: documentId,
      userId: session.user.id,
    },
    select: {
      id: true,
      s3Bucket: true,
      s3Key: true,
    },
  });

  if (!document) {
    return Response.json({ error: "Document not found." }, { status: 404 });
  }

  await deleteDocumentFromS3({
    bucket: document.s3Bucket,
    key: document.s3Key,
  });

  await prisma.userDocument.delete({
    where: {
      id: document.id,
    },
  });

  return Response.json({ ok: true });
}
