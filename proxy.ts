import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((request) => {
  const { pathname } = request.nextUrl;
  const isLoggedIn = Boolean(request.auth);
  const isLoginPage = pathname === "/login";
  const isAdminRoute = pathname.startsWith("/admin");

  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", request.nextUrl));
  }

  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/", request.nextUrl));
  }

  if (isLoggedIn && isAdminRoute && request.auth?.user?.role !== "admin") {
    return NextResponse.redirect(new URL("/", request.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
