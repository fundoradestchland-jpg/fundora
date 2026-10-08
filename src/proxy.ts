import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { sessionCookieName } from "@/lib/session-cookie";

export function proxy(request: NextRequest) {
  if (request.cookies.get(sessionCookieName)?.value) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard", "/dashboard/:path*", "/pret/demande", "/dons/demande"],
};
