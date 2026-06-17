import {
  getDesktopAuthCookieName,
  getDesktopAuthMaxAge,
  verifyDesktopAuthToken,
} from "@/lib/desktop-auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const token = requestUrl.searchParams.get("token") ?? "";
  const payload = verifyDesktopAuthToken(token);

  if (!payload) {
    return NextResponse.redirect(new URL("/desktop", requestUrl.origin));
  }

  const response = NextResponse.redirect(new URL("/desktop", requestUrl.origin));

  response.cookies.set(getDesktopAuthCookieName(), token, {
    httpOnly: true,
    maxAge: getDesktopAuthMaxAge(),
    path: "/",
    sameSite: "lax",
    secure: requestUrl.protocol === "https:",
  });

  return response;
}
