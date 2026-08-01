import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv(path) {
  if (!fs.existsSync(path)) return {};

  const env = {};

  for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) continue;

    const index = trimmed.indexOf("=");

    if (index < 1) continue;

    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

const localEnv = loadEnv(".env.local");

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  localEnv.NEXT_PUBLIC_SUPABASE_URL;

const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  localEnv.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is unavailable."
  );
}

const admin = createClient(url, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const email = "daynightwelfare@gmail.com";

const { data: profile, error: profileError } = await admin
  .from("profiles")
  .select("*")
  .eq("email", email)
  .maybeSingle();

if (profileError) {
  throw profileError;
}

if (!profile?.id) {
  throw new Error(`No profile found for ${email}`);
}

const { data: business, error: businessError } = await admin
  .from("business_profiles")
  .select("*")
  .eq("user_id", profile.id)
  .maybeSingle();

if (businessError) {
  throw businessError;
}

function selectIdentityFields(row) {
  if (!row) return null;

  const selected = {};

  for (const [key, value] of Object.entries(row)) {
    if (
      /name|photo|image|avatar|selfie|media|capture|verification/i.test(
        key
      )
    ) {
      selected[key] = value;
    }
  }

  return selected;
}

console.log("");
console.log("==========================================");
console.log(" V-14A RUNTIME IDENTITY AUDIT");
console.log("==========================================");
console.log("Profile ID:", profile.id);
console.log("");
console.log("PROFILE IDENTITY FIELDS");
console.dir(selectIdentityFields(profile), {
  depth: 10,
  colors: true,
});
console.log("");
console.log("BUSINESS IDENTITY FIELDS");
console.dir(selectIdentityFields(business), {
  depth: 10,
  colors: true,
});
console.log("==========================================");
