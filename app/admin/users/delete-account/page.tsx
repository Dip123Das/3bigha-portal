import { redirect } from "next/navigation";
import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: {
    member?: string;
  };
};

export default async function DeleteMemberAccountPage({
  searchParams,
}: Props) {
  const access =
    await requireMasterAdmin();

  if ("error" in access) {
    if (access.status === 401) {
      redirect(
        "/login?next=/admin/users"
      );
    }

    return (
      <main style={pageStyle}>
        Access denied.
      </main>
    );
  }

  const userId = String(
    searchParams?.member || ""
  ).trim();

  if (!userId) {
    redirect("/admin/users");
  }

  if (userId === access.user.id) {
    return (
      <main style={pageStyle}>
        <section style={cardStyle}>
          <h1>Account deletion blocked</h1>
          <p>
            You cannot delete your own
            administrator account.
          </p>
          <a href="/admin/users">
            Return to Member Administration
          </a>
        </section>
      </main>
    );
  }

  const [
    profileResult,
    authResult,
  ] = await Promise.all([
    access.admin
      .from("profiles")
      .select(
        "id,email,full_name,role,approval_status,account_status"
      )
      .eq("id", userId)
      .maybeSingle(),

    access.admin.auth.admin.getUserById(
      userId
    ),
  ]);

  const profile = profileResult.data;
  const authUser =
    authResult.data?.user;

  if (!profile && !authUser) {
    redirect(
      "/admin/users?error=Account+not+found"
    );
  }

  const email =
    authUser?.email ||
    profile?.email ||
    "";

  const phone =
    authUser?.phone || "";

  const role = String(
    profile?.role || ""
  );

  const masterAdmin =
    role === "master_admin";

  return (
    <main style={pageStyle}>
      <section style={cardStyle}>
        <div style={dangerLabelStyle}>
          FOUNDER CONTROL · PERMANENT ACTION
        </div>

        <h1 style={{ marginBottom: 8 }}>
          Delete member account
        </h1>

        <p style={introStyle}>
          This permanently deletes the
          authentication account and allows
          the same person to register again
          using the same email or phone.
        </p>

        <div style={identityStyle}>
          <strong>
            {profile?.full_name ||
              "Unnamed member"}
          </strong>

          <span>
            {email ||
              phone ||
              userId}
          </span>

          <span>
            Role: {role || "unresolved"}
          </span>

          <span>
            Account:{" "}
            {profile?.account_status ||
              "active"}
          </span>
        </div>

        {masterAdmin ? (
          <div style={blockedStyle}>
            Master administrator accounts
            cannot be deleted here.
          </div>
        ) : (
          <form
            method="post"
            action="/api/admin/delete-account"
            style={formStyle}
          >
            <input
              type="hidden"
              name="user_id"
              value={userId}
            />

            <label style={labelStyle}>
              Reason for permanent deletion *
              <textarea
                name="deletion_reason"
                required
                minLength={10}
                rows={4}
                placeholder="Example: Test account created with unresolved identity. Founder is deleting it so the member can register again cleanly."
                style={fieldStyle}
              />
            </label>

            <label style={labelStyle}>
              Type DELETE
              {email
                ? ` or ${email}`
                : ""}
              {phone
                ? ` or ${phone}`
                : ""}
              *
              <input
                name="confirmation"
                required
                autoComplete="off"
                style={fieldStyle}
              />
            </label>

            <label style={checkStyle}>
              <input
                type="checkbox"
                name="permanent_acknowledgement"
                value="yes"
                required
              />

              <span>
                I understand that this
                permanently removes the
                member account and signs the
                member out. The member must
                register again.
              </span>
            </label>

            <div style={warningStyle}>
              This action cannot be undone.
              Use it only after confirming
              the selected member.
            </div>

            <div style={actionsStyle}>
              <a
                href={`/admin/users?member=${encodeURIComponent(
                  userId
                )}&workspace=controls`}
                style={cancelStyle}
              >
                Cancel
              </a>

              <button
                type="submit"
                style={deleteStyle}
              >
                Delete Account Permanently
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  padding: "40px 20px",
  background: "#f8fafc",
};

const cardStyle: React.CSSProperties = {
  width: "min(760px, 100%)",
  margin: "0 auto",
  padding: 28,
  background: "white",
  border: "1px solid #fecaca",
  borderRadius: 18,
  boxShadow:
    "0 20px 60px rgba(127,29,29,.10)",
};

const dangerLabelStyle:
  React.CSSProperties = {
  color: "#b91c1c",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: ".08em",
};

const introStyle: React.CSSProperties = {
  color: "#475569",
  lineHeight: 1.65,
};

const identityStyle:
  React.CSSProperties = {
  display: "grid",
  gap: 5,
  margin: "22px 0",
  padding: 18,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
};

const formStyle: React.CSSProperties = {
  display: "grid",
  gap: 18,
};

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: 7,
  fontWeight: 700,
  color: "#334155",
};

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 13px",
  border: "1px solid #cbd5e1",
  borderRadius: 9,
  font: "inherit",
  boxSizing: "border-box",
};

const checkStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  color: "#334155",
  lineHeight: 1.5,
};

const warningStyle: React.CSSProperties = {
  padding: 14,
  color: "#991b1b",
  background: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: 10,
  fontWeight: 700,
};

const blockedStyle: React.CSSProperties = {
  padding: 16,
  color: "#991b1b",
  background: "#fef2f2",
  borderRadius: 10,
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  flexWrap: "wrap",
  gap: 10,
};

const cancelStyle: React.CSSProperties = {
  padding: "11px 16px",
  color: "#334155",
  textDecoration: "none",
  background: "#e2e8f0",
  borderRadius: 9,
  fontWeight: 700,
};

const deleteStyle: React.CSSProperties = {
  padding: "11px 16px",
  color: "white",
  background: "#b91c1c",
  border: 0,
  borderRadius: 9,
  fontWeight: 800,
  cursor: "pointer",
};
