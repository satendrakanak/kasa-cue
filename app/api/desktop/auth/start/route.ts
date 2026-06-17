import { auth } from "@/auth";
import { createDesktopAuthToken } from "@/lib/desktop-auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  const requestUrl = new URL(request.url);

  if (!session?.user?.id || !session.user.email) {
    const loginUrl = new URL("/login", requestUrl.origin);
    loginUrl.searchParams.set("callbackUrl", "/api/desktop/auth/start");

    return NextResponse.redirect(loginUrl);
  }

  const token = createDesktopAuthToken({
    email: session.user.email,
    exp: 0,
    id: session.user.id,
    name: session.user.name ?? null,
    role: session.user.role,
  });
  const appUrl = new URL("kasa-cue://auth");
  appUrl.searchParams.set("token", token);

  return NextResponse.redirect(appUrl);
}
