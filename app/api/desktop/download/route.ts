import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

export const runtime = "nodejs";

const DOWNLOADS: Record<
  string,
  {
    contentType: string;
    fileName: string;
    paths: string[];
  }
> = {
  "mac-arm64": {
    contentType: "application/x-apple-diskimage",
    fileName: "Kasa-Cue-mac-arm64.dmg",
    paths: [
      path.join(process.cwd(), "desktop-downloads", "Kasa-Cue-mac-arm64.dmg"),
      path.join(process.cwd(), "desktop-downloads", "Kasa Cue-arm64.dmg"),
      path.join(process.cwd(), "dist", "Kasa-Cue-mac-arm64.dmg"),
      path.join(process.cwd(), "dist", "Kasa Cue-arm64.dmg"),
      path.join(process.cwd(), "dist", "mac-arm64", "Kasa Cue.app.zip"),
    ],
  },
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform") ?? "mac-arm64";
  const download = DOWNLOADS[platform];

  if (!download) {
    return Response.json(
      { error: "This desktop build is not available yet." },
      { status: 404 }
    );
  }

  const filePath = download.paths.find((candidatePath) =>
    existsSync(candidatePath)
  );

  if (!filePath) {
    return Response.json(
      {
        error:
          "Mac M-series desktop build is not packaged yet. Run npm run desktop:pack, then place the generated DMG in desktop-downloads/Kasa-Cue-mac-arm64.dmg.",
      },
      { status: 404 }
    );
  }

  const fileStats = await stat(filePath);
  const fileStream = Readable.toWeb(createReadStream(filePath)) as BodyInit;

  return new Response(fileStream, {
    headers: {
      "Content-Disposition": `attachment; filename="${download.fileName}"`,
      "Content-Length": String(fileStats.size),
      "Content-Type": download.contentType,
    },
  });
}
