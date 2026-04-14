// app/dashboard/investor/page.tsx

import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { Card, CardHeader } from "@/components/ui/Card";

type OpportunityRow = {
  id: string;
  title: string | null;
  created_at: string | null;
  status?: string | null;
};

type ApplicationRow = {
  id: string;
  created_at: string | null;
  status?: string | null;
  opportunity_id?: string | null;
  investment_opportunities?:
    | {
        title?: string | null;
      }
    | {
        title?: string | null;
      }[]
    | null;
};

type DealRoomRow = {
  id: string;
  created_at: string | null;
  stage?: string | null;
  opportunity_id?: string | null;
};

function fmtDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getOpportunityTitleFromApplication(row: ApplicationRow) {
  if (!row.investment_opportunities) return "Untitled opportunity";

  if (Array.isArray(row.investment_opportunities)) {
    return row.investment_opportunities[0]?.title || "Untitled opportunity";
  }

  return row.investment_opportunities.title || "Untitled opportunity";
}

function ActionLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-xl border px-4 py-2 text-sm font-medium transition hover:bg-muted"
    >
      {label}
    </Link>
  );
}

export default async function InvestorDashboardPage() {
  const cookieStore = await cookies();
  const supabase = getSupabaseServerClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard/investor");
  }

  const [opportunitiesRes, applicationsRes, dealRoomsRes] = await Promise.all([
    supabase
      .from("investment_opportunities")
      .select("id, title, created_at, status")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false })
      .limit(5),

    supabase
      .from("investment_applications")
      .select(
        "id, created_at, status, opportunity_id, investment_opportunities(title)"
      )
      .eq("investor_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),

    supabase
      .from("investment_deal_rooms")
      .select("id, created_at, stage, opportunity_id")
      .eq("investor_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const opportunities = (opportunitiesRes.data || []) as OpportunityRow[];
  const applications = (applicationsRes.data || []) as ApplicationRow[];
  const dealRooms = (dealRoomsRes.data || []) as DealRoomRow[];

  const stats = [
    {
      label: "Investment Opportunities",
      value: opportunities.length,
      href: "/dashboard/investor/opportunities",
    },
    {
      label: "Applications",
      value: applications.length,
      href: "/dashboard/investor/applications",
    },
    {
      label: "Deal Rooms",
      value: dealRooms.length,
      href: "/dashboard/investor/deal-rooms",
    },
  ];

  return (
    <div className="container mx-auto space-y-6 px-4 py-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Investor Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Manage your opportunities, applications, and active deal rooms.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <ActionLink
            href="/dashboard/investor/opportunities"
            label="View Opportunities"
          />
          <ActionLink
            href="/dashboard/investor/applications"
            label="View Applications"
          />
          <ActionLink
            href="/dashboard/investor/deal-rooms"
            label="View Deal Rooms"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((item) => (
          <Card key={item.label} className="rounded-2xl border bg-background">
            <CardHeader>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    {item.label}
                  </div>
                  <div className="mt-2 text-3xl font-bold">{item.value}</div>
                </div>

                <Link
                  href={item.href}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Open
                </Link>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="rounded-2xl border bg-background">
          <CardHeader>
            <div className="text-lg font-semibold">Investment Opportunities</div>
          </CardHeader>

          <div className="px-6 pb-6">
            {opportunities.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No investment opportunities created yet.
              </p>
            ) : (
              <div className="space-y-3">
                {opportunities.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3 rounded-xl border p-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">
                        {item.title || "Untitled opportunity"}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Created: {fmtDate(item.created_at)}
                      </div>
                      {item.status ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Status: {item.status}
                        </div>
                      ) : null}
                    </div>

                    <Link
                      href="/dashboard/investor/opportunities"
                      className="shrink-0 text-sm text-primary hover:underline"
                    >
                      View
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card className="rounded-2xl border bg-background">
          <CardHeader>
            <div className="text-lg font-semibold">Applications</div>
          </CardHeader>

          <div className="px-6 pb-6">
            {applications.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No applications submitted yet.
              </p>
            ) : (
              <div className="space-y-3">
                {applications.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3 rounded-xl border p-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">
                        {getOpportunityTitleFromApplication(item)}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Applied: {fmtDate(item.created_at)}
                      </div>
                      {item.status ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Status: {item.status}
                        </div>
                      ) : null}
                    </div>

                    <Link
                      href="/dashboard/investor/applications"
                      className="shrink-0 text-sm text-primary hover:underline"
                    >
                      View
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card className="rounded-2xl border bg-background">
          <CardHeader>
            <div className="text-lg font-semibold">Deal Rooms</div>
          </CardHeader>

          <div className="px-6 pb-6">
            {dealRooms.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No active deal rooms yet.
              </p>
            ) : (
              <div className="space-y-3">
                {dealRooms.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3 rounded-xl border p-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">
                        Deal Room #{item.id.slice(0, 8)}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Started: {fmtDate(item.created_at)}
                      </div>
                      {item.stage ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Stage: {item.stage}
                        </div>
                      ) : null}
                    </div>

                    <Link
                      href={`/dashboard/investor/deal-rooms/${item.id}`}
                      className="shrink-0 text-sm text-primary hover:underline"
                    >
                      Open
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}