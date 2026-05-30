import { auth } from "@/auth";

/**
 * Route protection (Next 16 "proxy" convention, formerly "middleware").
 * Unauthenticated users hitting app routes are redirected to /login. API auth
 * routes and static assets are excluded via the matcher.
 */
export default auth((req) => {
  const isLoggedIn = Boolean(req.auth?.accountId);
  const path = req.nextUrl.pathname;
  const isPublic = path === "/login" || path.startsWith("/api/auth");

  if (!isLoggedIn && !isPublic) {
    const url = new URL("/login", req.nextUrl.origin);
    return Response.redirect(url);
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
