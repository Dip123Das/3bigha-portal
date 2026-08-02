import { redirect } from "next/navigation";
import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";
import styles from "./MemberAdministration.module.css";

export const dynamic = "force-dynamic";

type Params = Record<string, string | string[] | undefined>;

const one = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] || "" : value || "";

const clean = (value: unknown) =>
  String(value || "—").replaceAll("_", " ");

function classifyMember(role: string, requestedRole: string) {
  const value = `${role} ${requestedRole}`.toLowerCase();

  if (value.includes("buyer") || value.includes("purchaser")) return "Buyer";

  if (
    value.includes("vendor") ||
    value.includes("manufacturer") ||
    value.includes("dealer") ||
    value.includes("distributor") ||
    value.includes("retailer") ||
    value.includes("wholesaler") ||
    value.includes("trader")
  ) return "Seller / Vendor";

  if (value.includes("investor")) return "Investor";
  if (value.includes("banker") || value.includes("lender")) return "Banker";
  if (value.includes("blogger") || value.includes("author")) return "Blogger";

  if (
    value.includes("contractor") ||
    value.includes("painter") ||
    value.includes("plumber") ||
    value.includes("electrician") ||
    value.includes("carpenter") ||
    value.includes("mason") ||
    value.includes("worker") ||
    value.includes("professional") ||
    value.includes("service") ||
    value.includes("architect") ||
    value.includes("engineer") ||
    value.includes("surveyor") ||
    value.includes("valuer")
  ) return "Professional / Service";

  if (value.includes("builder") || value.includes("property"))
    return "Builder / Property";

  if (
    value.includes("equipment") ||
    value.includes("operator") ||
    value.includes("driver") ||
    value.includes("transport")
  ) return "Equipment / Transport";

  return "General Member";
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: Params;
}) {
  const access = await requireMasterAdmin();

  if ("error" in access) {
    if (access.status === 401) redirect("/login?next=/admin/users");
    return <main className={styles.page}>Access denied</main>;
  }

  const { user, admin: supabase } = access;

  const [
    profilesRes,
    businessRes,
    statesRes,
    districtsRes,
    authUsersRes,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id,email,full_name,role,requested_role,approval_status,account_status,account_status_reason,created_at,geo_state_id,geo_district_id"
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("business_profiles")
      .select(
        "user_id,business_name,subscription_plan,subscription_status,subscription_expires_at,geo_state_id,geo_district_id"
      ),
    supabase.from("geo_states").select("id,name").order("name"),
    supabase.from("geo_districts").select("id,state_id,name").order("name"),
    supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const loadError =
    profilesRes.error ||
    businessRes.error ||
    statesRes.error ||
    districtsRes.error ||
    authUsersRes.error;

  if (loadError) {
    return (
      <main className={styles.page}>
        <h1>Member Administration</h1>
        <p>Member records could not be loaded.</p>
        <pre>{loadError.message}</pre>
      </main>
    );
  }

  const businessByUser = new Map(
    (businessRes.data || []).map((row: any) => [row.user_id, row])
  );
  const authByUser = new Map(
    (authUsersRes.data.users || []).map((row: any) => [row.id, row])
  );
  const stateNames = new Map(
    (statesRes.data || []).map((row: any) => [row.id, row.name])
  );
  const districtNames = new Map(
    (districtsRes.data || []).map((row: any) => [row.id, row.name])
  );

  const q = one(searchParams?.q).trim().toLowerCase();
  const identity = one(searchParams?.identity);
  const role = one(searchParams?.role);
  const approval = one(searchParams?.approval);
  const account = one(searchParams?.account);
  const plan = one(searchParams?.plan);
  const state = one(searchParams?.state);
  const success = one(searchParams?.success);
  const error = one(searchParams?.error);

  const allMembers = (profilesRes.data || []).map((profile: any) => {
    const business: any = businessByUser.get(profile.id) || {};
    const authUser: any = authByUser.get(profile.id) || {};
    const complimentary =
      authUser.app_metadata?.complimentary_subscription || null;

    return {
      profile,
      business,
      complimentary,
      group: classifyMember(
        profile.role || "",
        profile.requested_role || ""
      ),
      stateId: business.geo_state_id || profile.geo_state_id || "",
      districtId: business.geo_district_id || profile.geo_district_id || "",
    };
  });

  const roleOptions = Array.from(
    new Set(
      allMembers
        .flatMap(({ profile }) => [profile.role, profile.requested_role])
        .filter(Boolean)
    )
  ).sort();

  const members = allMembers.filter(
    ({ profile, business, complimentary, group, stateId }) => {
      const effectivePlan =
        complimentary?.active
          ? complimentary.plan
          : business.subscription_plan || "none";

      const haystack = `${profile.full_name || ""} ${profile.email || ""} ${
        business.business_name || ""
      } ${profile.role || ""} ${profile.requested_role || ""}`.toLowerCase();

      if (q && !haystack.includes(q)) return false;
      if (identity && group !== identity) return false;
      if (
        role &&
        profile.role !== role &&
        profile.requested_role !== role
      ) return false;
      if (approval && profile.approval_status !== approval) return false;
      if (account && (profile.account_status || "active") !== account)
        return false;
      if (plan && effectivePlan !== plan) return false;
      if (state && stateId !== state) return false;

      return true;
    }
  );

  const activeCount = allMembers.filter(
    ({ profile }) => (profile.account_status || "active") === "active"
  ).length;
  const pendingCount = allMembers.filter(
    ({ profile }) => profile.approval_status === "pending"
  ).length;
  const restrictedCount = allMembers.filter(
    ({ profile }) => (profile.account_status || "active") !== "active"
  ).length;
  const complimentaryCount = allMembers.filter(
    ({ complimentary }) => complimentary?.active
  ).length;
  const highestCount = allMembers.filter(({ business, complimentary }) =>
    ["enterprise", "lifetime"].includes(
      complimentary?.active
        ? complimentary.plan
        : business.subscription_plan || ""
    )
  ).length;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Member Administration</h1>
          <p>
            Control every registered member: buyers, sellers, investors,
            bankers, bloggers, builders, contractors, skilled professionals,
            workers and general members.
          </p>
        </div>

        <div className={styles.headerActions}>
          <a href="/admin/verification-reviews">Business proof reviews</a>
          <a href="/admin/dashboard">Admin dashboard</a>
        </div>
      </header>

      {success ? <div className={styles.notice}>{success}</div> : null}
      {error ? <div className={styles.error}>{error}</div> : null}

      <section className={styles.summary}>
        <article><span>Total members</span><strong>{allMembers.length}</strong></article>
        <article><span>Active</span><strong>{activeCount}</strong></article>
        <article><span>Pending identity</span><strong>{pendingCount}</strong></article>
        <article><span>Restricted</span><strong>{restrictedCount}</strong></article>
        <article><span>Complimentary</span><strong>{complimentaryCount}</strong></article>
        <article><span>Enterprise / lifetime</span><strong>{highestCount}</strong></article>
      </section>

      <form method="get" className={styles.filters}>
        <input
          className={styles.field}
          name="q"
          defaultValue={one(searchParams?.q)}
          placeholder="Search name, email, business or role"
        />

        <select className={styles.field} name="identity" defaultValue={identity}>
          <option value="">All member groups</option>
          {[
            "Buyer",
            "Seller / Vendor",
            "Investor",
            "Banker",
            "Blogger",
            "Professional / Service",
            "Builder / Property",
            "Equipment / Transport",
            "General Member",
          ].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>

        <select className={styles.field} name="role" defaultValue={role}>
          <option value="">All exact roles</option>
          {roleOptions.map((value) => (
            <option key={value}>{clean(value)}</option>
          ))}
        </select>

        <select className={styles.field} name="approval" defaultValue={approval}>
          <option value="">All approvals</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>

        <select className={styles.field} name="account" defaultValue={account}>
          <option value="">All account states</option>
          <option value="active">Active</option>
          <option value="deactivated">Suspended</option>
          <option value="re_registration_required">Re-registration required</option>
          <option value="permanently_blocked">Permanently blocked</option>
        </select>

        <select className={styles.field} name="plan" defaultValue={plan}>
          <option value="">All plans</option>
          <option value="none">No plan</option>
          <option value="starter">Starter</option>
          <option value="professional">Professional</option>
          <option value="enterprise">Enterprise</option>
          <option value="lifetime">Lifetime</option>
        </select>

        <select className={styles.field} name="state" defaultValue={state}>
          <option value="">All states</option>
          {(statesRes.data || []).map((row: any) => (
            <option key={row.id} value={row.id}>{row.name}</option>
          ))}
        </select>

        <button className={styles.filterButton} type="submit">Apply</button>
        <a className={styles.clearLink} href="/admin/users">Clear</a>
      </form>

      <div className={styles.count}>
        Showing {members.length} of {allMembers.length} members
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Member</th>
              <th>Classification</th>
              <th>Account</th>
              <th>Subscription</th>
              <th>Location</th>
              <th>Joined</th>
              <th>Founder controls</th>
            </tr>
          </thead>

          <tbody>
            {members.map(
              ({
                profile,
                business,
                complimentary,
                group,
                stateId,
                districtId,
              }) => {
                const accountStatus = profile.account_status || "active";
                const isActive = accountStatus === "active";
                const isPending = profile.approval_status === "pending";
                const effectivePlan = complimentary?.active
                  ? complimentary.plan
                  : business.subscription_plan || "none";
                const effectiveStatus = complimentary?.active
                  ? "complimentary"
                  : business.subscription_status || "not paid";

                return (
                  <tr key={profile.id}>
                    <td>
                      <div className={styles.memberName}>
                        {profile.full_name ||
                          business.business_name ||
                          "Unnamed member"}
                      </div>
                      <div className={styles.muted}>
                        {profile.email || "No email"}
                      </div>
                      <div className={styles.muted}>
                        {business.business_name || "No business name"}
                      </div>
                    </td>

                    <td>
                      <div className={styles.tags}>
                        <span className={styles.tag}>{group}</span>
                        <span className={styles.tag}>
                          {clean(profile.role || "unresolved")}
                        </span>
                        {profile.requested_role ? (
                          <span className={styles.tag}>
                            Requested: {clean(profile.requested_role)}
                          </span>
                        ) : null}
                      </div>
                    </td>

                    <td>
                      <span
                        className={
                          !isActive
                            ? styles.statusBlocked
                            : isPending
                              ? styles.statusPending
                              : styles.statusActive
                        }
                      >
                        {!isActive
                          ? clean(accountStatus)
                          : isPending
                            ? "Identity pending"
                            : "Active"}
                      </span>
                      <div className={styles.muted}>
                        {profile.account_status_reason ||
                          clean(profile.approval_status)}
                      </div>
                    </td>

                    <td>
                      <div className={styles.plan}>{clean(effectivePlan)}</div>
                      <div className={styles.muted}>{clean(effectiveStatus)}</div>
                      <div className={styles.muted}>
                        {complimentary?.active
                          ? `Reason: ${complimentary.reason || "Not recorded"}`
                          : business.subscription_expires_at
                            ? new Date(
                                business.subscription_expires_at
                              ).toLocaleDateString("en-IN")
                            : "No expiry recorded"}
                      </div>
                    </td>

                    <td>
                      <div>{stateNames.get(stateId) || "State not recorded"}</div>
                      <div className={styles.muted}>
                        {districtNames.get(districtId) ||
                          "District not recorded"}
                      </div>
                    </td>

                    <td>
                      {profile.created_at
                        ? new Date(profile.created_at).toLocaleDateString("en-IN")
                        : "—"}
                    </td>

                    <td>
                      <div className={styles.actions}>
                        {isPending ? (
                          <div className={styles.inlineForm}>
                            <form action="/api/admin/approve-user" method="post">
                              <input
                                type="hidden"
                                name="user_id"
                                value={profile.id}
                              />
                              <input
                                type="hidden"
                                name="role"
                                value={profile.requested_role || ""}
                              />
                              <button className={styles.approve}>
                                Approve identity
                              </button>
                            </form>

                            <form
                              action="/api/admin/reject-user"
                              method="post"
                              className={styles.inlineForm}
                            >
                              <input
                                type="hidden"
                                name="user_id"
                                value={profile.id}
                              />
                              <input
                                name="reason"
                                placeholder="Rejection reason"
                                required
                              />
                              <button className={styles.reject}>Reject</button>
                            </form>
                          </div>
                        ) : null}

                        {profile.id !== user.id &&
                        profile.role !== "master_admin" ? (
                          <form
                            action="/api/admin/account-status"
                            method="post"
                            className={styles.inlineForm}
                          >
                            <input
                              type="hidden"
                              name="user_id"
                              value={profile.id}
                            />
                            <input
                              type="hidden"
                              name="action"
                              value={isActive ? "deactivate" : "activate"}
                            />

                            {isActive ? (
                              <>
                                <select
                                  name="restriction_mode"
                                  defaultValue="suspend"
                                >
                                  <option value="suspend">
                                    Temporary suspension
                                  </option>
                                  <option value="re_register">
                                    Require re-registration
                                  </option>
                                  <option value="permanent">
                                    Permanent block
                                  </option>
                                </select>

                                <select
                                  name="reason_code"
                                  defaultValue="other"
                                >
                                  <option value="policy_violation">
                                    Policy violation
                                  </option>
                                  <option value="suspicious_activity">
                                    Suspicious activity
                                  </option>
                                  <option value="verification_failed">
                                    Verification failed
                                  </option>
                                  <option value="payment_issue">
                                    Payment issue
                                  </option>
                                  <option value="duplicate_account">
                                    Duplicate account
                                  </option>
                                  <option value="other">Other</option>
                                </select>

                                <input
                                  name="custom_reason"
                                  placeholder="Internal reason"
                                  required
                                />
                              </>
                            ) : (
                              <input
                                name="reason"
                                placeholder="Reactivation note"
                              />
                            )}

                            <button
                              className={
                                isActive ? styles.danger : styles.approve
                              }
                            >
                              {isActive ? "Restrict" : "Reactivate"}
                            </button>
                          </form>
                        ) : null}

                        {profile.id !== user.id &&
                        profile.role !== "master_admin" ? (
                          <div className={styles.grantBox}>
                            <strong>Grant complimentary subscription</strong>

                            <form
                              action="/api/admin/member-subscription"
                              method="post"
                              className={styles.inlineForm}
                            >
                              <input
                                type="hidden"
                                name="user_id"
                                value={profile.id}
                              />

                              <select
                                name="plan"
                                defaultValue="enterprise"
                                required
                              >
                                <option value="starter">Starter</option>
                                <option value="professional">
                                  Professional
                                </option>
                                <option value="enterprise">Enterprise</option>
                                <option value="lifetime">Lifetime</option>
                              </select>

                              <input
                                name="reason"
                                placeholder="Internal reason"
                                required
                              />

                              <input name="expires_on" type="date" />

                              <button className={styles.approve}>
                                Grant without payment
                              </button>
                            </form>
                          </div>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              }
            )}
          </tbody>
        </table>

        {members.length === 0 ? (
          <div className={styles.empty}>
            No members match the selected filters.
          </div>
        ) : null}
      </div>
    </main>
  );
}
