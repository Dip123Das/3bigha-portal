import fs from "node:fs";

const page = fs.readFileSync("app/dashboard/page.tsx", "utf8");
const access = fs.readFileSync("lib/access/resolveAccess.ts", "utf8");
const login = fs.readFileSync("app/login/LoginClient.tsx", "utf8");
const middleware = fs.readFileSync("middleware.ts", "utf8");
const callback = fs.readFileSync("app/auth/callback/AuthCallbackPageClient.tsx", "utf8");

const checks = [
  ["non-admin identities enter the unified workspace", access.includes('return "/dashboard";')],
  ["administrative routing remains explicit", access.includes('if (access.isAdmin) return "/admin/dashboard";')],
  ["dashboard no longer redirects by legacy role", !page.includes("getDefaultPostLoginPath(access)")],
  ["signed-out dashboard fallback remains", page.includes("DASHBOARD_SIGNED_OUT_MUST_NOT_SKELETON")],
  ["production login diagnostics are disabled", login.includes('process.env.NODE_ENV !== "production"')],
  ["production callback diagnostics are redacted", callback.includes('console.error("AUTH_CALLBACK_FAIL");')],
  ["protected routes redirect signed-out users", middleware.includes("if (error || !data.user)")],
  ["login and callback remain public", middleware.includes('"/login"') && middleware.includes('"/auth/callback"')],
  ["localized public routes remain public", middleware.includes("isPublicPath(authPathname)")],
  ["admin routes verify the profile role", middleware.includes('pathname.startsWith("/admin")')],
  ["blog admins are limited to blog administration", middleware.includes('pathname.startsWith("/admin/blog")')],
];

let failed = false;
for (const [label, passed] of checks) {
  if (!passed) {
    console.error(`FAIL: ${label}`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log("PASS: identity-first login and unified workspace routing verified.");
