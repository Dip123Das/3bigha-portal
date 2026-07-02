import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ActionButton } from "@/components/ui/ActionButton";
import { Grid } from "@/components/ui/Grid";
import { EmptyState } from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

function isAnyAdminRole(role: string | null | undefined) {
  return (
    role === "master_admin" ||
    role === "property_admin" ||
    role === "materials_admin" ||
    role === "services_admin" ||
    role === "rentals_admin" ||
    role === "blog_admin" ||
    role === "investment_admin"
  );
}

function isMaster(role: string | null | undefined) {
  return role === "master_admin";
}

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const supabase = getSupabaseServerClient(cookieStore);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login?next=/admin/dashboard");
  }

  const email = user.email ?? null;

  const { data: prof, error: profErr } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = (prof?.role ?? null) as string | null;
  const err = profErr?.message ?? null;

  if (!isAnyAdminRole(role)) {
    return (
      <main>
        <Container>
          <SectionHeader title="Admin Dashboard" subtitle="" />

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            <ActionButton href="/" variant="secondary">
              ← Back to Home
            </ActionButton>
            <ActionButton href="/login?next=/admin/dashboard" variant="secondary">
              Login
            </ActionButton>
          </div>

          <EmptyState message="Access denied. (Admin role required)" />

          <div style={{ marginTop: 12, color: "#5b6472", fontSize: 13 }}>
            Signed in as: <b>{email ?? "—"}</b>
            <br />
            Role: <b>{role ?? "none"}</b>
          </div>

          {err ? <div style={{ marginTop: 12, color: "crimson", fontWeight: 800 }}>{err}</div> : null}
        </Container>
      </main>
    );
  }

  const { data: subscriptionRequests } = isMaster(role)
    ? await supabase
        .from("business_profiles")
        .select("*")
        .eq("subscription_status", "requested")
        .order("updated_at", { ascending: false })
        .limit(20)
    : { data: [] as any[] };

    const { data: activeSubscriptions } = isMaster(role)
    ? await supabase
        .from("business_profiles")
        .select("subscription_plan, subscription_status")
        .eq("subscription_status", "active")
    : { data: [] as any[] };

    const { data: paymentRecords } = isMaster(role)
    ? await supabase
        .from("payment_records")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20)
    : { data: [] as any[] };

      const { data: aiMonetizationAlerts } = isMaster(role)
    ? await supabase
        .from("vendor_notifications")
        .select("id,is_read,created_at")
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: [] as any[] };

  const revenueStats = (() => {
    let basic = 0;
    let silver = 0;
    let gold = 0;
    let platinum = 0;

    for (const row of activeSubscriptions || []) {
      const plan = String(row.subscription_plan || "").toLowerCase();

      if (plan === "basic_vendor") basic++;
      else if (plan === "silver_vendor") silver++;
      else if (plan === "gold_vendor" || plan === "premium_vendor") gold++;
      else if (plan === "platinum_vendor" || plan === "hub_vendor") platinum++;
    }

    const totalRevenue =
      basic * 299 +
      silver * 499 +
      gold * 999 +
      platinum * 1999;

    const alertCount = aiMonetizationAlerts?.length || 0;
    const unreadAlertCount =
      aiMonetizationAlerts?.filter((a: any) => a.is_read === false).length || 0;

    return {
      basic,
      silver,
      gold,
      platinum,
      totalRevenue,
      alertCount,
      unreadAlertCount,
    };
  })();

  const cards = [
    {
      title: "Admin · User Approvals",
      desc: "Review new user registrations, requested roles, and approve or reject access.",
      href: "/admin/users",
      show: isMaster(role),
      badges: ["profiles", "pending → approved/rejected"],
    },
    {
      title: "Admin · Property",
      desc: "Review, approve, or reject property listings.",
      href: "/admin/property",
      show: isMaster(role) || role === "property_admin",
      badges: ["property_listings", "pending → approved/rejected"],
    },
    {
      title: "Admin · Materials",
      desc: "Review, approve, or reject material listings.",
      href: "/admin/materials",
      show: isMaster(role) || role === "materials_admin",
      badges: ["material_listings", "pending → approved/rejected"],
    },
    {
      title: "Admin · Services",
      desc: "Review, approve, or reject service listings.",
      href: "/admin/services",
      show: isMaster(role) || role === "services_admin",
      badges: ["service_listings", "pending → approved/rejected"],
    },
    {
      title: "Admin · Rentals",
      desc: "Review, approve, or reject rental listings.",
      href: "/admin/rentals",
      show: isMaster(role) || role === "rentals_admin",
      badges: ["rental_listings", "pending → approved/rejected"],
    },
    {
      title: "Admin · Blog",
      desc: "Moderate blog drafts and publishing.",
      href: "/admin/blog",
      show: isMaster(role) || role === "blog_admin",
      badges: ["blog_posts", "draft → published"],
    },
    {
      title: "Admin · Price Verification",
      desc: "Verify or reject vendor-submitted Price Today updates.",
      href: "/admin/dashboard/price-updates",
      show: isMaster(role),
      badges: ["price today", "pending → verified/rejected"],
    },
    {
      title: "Admin · Support Desk",
      desc: "View user complaints, written support tickets, roles, priorities and issue status.",
      href: "/admin/dashboard/support",
      show: isMaster(role),
      badges: ["support tickets", "written issues", "open → resolved"],
    },
    {
      title: "Admin · Vendor Control",
      desc: "Control vendor boost, ranking power, and marketplace visibility.",
      href: "/admin/dashboard/vendor-control",
      show: isMaster(role),
      badges: ["boost control", "ranking override", "AI marketplace"],
    },
    {
      title: "Admin · Vendor Control AI",
      desc: "Control vendor boost, visibility priority, and manual admin alerts.",
      href: "/admin/dashboard/vendor-control",
      show: isMaster(role),
      badges: ["boost control", "manual alerts", "AI marketplace control"],
    },
    {
      title: "Admin · SEO Control Center",
      desc: "Manage sitemap, robots.txt, multilingual SEO, indexing and future AI SEO infrastructure.",
      href: "/admin/dashboard/seo",
      show: isMaster(role),
      badges: ["sitemap", "robots.txt", "AI SEO", "regional SEO"],
    },
    {
      title: "Admin · Geography Control Center",
      desc: "Manage states, districts, subdivisions, blocks, places, resolver health, coverage analytics and future nationwide geography expansion.",
      href: "/admin/dashboard/geography",
      show: isMaster(role),
      badges: [
        "states",
        "districts",
        "blocks",
        "places",
        "resolver",
        "coverage",
      ],
    },

    {
      title: "Admin · Marketplace Intelligence",
      desc: "Monitor demand, supply, vendor shortage zones, oversupplied markets and opportunity signals across modules and geography.",
      href: "/admin/dashboard/marketplace-intelligence",
      show: isMaster(role),
      badges: [
        "demand",
        "supply",
        "gap analysis",
        "opportunity zones",
        "vendor shortage",
      ],
    },

    {
      title: "Admin · Production Operations",
      desc: "Monitor Hostinger VPS, PM2, Nginx, deployments, health logs, backups and production status.",
      href: "/admin/dashboard/operations",
      show: isMaster(role),
      badges: ["VPS", "PM2", "Nginx", "deployments", "health monitor"],
    },

    {
      title: "Admin · Vendor Recruitment",
      desc: "AI-generated vendor acquisition targets by geography, shortage, priority and market expansion need.",
      href: "/admin/dashboard/vendor-recruitment",
      show: isMaster(role),
      badges: [
        "shortages",
        "recruitment",
        "growth",
        "market expansion",
      ],
    },

    {
      title: "Admin · Measurement Master Data",
      desc: "Future control center for local land units, district-wise measurements, city practices and conversion values.",
      href: "/admin/dashboard/master-data/measurement",
      show: isMaster(role),
      badges: ["land units", "district/city", "local practice", "future DB"],
    },
  ].filter((c) => c.show);

  return (
    <main>
      <Container>
        <SectionHeader title="Admin Dashboard" subtitle="Choose a module to manage." />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <ActionButton href="/" variant="secondary">
            Public Home
          </ActionButton>

          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <Badge>{email ?? "—"}</Badge>
            <Badge>role: {role}</Badge>
          </div>
        </div>

        {err ? <div style={{ color: "crimson", fontWeight: 800, marginBottom: 10 }}>{err}</div> : null}

        {cards.length === 0 ? (
          <EmptyState message="No modules available for your role." />
        ) : (
          <Grid min={280} gap={12}>
            {cards.map((c) => (
              <Card key={c.href}>
                <CardBody>
                  <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>{c.title}</div>
                  <div style={{ color: "#5b6472", fontSize: 13, lineHeight: 1.5 }}>{c.desc}</div>

                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {c.badges.map((b) => (
                      <Badge key={b}>{b}</Badge>
                    ))}
                  </div>
                </CardBody>

                <CardFooter>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: "100%" }}>
                    <ActionButton href={c.href} variant="primary">
                      Open →
                    </ActionButton>
                    <Link href={c.href} style={{ fontWeight: 800, alignSelf: "center" }}>
                      {c.href}
                    </Link>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </Grid>
        )}

        {isMaster(role) && (
          <div style={{ marginTop: 16, display: "grid", gap: 16 }}>
            <div
              style={{
                border: "1px solid #d1fae5",
                borderRadius: 18,
                padding: 12,
                background: "#ffffff",
              }}
            >
              <details
            open
            style={{
              marginTop: 16,
              border: "1px solid #bfdbfe",
              borderRadius: 18,
              padding: 12,
              background: "#eff6ff",
            }}
          >
            <summary
              style={{
                cursor: "pointer",
                fontSize: 18,
                fontWeight: 950,
                color: "#1e3a8a",
              }}
            >
              🏦 Finance Operations
            </summary>

            <div
              style={{
                marginTop: 8,
                fontSize: 13,
                color: "#1e40af",
                fontWeight: 800,
                lineHeight: 1.6,
              }}
            >
              Control banking assistance, EMI leads, verified bankers, lender offers and public finance SEO visibility.
            </div>

            <div style={{ marginTop: 12 }}>
              <Grid min={240} gap={12}>
                <Card>
                  <CardBody>
                    <div style={{ fontWeight: 900 }}>Finance Leads</div>
                    <div style={{ marginTop: 6, fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
                      Manage EMI calculator leads, borrower details, sanction probability and lender assignment.
                    </div>
                    <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Badge>loan leads</Badge>
                      <Badge>assignment</Badge>
                      <Badge>CRM</Badge>
                    </div>
                  </CardBody>
                  <CardFooter>
                    <ActionButton href="/admin/dashboard/finance-leads" variant="primary">
                      Open →
                    </ActionButton>
                  </CardFooter>
                </Card>

                <Card>
                  <CardBody>
                    <div style={{ fontWeight: 900 }}>Banker Verification</div>
                    <div style={{ marginTop: 6, fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
                      Approve bankers, review employee card proof and activate lender-offer workflows.
                    </div>
                    <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Badge>banker KYC</Badge>
                      <Badge>lender offers</Badge>
                      <Badge>approval</Badge>
                    </div>
                  </CardBody>
                  <CardFooter>
                    <ActionButton href="/admin/dashboard/banker-verification" variant="primary">
                      Open →
                    </ActionButton>
                  </CardFooter>
                </Card>

                <Card>
                  <CardBody>
                    <div style={{ fontWeight: 900 }}>Banker Work Desk</div>
                    <div style={{ marginTop: 6, fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
                      Open banker-facing workspace for assigned leads, follow-ups and lender offer submission.
                    </div>
                    <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Badge>banker desk</Badge>
                      <Badge>follow-up</Badge>
                      <Badge>offers</Badge>
                    </div>
                  </CardBody>
                  <CardFooter>
                    <ActionButton href="/dashboard/banker" variant="primary">
                      Open →
                    </ActionButton>
                  </CardFooter>
                </Card>

                <Card>
                  <CardBody>
                    <div style={{ fontWeight: 900 }}>Public Finance Tools</div>
                    <div style={{ marginTop: 6, fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
                      Review public finance discovery pages, EMI calculator and banker application portal.
                    </div>
                    <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Badge>EMI</Badge>
                      <Badge>SEO</Badge>
                      <Badge>banker apply</Badge>
                    </div>
                  </CardBody>
                  <CardFooter>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <ActionButton href="/emi-calculator" variant="primary">
                        EMI →
                      </ActionButton>
                      <ActionButton href="/banking-finance-assistance" variant="secondary">
                        Finance Page →
                      </ActionButton>
                      <ActionButton href="/banker/apply" variant="secondary">
                        Apply →
                      </ActionButton>
                      <ActionButton href="/construction-cost" variant="secondary">
                        Construction Cost →
                      </ActionButton>
                    </div>
                  </CardFooter>
                </Card>
              </Grid>
            </div>
          </details>

<div style={{ fontSize: 18, fontWeight: 950, marginBottom: 6 }}>
                💰 AI Revenue Analytics
              </div>

              <div style={{ fontSize: 13, color: "#047857", fontWeight: 800, marginBottom: 14 }}>
                Monitor premium subscriptions, WhatsApp alert monetization, and upgrade pressure.
              </div>

              <Grid min={180} gap={12}>
                <Card>
                  <CardBody>
                    <div style={{ fontSize: 13, color: "#334155", fontWeight: 900 }}>Basic</div>
                    <div style={{ fontSize: 26, fontWeight: 950 }}>{revenueStats.basic}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>₹{revenueStats.basic * 299}</div>
                  </CardBody>
                </Card>

                <Card>
                  <CardBody>
                    <div style={{ fontSize: 13, color: "#065f46", fontWeight: 900 }}>Silver</div>
                    <div style={{ fontSize: 26, fontWeight: 950 }}>{revenueStats.silver}</div>
                    <div style={{ fontSize: 12, color: "#047857" }}>₹{revenueStats.silver * 499}</div>
                  </CardBody>
                </Card>

                <Card>
                  <CardBody>
                    <div style={{ fontSize: 13, color: "#92400e", fontWeight: 900 }}>Gold</div>
                    <div style={{ fontSize: 26, fontWeight: 950 }}>{revenueStats.gold}</div>
                    <div style={{ fontSize: 12, color: "#b45309" }}>₹{revenueStats.gold * 999}</div>
                  </CardBody>
                </Card>

                <Card>
                  <CardBody>
                    <div style={{ fontSize: 13, color: "#312e81", fontWeight: 900 }}>Platinum</div>
                    <div style={{ fontSize: 26, fontWeight: 950 }}>{revenueStats.platinum}</div>
                    <div style={{ fontSize: 12, color: "#4338ca" }}>₹{revenueStats.platinum * 1999}</div>
                  </CardBody>
                </Card>

                <Card>
                  <CardBody>
                    <div style={{ fontSize: 13, color: "#111827", fontWeight: 900 }}>Estimated MRR</div>
                    <div style={{ fontSize: 28, fontWeight: 950 }}>₹{revenueStats.totalRevenue}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>Active paid subscriptions</div>
                  </CardBody>
                </Card>

                <Card>
                  <CardBody>
                    <div style={{ fontSize: 13, color: "#be123c", fontWeight: 900 }}>AI Alert Triggers</div>
                    <div style={{ fontSize: 28, fontWeight: 950 }}>{revenueStats.alertCount}</div>
                    <div style={{ fontSize: 12, color: "#be123c" }}>
                      {revenueStats.unreadAlertCount} unread / recent 100
                    </div>
                  </CardBody>
                </Card>
              </Grid>
            </div>



            <div
              style={{
                border: "1px solid #fde68a",
                borderRadius: 18,
                padding: 12,
                background: "#ffffff",
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 950, marginBottom: 6 }}>
                ⚙️ Monetization Control Centre
              </div>

              <div style={{ fontSize: 13, color: "#92400e", fontWeight: 800, lineHeight: 1.6 }}>
                Current safe settings: Free vendors receive UI alerts only. Paid vendors unlock WhatsApp alerts,
                AI priority visibility, and stronger deal conversion advantage.
              </div>

              <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Badge>Free: UI alerts only</Badge>
                <Badge>Basic: low AI boost</Badge>
                <Badge>Silver: WhatsApp-ready</Badge>
                <Badge>Gold: priority alerts</Badge>
                <Badge>Platinum: maximum visibility</Badge>
              </div>
            </div>

            <div style={{ border: "1px solid #e5e7eb", borderRadius: 18, padding: 12 }}>
              <div style={{ fontSize: 18, fontWeight: 950, marginBottom: 10 }}>
                📊 Payment History
              </div>

              {paymentRecords && paymentRecords.length > 0 ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {paymentRecords.map((p: any) => (
                    <div
                      key={p.id}
                      style={{
                        border: "1px solid #eee",
                        borderRadius: 12,
                        padding: 12,
                        background: "#fafafa",
                      }}
                    >
                      <div style={{ fontWeight: 950 }}>
                        ₹{p.amount} — {String(p.subscription_plan).replaceAll("_", " ").toUpperCase()}
                      </div>

                      <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
                        User: {p.user_id}
                      </div>

                      <div style={{ fontSize: 12, color: "#555" }}>
                        Method: {p.payment_method}
                      </div>

                      {p.reference_no ? (
                        <div style={{ fontSize: 12, color: "#555" }}>
                          Ref: {p.reference_no}
                        </div>
                      ) : null}

                      <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>
                        {new Date(p.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="No payment records yet." />
              )}
            </div>

            <div
              style={{
                border: "1px solid #fde68a",
                borderRadius: 18,
                padding: 12,
                background: "#fffbeb",
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 950, marginBottom: 6 }}>
                Manual Subscription Activation
              </div>

              <div style={{ fontSize: 13, color: "#92400e", fontWeight: 800, marginBottom: 12 }}>
                Safe mode is active. After confirming manual payment, approve the requested vendor plan here.
              </div>

              {subscriptionRequests && subscriptionRequests.length > 0 ? (
                <Grid min={280} gap={12}>
                  {subscriptionRequests.map((r: any) => (
                    <Card key={r.user_id}>
                      <CardBody>
                        <div style={{ fontWeight: 900, fontSize: 15 }}>
                          {r.business_name || r.name || r.owner_name || r.user_id}
                        </div>

                        <div style={{ marginTop: 6, color: "#5b6472", fontSize: 13, lineHeight: 1.5 }}>
                          <div>User ID: <b>{r.user_id}</b></div>
                          <div>Requested Plan: <b>{String(r.subscription_plan || "free").replaceAll("_", " ").toUpperCase()}</b></div>
                          <div>Status: <b>{r.subscription_status || "requested"}</b></div>
                          {r.phone ? <div>Phone: <b>{r.phone}</b></div> : null}
                          {r.city || r.district ? (
                            <div>Location: <b>{[r.city, r.district].filter(Boolean).join(", ")}</b></div>
                          ) : null}
                        </div>
                      </CardBody>

                      <CardFooter>
                        <form action="/api/admin/update-subscription" method="POST" style={{ display: "grid", gap: 8, width: "100%" }}>
                          <input type="hidden" name="user_id" value={r.user_id} />
                          <input type="hidden" name="subscription_status" value="active" />

                          <label style={{ fontSize: 12, fontWeight: 800 }}>
                            Activate Plan
                            <select
                              name="subscription_plan"
                              defaultValue={r.subscription_plan || "basic_vendor"}
                              style={{
                                marginTop: 4,
                                width: "100%",
                                height: 38,
                                borderRadius: 10,
                                border: "1px solid #ddd",
                                padding: "0 10px",
                              }}
                            >
                              <option value="basic_vendor">Basic AI Boost</option>
                              <option value="silver_vendor">Silver AI Boost</option>
                              <option value="gold_vendor">Gold AI Boost</option>
                              <option value="platinum_vendor">Platinum AI Boost</option>
                              <option value="premium_vendor">Gold AI Boost (Legacy)</option>
                              <option value="hub_vendor">Platinum Hub Boost (Legacy)</option>
                              <option value="free">Free</option>
                            </select>
                          </label>

                          <label style={{ fontSize: 12, fontWeight: 800 }}>
                            Expiry Date
                            <input
                              type="date"
                              name="subscription_expires_at"
                              required
                              style={{
                                marginTop: 4,
                                width: "100%",
                                height: 38,
                                borderRadius: 10,
                                border: "1px solid #ddd",
                                padding: "0 10px",
                              }}
                            />
                          </label>

                          <label style={{ fontSize: 12, fontWeight: 800 }}>
                            Payment Reference / UPI / Bank Note
                            <input
                              type="text"
                              name="reference_no"
                              placeholder="Optional reference number"
                              style={{
                                marginTop: 4,
                                width: "100%",
                                height: 38,
                                borderRadius: 10,
                                border: "1px solid #ddd",
                                padding: "0 10px",
                              }}
                            />
                          </label>

                          <label style={{ fontSize: 12, fontWeight: 800 }}>
                            Admin Notes
                            <input
                              type="text"
                              name="notes"
                              placeholder="Optional notes"
                              style={{
                                marginTop: 4,
                                width: "100%",
                                height: 38,
                                borderRadius: 10,
                                border: "1px solid #ddd",
                                padding: "0 10px",
                              }}
                            />
                          </label>

                          <button
                            type="submit"
                            style={{
                              height: 40,
                              border: "none",
                              borderRadius: 12,
                              background: "#111827",
                              color: "white",
                              fontWeight: 900,
                              cursor: "pointer",
                            }}
                          >
                            Approve & Activate →
                          </button>
                        </form>
                      </CardFooter>
                    </Card>
                  ))}
                </Grid>
              ) : (
                <EmptyState message="No pending subscription activation requests." />
              )}
            </div>
          </div>
        )}

        

        {isMaster(role) && (
          <div style={{ marginTop: 16, border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>Master Data Entry</div>

            <Grid min={260} gap={12}>
              <Card>
                <CardBody>
                  <div style={{ fontWeight: 800 }}>Master Data Home</div>
                  <div style={{ fontSize: 13, opacity: 0.8, marginTop: 6 }}>
                    Central entry point for all master data
                  </div>
                </CardBody>
                <CardFooter>
                  <ActionButton href="/admin/dashboard/master-data" variant="primary">
                    Open →
                  </ActionButton>
                </CardFooter>
              </Card>
            </Grid>
          </div>
        )}

        <div style={{ marginTop: 16, opacity: 0.75, fontSize: 13 }}>
          Tip: If you get “Access denied”, confirm your role in <b>public.profiles.role</b>.
        </div>
      </Container>
    </main>
  );
}