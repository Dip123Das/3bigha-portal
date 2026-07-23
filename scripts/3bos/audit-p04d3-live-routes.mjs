const origin = String(
  process.env.AUDIT_ORIGIN || "https://3bigha.com"
).replace(/\/+$/, "");

const routes = [
  "/login",
  "/auth/post-login",
  "/auth/register-role",
  "/auth/awaiting-approval",
  "/dashboard",
  "/dashboard/workspace",
  "/dashboard/subscription",
  "/api/payments/sbi/readiness",
];

async function inspect(path) {
  const response = await fetch(`${origin}${path}`, {
    method: "GET",
    redirect: "manual",
    headers: {
      "User-Agent": "3Bigha-P04D3-Runtime-Audit/1.0",
    },
  });

  const location = response.headers.get("location");

  return {
    path,
    status: response.status,
    location,
    cacheControl: response.headers.get("cache-control"),
    contentType: response.headers.get("content-type"),
  };
}

const results = [];

for (const route of routes) {
  try {
    const result = await inspect(route);
    results.push(result);

    const destination = result.location
      ? ` -> ${result.location}`
      : "";

    console.log(
      `${result.status} ${result.path}${destination}`
    );
  } catch (error) {
    results.push({
      path: route,
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });

    console.log(`ERROR ${route}: ${error}`);
  }
}

const failures = results.filter((result) => {
  if ("error" in result) return true;

  return (
    result.status >= 500 ||
    result.status === 404
  );
});

const readiness = results.find(
  (result) =>
    "path" in result &&
    result.path === "/api/payments/sbi/readiness"
);

if (
  readiness &&
  "cacheControl" in readiness &&
  !String(readiness.cacheControl || "")
    .toLowerCase()
    .includes("no-store")
) {
  failures.push({
    path: "/api/payments/sbi/readiness",
    error: "Missing no-store cache policy",
  });
}

console.log(
  `\nP04-D3 live routes: ${
    results.length - failures.length
  }/${results.length} healthy.`
);

if (failures.length > 0) {
  console.log("\nFAILURES");
  console.log("========");

  for (const failure of failures) {
    console.log(JSON.stringify(failure));
  }

  process.exit(1);
}
