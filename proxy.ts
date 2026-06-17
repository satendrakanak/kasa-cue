import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((request) => {
  const { pathname } = request.nextUrl;
  const isLoggedIn = Boolean(request.auth);
  const isLoginPage = pathname === "/login";
  const isSignupPage = pathname === "/signup";
  const isAdminRoute = pathname.startsWith("/admin");
  const isPublicRoute =
    pathname === "/" ||
    pathname === "/pricing" ||
    pathname === "/compare-plans" ||
    pathname === "/how-it-works" ||
    isLoginPage ||
    isSignupPage;

  if (!isLoggedIn && !isPublicRoute) {
    const loginUrl = new URL("/login", request.nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && (isLoginPage || isSignupPage)) {
    const target = request.auth?.user?.role === "admin" ? "/admin" : "/dashboard";
    return NextResponse.redirect(new URL(target, request.nextUrl));
  }

  if (isLoggedIn && isAdminRoute && request.auth?.user?.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
