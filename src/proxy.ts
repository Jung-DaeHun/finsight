import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isProtectedPath } from "@/lib/auth-flow";

const cacheHeaders = ["cache-control", "expires", "pragma"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: { sameSite: "lax" },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          const previous = response;
          response = NextResponse.next({ request });
          // SDK가 setAll을 여러 번 호출해도 기존 쿠키·캐시 방지 헤더를 유지한다.
          for (const cookie of previous.cookies.getAll()) response.cookies.set(cookie);
          for (const name of cacheHeaders) {
            const value = previous.headers.get(name);
            if (value) response.headers.set(name, value);
          }
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
          for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
        },
      },
    },
  );
  const { data, error } = await supabase.auth.getClaims();
  const sub = data?.claims.sub;
  const signedIn = !error && typeof sub === "string" && sub.length > 0;

  if (isProtectedPath(request.nextUrl.pathname) && !signedIn) {
    const redirect = NextResponse.redirect(new URL("/login", request.url));
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    for (const name of cacheHeaders) {
      const value = response.headers.get(name);
      if (value) redirect.headers.set(name, value);
    }
    return redirect;
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|api/webhooks(?:/|$)|favicon\\.ico$|robots\\.txt$|sitemap\\.xml$|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff2?|ttf|otf|csv|xlsx?|txt|xml|pdf)$).*)"],
};
