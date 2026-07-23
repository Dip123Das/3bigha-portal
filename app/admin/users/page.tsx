import { redirect } from "next/navigation";
import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";

export const dynamic = "force-dynamic";

type Params = Record<string, string | string[] | undefined>;
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] || "" : value || "";

export default async function AdminUsersPage({ searchParams }: { searchParams?: Params }) {
  const access = await requireMasterAdmin();
  if ("error" in access) {
    if (access.status === 401) redirect("/login?next=/admin/users");
    return <main style={{ padding: 24 }}>Access denied</main>;
  }
  const { user, admin: supabase } = access;

  const [profilesRes, businessRes, statesRes, districtsRes, subdivisionsRes, blocksRes] = await Promise.all([
    supabase.from("profiles").select("id,email,full_name,role,requested_role,approval_status,account_status,account_status_reason,created_at,geo_state_id,geo_district_id,geo_subdivision_id,geo_block_id").order("created_at", { ascending: false }),
    supabase.from("business_profiles").select("user_id,business_name,subscription_plan,subscription_status,subscription_expires_at,geo_state_id,geo_district_id,geo_subdivision_id,geo_block_id"),
    supabase.from("geo_states").select("id,name").order("name"),
    supabase.from("geo_districts").select("id,state_id,name").order("name"),
    supabase.from("geo_subdivisions").select("id,district_id,name").order("name"),
    supabase.from("geo_blocks").select("id,district_id,subdivision_id,name").order("name"),
  ]);

  const loadError = profilesRes.error || businessRes.error || statesRes.error || districtsRes.error || subdivisionsRes.error || blocksRes.error;
  if (loadError) {
    return <main style={{ padding: 24 }}><h1>Member Administration</h1><p>Member records could not be loaded.</p><pre>{loadError.message}</pre></main>;
  }

  const stateId = one(searchParams?.state);
  const districtId = one(searchParams?.district);
  const subdivisionId = one(searchParams?.subdivision);
  const blockId = one(searchParams?.block);
  const statusFilter = one(searchParams?.account_status);
  const query = one(searchParams?.q).trim().toLowerCase();
  const businessByUser = new Map((businessRes.data || []).map((row: any) => [row.user_id, row]));
  const names = (rows: any[]) => new Map(rows.map((row) => [row.id, row.name]));
  const stateNames = names(statesRes.data || []), districtNames = names(districtsRes.data || []);
  const subdivisionNames = names(subdivisionsRes.data || []), blockNames = names(blocksRes.data || []);

  const users = (profilesRes.data || []).filter((profile: any) => {
    const bp: any = businessByUser.get(profile.id) || {};
    const geo = {
      state: bp.geo_state_id || profile.geo_state_id || "",
      district: bp.geo_district_id || profile.geo_district_id || "",
      subdivision: bp.geo_subdivision_id || profile.geo_subdivision_id || "",
      block: bp.geo_block_id || profile.geo_block_id || "",
    };
    if (stateId && geo.state !== stateId) return false;
    if (districtId && geo.district !== districtId) return false;
    if (subdivisionId && geo.subdivision !== subdivisionId) return false;
    if (blockId && geo.block !== blockId) return false;
    if (statusFilter && (profile.account_status || "active") !== statusFilter) return false;
    if (query && !`${profile.email || ""} ${profile.full_name || ""} ${bp.business_name || ""}`.toLowerCase().includes(query)) return false;
    return true;
  });

  const districts = (districtsRes.data || []).filter((row: any) => !stateId || row.state_id === stateId);
  const subdivisions = (subdivisionsRes.data || []).filter((row: any) => !districtId || row.district_id === districtId);
  const blocks = (blocksRes.data || []).filter((row: any) => (!districtId || row.district_id === districtId) && (!subdivisionId || row.subdivision_id === subdivisionId));
  const field = { padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 8 } as const;

  return <main style={{ padding: 24, maxWidth: 1500, margin: "0 auto" }}>
    <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>Member Administration</h1>
    <p style={{ color: "#475569" }}>Review identities, activate or deactivate accounts, inspect SBI payment status, and filter members through the official geography hierarchy. Subscriptions cannot be activated manually.</p>

    <form method="get" style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: 14, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12 }}>
      <input name="q" defaultValue={one(searchParams?.q)} placeholder="Search name, email or business" style={{ ...field, minWidth: 240 }} />
      <select name="state" defaultValue={stateId} style={field}><option value="">All states</option>{(statesRes.data || []).map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
      <select name="district" defaultValue={districtId} style={field}><option value="">All districts</option>{districts.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
      <select name="subdivision" defaultValue={subdivisionId} style={field}><option value="">All subdivisions</option>{subdivisions.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
      <select name="block" defaultValue={blockId} style={field}><option value="">All blocks/local bodies</option>{blocks.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
      <select name="account_status" defaultValue={statusFilter} style={field}><option value="">All account states</option><option value="active">Active</option><option value="deactivated">Temporarily suspended</option><option value="re_registration_required">Re-registration required</option><option value="permanently_blocked">Serious block</option></select>
      <button type="submit" style={field}>Apply filters</button><a href="/admin/users" style={{ ...field, textDecoration: "none", color: "#0f172a" }}>Clear</a>
    </form>

    <div style={{ margin: "16px 0", fontWeight: 800 }}>{users.length} member{users.length === 1 ? "" : "s"}</div>
    <div style={{ display: "grid", gap: 14 }}>
      {users.map((profile: any) => {
        const bp: any = businessByUser.get(profile.id) || {};
        const geoState = bp.geo_state_id || profile.geo_state_id, geoDistrict = bp.geo_district_id || profile.geo_district_id;
        const geoSubdivision = bp.geo_subdivision_id || profile.geo_subdivision_id, geoBlock = bp.geo_block_id || profile.geo_block_id;
        const accountStatus = profile.account_status || "active";
        const active = accountStatus === "active";
        const statusLabel = accountStatus === "re_registration_required"
          ? "Re-registration required"
          : accountStatus === "permanently_blocked"
            ? "Serious block"
            : active ? "Active" : "Suspended";
        return <article key={profile.id} style={{ border: `1px solid ${active ? "#dbeafe" : "#fecaca"}`, borderRadius: 14, padding: 16, background: active ? "white" : "#fff7f7" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div><strong>{profile.full_name || bp.business_name || "Unnamed member"}</strong><div>{profile.email || "No email"}</div><div style={{ color: "#64748b", fontSize: 13 }}>{[stateNames.get(geoState), districtNames.get(geoDistrict), subdivisionNames.get(geoSubdivision), blockNames.get(geoBlock)].filter(Boolean).join(" → ") || "LGD location not recorded"}</div></div>
            <div><b>{statusLabel}</b><div style={{ fontSize: 13 }}>{profile.account_status_reason || "No status note"}</div></div>
          </div>
          <div style={{ marginTop: 10 }}>Role: <b>{profile.role || "unresolved"}</b> · Requested: <b>{profile.requested_role || "—"}</b> · Approval: <b>{profile.approval_status || "—"}</b></div>

          {profile.approval_status === "pending" ? <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}><form action="/api/admin/approve-user" method="post"><input type="hidden" name="user_id" value={profile.id}/><input type="hidden" name="role" value={profile.requested_role || ""}/><button>Approve identity</button></form><form action="/api/admin/reject-user" method="post" style={{ display: "flex", gap: 8 }}><input type="hidden" name="user_id" value={profile.id}/><input name="reason" placeholder="Reason for rejection" required style={field}/><button>Reject identity</button></form></div> : null}

          {profile.id !== user.id && profile.role !== "master_admin" ? <form action="/api/admin/account-status" method="post" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            <input type="hidden" name="user_id" value={profile.id}/><input type="hidden" name="action" value={active ? "deactivate" : "activate"}/>
            {active ? <>
              <select name="restriction_mode" required defaultValue="suspend" style={{ ...field, minWidth: 250 }}>
                <option value="suspend">Temporary suspension — admin review required</option>
                <option value="re_register">Ordinary issue — allow re-registration</option>
                <option value="permanent">Serious violation — block indefinitely</option>
              </select>
              <select name="reason_code" required defaultValue="" style={{ ...field, minWidth: 260 }}>
                <option value="" disabled>Select deactivation reason</option>
                <option value="policy_violation">Terms or policy violation</option>
                <option value="suspicious_activity">Fraud or suspicious activity</option>
                <option value="verification_failed">Identity/document verification failed</option>
                <option value="payment_issue">Subscription or payment issue</option>
                <option value="duplicate_account">Duplicate account</option>
                <option value="user_request">User requested deactivation</option>
                <option value="inactive_account">Inactive or abandoned account</option>
                <option value="legal_request">Legal or regulatory request</option>
                <option value="security_risk">Account security risk</option>
                <option value="other">Other reason</option>
              </select>
              <input name="custom_reason" placeholder="Custom reason (required when Other is selected)" style={{ ...field, minWidth: 320 }}/>
            </> : (
              <input name="reason" placeholder="Reactivation note (optional)" style={{ ...field, minWidth: 260 }}/>
            )}
            <button type="submit" style={{ ...field, background: active ? "#b91c1c" : "#15803d", color: "white" }}>{active ? "Deactivate account" : "Reactivate account"}</button>
          </form> : null}

          <div style={{ marginTop: 14, padding: 12, background: "#eff6ff", color: "#1e3a8a", borderRadius: 10, fontWeight: 800 }}>
            Subscription: {String(bp.subscription_plan || "none").replaceAll("_", " ")} · Status: {String(bp.subscription_status || "not paid").replaceAll("_", " ")}. Activation occurs only after verified SBI Payment Gateway confirmation.
          </div>
        </article>;
      })}
    </div>
  </main>;
}
