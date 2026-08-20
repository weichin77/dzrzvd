import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getSupabaseSecretConfig } from "@/lib/config";

let adminClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdminClient() {
  if (!adminClient) {
    const config = getSupabaseSecretConfig();
    adminClient = createClient(config.url, config.secretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return adminClient;
}
