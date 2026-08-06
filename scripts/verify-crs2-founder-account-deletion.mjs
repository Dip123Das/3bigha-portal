import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const files = {
  migration:
    "supabase/migrations/20260806230000_founder_account_deletion_audit.sql",
  endpoint:
    "app/api/admin/delete-account/route.ts",
  page:
    "app/admin/users/delete-account/page.tsx",
  members:
    "app/admin/users/page.tsx",
};

for (
  const [name, relativePath]
  of Object.entries(files)
) {
  const absolutePath =
    path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(
      `${name} file missing: ${relativePath}`
    );
  }
}

const migration =
  fs.readFileSync(
    path.join(root, files.migration),
    "utf8"
  );

const endpoint =
  fs.readFileSync(
    path.join(root, files.endpoint),
    "utf8"
  );

const page =
  fs.readFileSync(
    path.join(root, files.page),
    "utf8"
  );

const members =
  fs.readFileSync(
    path.join(root, files.members),
    "utf8"
  );

for (const marker of [
  "admin_account_deletion_audit",
  "deleted_user_id uuid not null",
  "deletion_reason text not null",
  "profile_snapshot jsonb",
  "auth_snapshot jsonb",
]) {
  if (!migration.includes(marker)) {
    throw new Error(
      `Deletion audit marker missing: ${marker}`
    );
  }
}

for (const marker of [
  "requireMasterAdmin",
  "You cannot delete your own administrator account",
  "Master administrator accounts cannot be deleted",
  "auth.admin.deleteUser",
  "deletion_status: \"completed\"",
]) {
  if (!endpoint.includes(marker)) {
    throw new Error(
      `Secure deletion marker missing: ${marker}`
    );
  }
}

for (const marker of [
  "Delete member account",
  "Delete Account Permanently",
  "permanent_acknowledgement",
  "Type DELETE",
]) {
  if (!page.includes(marker)) {
    throw new Error(
      `Deletion UI marker missing: ${marker}`
    );
  }
}

if (
  !members.includes(
    "/admin/users/delete-account?member="
  )
) {
  throw new Error(
    "Member Administration delete-account link is missing."
  );
}

console.log(
  "CRS-2 founder account deletion assertions passed."
);
