import assert from "node:assert/strict";
import test from "node:test";

import { isVerifiedGoldTankGoogleUser } from "../lib/supabase/google-admin-policy.ts";

function user(overrides = {}) {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    email: "operator@gold-tank.com",
    user_metadata: { email_verified: true },
    identities: [{
      provider: "google",
      identity_data: { email_verified: true, hd: "gold-tank.com" },
    }],
    ...overrides,
  };
}

test("accepts a verified Google identity in the Workspace domain", () => {
  assert.equal(isVerifiedGoldTankGoogleUser(user()), true);
});

test("rejects unverified, wrong-domain, and non-Google identities", () => {
  assert.equal(isVerifiedGoldTankGoogleUser(user({
    user_metadata: { email_verified: false },
    identities: [{
      provider: "google",
      identity_data: { email_verified: false, hd: "gold-tank.com" },
    }],
  })), false);
  assert.equal(isVerifiedGoldTankGoogleUser(user({
    user_metadata: { email_verified: "false" },
    identities: [{
      provider: "google",
      identity_data: { email_verified: "false", hd: "gold-tank.com" },
    }],
  })), false);
  assert.equal(isVerifiedGoldTankGoogleUser(user({
    email: "operator@example.com",
    identities: [{
      provider: "google",
      identity_data: { email_verified: true, hd: "example.com" },
    }],
  })), false);
  assert.equal(isVerifiedGoldTankGoogleUser(user({
    identities: [{ provider: "email", identity_data: {} }],
  })), false);
});

test("rejects a mismatched Google hosted-domain claim", () => {
  assert.equal(isVerifiedGoldTankGoogleUser(user({
    identities: [{
      provider: "google",
      identity_data: { email_verified: true, hd: "example.com" },
    }],
  })), false);
});
