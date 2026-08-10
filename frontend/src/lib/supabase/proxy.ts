import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function refreshSupabaseSession(request: NextRequest) {
  if (process.env.BIB_HUMAN_AUTH_ENABLED !== "true") {
    return NextResponse.next({ request });
  }

  const url = process.env.BIB_SUPABASE_URL;
  const publishableKey = process.env.BIB_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  await supabase.auth.getClaims();
  return response;
}
