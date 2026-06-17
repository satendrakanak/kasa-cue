import { auth, type AppRole } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const DESKTOP_AUTH_COOKIE = "kasa_desktop_token";
const DESKTOP_AUTH_TTL_SECONDS = 12 * 60 * 60;

type DesktopTokenPayload = {
  email: string;
  exp: number;
  id: string;
  name: string | null;
  role: AppRole;
};

export type CurrentUser = DesktopTokenPayload;

export function getDesktopAuthCookieName() {
  return DESKTOP_AUTH_COOKIE;
}

export function getDesktopAuthMaxAge() {
  return DESKTOP_AUTH_TTL_SECONDS;
}

export function createDesktopAuthToken(user: CurrentUser) {
  const payload: DesktopTokenPayload = {
    ...user,
    exp: Math.floor(Date.now() / 1000) + DESKTOP_AUTH_TTL_SECONDS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();

  if (session?.user?.id && session.user.email) {
    return {
      email: session.user.email,
      exp: Math.floor(Date.now() / 1000) + DESKTOP_AUTH_TTL_SECONDS,
      id: session.user.id,
      name: session.user.name ?? null,
      role: session.user.role,
    };
  }

  const token = (await cookies()).get(DESKTOP_AUTH_COOKIE)?.value;
  const payload = verifyDesktopAuthToken(token);

  if (!payload) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: payload.id,
    },
    select: {
      email: true,
      id: true,
      name: true,
      role: true,
    },
  });

  if (!user) {
    return null;
  }

  return {
    email: user.email,
    exp: payload.exp,
    id: user.id,
    name: user.name,
    role: user.role.toLowerCase() as AppRole,
  };
}

export function verifyDesktopAuthToken(token: string | undefined) {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signPayload(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as DesktopTokenPayload;

    if (!payload.id || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function signPayload(encodedPayload: string) {
  const secret =
    process.env.AUTH_SECRET ??
    "kasa-cue-local-dev-secret-change-before-production";

  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}
