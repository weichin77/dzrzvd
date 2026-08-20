import type { User } from "@supabase/supabase-js";

export const DEFAULT_ADMIN_GOOGLE_WORKSPACE_DOMAIN = "gold-tank.com";

function isVerifiedClaim(value: unknown): boolean {
  return value === true || value === "true";
}

export function isVerifiedGoldTankGoogleUser(
  user: User,
  allowedDomain = DEFAULT_ADMIN_GOOGLE_WORKSPACE_DOMAIN,
): boolean {
  const normalizedDomain = allowedDomain.toLocaleLowerCase("en").trim();
  const identity = user.identities?.find((candidate) =>
    candidate.provider === "google");

  if (!identity || !normalizedDomain) {
    return false;
  }

  const email = user.email?.toLocaleLowerCase("en").trim() ?? "";
  const emailVerified = isVerifiedClaim(
    user.user_metadata?.email_verified ??
      identity.identity_data?.email_verified,
  );
  const hostedDomainValue = identity.identity_data?.hd;
  const hostedDomain = typeof hostedDomainValue === "string"
    ? hostedDomainValue.toLocaleLowerCase("en").trim()
    : undefined;

  return emailVerified &&
    email.endsWith(`@${normalizedDomain}`) &&
    (hostedDomain === undefined || hostedDomain === normalizedDomain);
}
