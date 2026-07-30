import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import {
  getSupabasePublicConfig,
  hasSupabasePublicConfig,
} from "@/lib/config";

export async function createSupabaseServerClient() {
  if (!hasSupabasePublicConfig()) {
    return null;
  }

  const config = getSupabasePublicConfig();
  const cookieStore = await cookies();

  return createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot always write cookies. proxy.ts refreshes
          // sessions for browser requests; Route Handlers can write normally.
        }
      },
    },
  });
}
