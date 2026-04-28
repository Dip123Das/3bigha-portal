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
          <div style={{ marginTop: 28, border: "1px solid #ddd", borderRadius: 14, padding: 16 }}>
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