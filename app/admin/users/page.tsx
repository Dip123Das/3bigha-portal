import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const cookieStore = await cookies();
  const supabase = getSupabaseServerClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin/users");
  }

  const { data: prof } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (prof?.role !== "master_admin") {
    return <div style={{ padding: 20 }}>Access denied</div>;
  }

  const { data: users } = await supabase
    .from("profiles")
    .select("id,email,requested_role,approval_status,created_at")
    .order("created_at", { ascending: false });

  return (
    <main style={{ padding: 20 }}>
      <h1 style={{ fontSize: 22, fontWeight: 900 }}>User Approvals</h1>

      <div style={{ marginTop: 20 }}>
        {users?.map((u) => (
          <div
            key={u.id}
            style={{
              border: "1px solid #ddd",
              padding: 12,
              borderRadius: 10,
              marginBottom: 10,
            }}
          >
            <div><b>Email:</b> {u.email || "—"}</div>
            <div><b>Requested Role:</b> {u.requested_role || "—"}</div>
            <div><b>Status:</b> {u.approval_status || "—"}</div>

            {u.approval_status === "pending" ? (
              <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <form action="/api/admin/approve-user" method="post">
                  <input type="hidden" name="user_id" value={u.id} />
                  <input type="hidden" name="role" value={u.requested_role || ""} />
                  <button type="submit">Approve</button>
                </form>

                <form action="/api/admin/reject-user" method="post">
                  <input type="hidden" name="user_id" value={u.id} />
                  <button type="submit">Reject</button>
                </form>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </main>
  );
}