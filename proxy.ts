import { NextResponse, type NextRequest } from "next/server";
import {
  INVITE_COOKIE,
  INVITE_MAX_AGE,
  INVITE_PARAM,
  gateDisabled,
  inviteCode,
  inviteToken,
  isValidCode,
  isValidCookie,
} from "@/lib/invite";

/** The page strangers see instead of the invitation. */
const LOCKED = "/soukrome";

// Reachable without the invitation key: the private edit link from the email carries
// its own secret token, so a guest on a new device can still change their answer.
const OPEN = [/^\/odpoved\/[^/]+$/, /^\/api\/rsvp\/edit$/, new RegExp(`^${LOCKED}$`)];

export function proxy(request: NextRequest) {
  if (gateDisabled()) return NextResponse.next();

  const { pathname, searchParams } = request.nextUrl;
  const key = searchParams.get(INVITE_PARAM);

  // The guest's link: remember this browser, then show the same page without the key.
  if (key !== null && isValidCode(key)) {
    const clean = request.nextUrl.clone();
    clean.searchParams.delete(INVITE_PARAM);
    const res = NextResponse.redirect(clean);
    res.cookies.set(INVITE_COOKIE, inviteToken(inviteCode()!), {
      httpOnly: true,
      secure: request.nextUrl.protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: INVITE_MAX_AGE,
    });
    return res;
  }

  if (isValidCookie(request.cookies.get(INVITE_COOKIE)?.value)) return NextResponse.next();
  if (OPEN.some((re) => re.test(pathname))) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { status: "error", reason: "forbidden" },
      { status: 403, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } },
    );
  }
  const locked = request.nextUrl.clone();
  locked.pathname = LOCKED;
  locked.search = "";
  return NextResponse.rewrite(locked, { status: 403 });
}

export const config = {
  // Everything except build assets, fonts and the robots file.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|.*\\.(?:png|jpg|svg|ico|woff2?)$).*)"],
};
