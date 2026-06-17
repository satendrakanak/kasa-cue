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
    relativePaths: string[];
  }
> = {
  "mac-arm64": {
    contentType: "application/x-apple-diskimage",
    fileName: "Kasa-Cue-mac-arm64.dmg",
    relativePaths: [
      path.join("desktop-downloads", "Kasa-Cue-mac-arm64.dmg"),
      path.join("desktop-downloads", "Kasa Cue-arm64.dmg"),
      path.join("dist", "Kasa-Cue-mac-arm64.dmg"),
      path.join("dist", "Kasa Cue-arm64.dmg"),
      path.join("dist", "mac-arm64", "Kasa Cue.app.zip"),
    ],
  },
};

function getSearchRoots() {
  return Array.from(
    new Set(
      [
        process.cwd(),
        process.env.KASA_CUE_ROOT,
        process.env.APP_ROOT,
        "/var/www/kasa-cue",
        "/home/ubuntu",
      ].filter(Boolean) as string[]
    )
  );
}

async function resolveDownload(request: Request) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform") ?? "mac-arm64";
  const download = DOWNLOADS[platform];

  if (!download) {
    return Response.json(
      { error: "This desktop build is not available yet." },
      { status: 404 }
    );
  }

  const filePath = getSearchRoots()
    .flatMap((root) =>
      download.relativePaths.map((relativePath) => path.join(root, relativePath))
    )
    .find((candidatePath) => existsSync(candidatePath));

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
  return { download, filePath, fileStats };
}

export async function GET(request: Request) {
  const resolved = await resolveDownload(request);

  if (resolved instanceof Response) {
    return resolved;
  }

  const { download, filePath, fileStats } = resolved;
  const fileStream = Readable.toWeb(createReadStream(filePath)) as BodyInit;

  return new Response(fileStream, {
    headers: {
      "Content-Disposition": `attachment; filename="${download.fileName}"`,
      "Content-Length": String(fileStats.size),
      "Content-Type": download.contentType,
    },
  });
}

export async function HEAD(request: Request) {
  const resolved = await resolveDownload(request);

  if (resolved instanceof Response) {
    return new Response(null, {
      headers: resolved.headers,
      status: resolved.status,
      statusText: resolved.statusText,
    });
  }

  const { download, fileStats } = resolved;
  return new Response(null, {
    headers: {
      "Content-Disposition": `attachment; filename="${download.fileName}"`,
      "Content-Length": String(fileStats.size),
      "Content-Type": download.contentType,
    },
  });
}
