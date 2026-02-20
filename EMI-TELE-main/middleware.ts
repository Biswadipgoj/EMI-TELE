import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = {
  name: string;
  value: string;
  options?: CookieOptions;
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes — no auth needed
  const publicRoutes = ["/login", "/customer"];
  if (publicRoutes.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  // API routes that don't need session check
  if (pathname.startsWith("/api/customer-login")) {
    return NextResponse.next();
  }

  // Create an initial response
  let response = NextResponse.next();

  // ✅ Anti-stale-cache headers for protected routes
  // Helps prevent browsers/CDNs showing old authenticated pages or old data.
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          // Important: In middleware, request cookies are read-only in many runtimes.
          // We should only set cookies on the response.
          response = NextResponse.next();
          response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
          response.headers.set("Pragma", "no-cache");
          response.headers.set("Expires", "0");

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Ensure profile exists (older accounts might not have a profile row)
  // This RPC only creates/repairs the current user's profile.
  await supabase.rpc("ensure_profile").catch(() => null);

  // Role-based route protection
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  const role = profile?.role ?? null;

  if (!role) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("err", "role");
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/admin") && role !== "super_admin") {
    return NextResponse.redirect(new URL("/retailer", request.url));
  }

  if (pathname.startsWith("/retailer") && role !== "retailer") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  if (pathname.startsWith("/noc") && role !== "super_admin") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
