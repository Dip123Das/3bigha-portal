const blockedPrefixes = [
  "/admin",
  "/dashboard",
  "/thread",
  "/chat",
  "/inbox",
  "/buyer",
  "/rfq",
  "/api",
  "/subscription",
  "/checkout",
  "/payment",
  "/login",
  "/logout",
  "/auth",
  "/vendor/inbox",
  "/vendor/inbox-v2",
];

export function isIndexable(pathname: string = "/") {
  const clean = pathname.split("?")[0];

  return !blockedPrefixes.some((prefix) =>
    clean.startsWith(prefix)
  );
}