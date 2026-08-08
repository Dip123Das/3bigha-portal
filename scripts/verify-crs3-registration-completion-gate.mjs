import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const middlewarePath =
  path.join(root, "middleware.ts");

const registrationPath =
  path.join(
    root,
    "app/auth/register-role/RegisterRolePageClient.tsx"
  );

for (const file of [
  middlewarePath,
  registrationPath,
]) {
  if (!fs.existsSync(file)) {
    throw new Error(
      `Required CRS-3 file is missing: ${file}`
    );
  }
}

const middleware =
  fs.readFileSync(
    middlewarePath,
    "utf8"
  );

const registration =
  fs.readFileSync(
    registrationPath,
    "utf8"
  );

const middlewareMarkers = [
  "CRS-3_REGISTRATION_COMPLETION_GATE",
  "registration_path",
  "individual_professional_registration_status",
  'registrationPath === "individual_professional"',
  '"foundation_complete"',
  'registrationPath === "customer"',
  'registrationPath === "business"',
  '"/onboarding/individual-professional"',
  '"/onboarding/customer"',
  '"/onboarding/business"',
  '"/auth/register-role"',
  "accessProfile?.onboarding_completed !== true",
];

for (const marker of middlewareMarkers) {
  if (!middleware.includes(marker)) {
    throw new Error(
      `CRS-3 middleware marker missing: ${marker}`
    );
  }
}

const registrationMarkers = [
  "registrationPathError",
  "await supabase.auth.updateUser",
  "registration_path: activePath",
  "registration_path_declared_at:",
];

for (const marker of registrationMarkers) {
  if (!registration.includes(marker)) {
    throw new Error(
      `CRS-3 registration persistence marker missing: ${marker}`
    );
  }
}

if (
  registration.includes(
    "void supabase.auth\n        .updateUser"
  )
) {
  throw new Error(
    "Registration pathway metadata is still being persisted asynchronously."
  );
}

console.log(
  "CRS-3 constitutional registration completion gate assertions passed."
);
