// app/dashboard/investor/applications/page.tsx

import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { Card, CardHeader } from "@/components/ui/Card";

type ApplicationRow = {
  id: string;
  created_at: string | null;
  status?: string | null;
  opportunity_id?: string | null;
  investment_deal_rooms?:
    | { id: string }
    | { id: string }[]
    | null;
  investment_opportunities?:
    | { title?: string | null }
    | { title?: string | null }[]
    | null;
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

function getOpportunityTitle(row: ApplicationRow) {
  if (!row.investment_opportunities) return "Untitled opportunity";

  if (Array.isArray(row.investment_opportunities)) {
    return row.investment_opportunities[0]?.title || "Untitled opportunity";
  }

  return row.investment_opportunities.title || "Untitled opportunity";
}

function getDealRoomHref(row: ApplicationRow) {
  if (Array.isArray(row.investment_deal_rooms)) {
    const dealRoomId = row.investment_deal_rooms[0]?.id;
    return dealRoomId
      ? `/dashboard/investor/deal-rooms/${dealRoomId}`
      : "/dashboard/investor/deal-rooms";
  }

  if (row.investment_deal_rooms?.id) {
    return `/dashboard/investor/deal-rooms/${row.investment_deal_rooms.id}`;
  }

  return "/dashboard/investor/deal-rooms";
}

export default async function InvestorApplicationsPage() {
  const cookieStore = await cookies();
  const supabase = getSupabaseServerClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard/investor/applications");
  }

  const { data } = await supabase
    .from("investment_applications")
    .select(
      `
        id,
        created_at,
        status,
        opportunity_id,
        investment_opportunities(title),
        investment_deal_rooms(id)
      `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const applications = (data || []) as ApplicationRow[];

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Applications</h1>
        <p className="text-sm text-muted-foreground">
          Track all your investment applications.
        </p>
      </div>

      {applications.length === 0 ? (
        <Card className="rounded-2xl border bg-background">
          <CardHeader>
            <p className="text-sm text-muted-foreground">
              No applications found.
            </p>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-4">
          {applications.map((item) => (
            <Card key={item.id} className="rounded-2xl border bg-background">
              <CardHeader>
                <div className="flex justify-between gap-4">
                  <div>
                    <div className="font-semibold">
                      {getOpportunityTitle(item)}
                    </div>

                    <div className="mt-1 text-xs text-muted-foreground">
                      Applied: {fmtDate(item.created_at)}
                    </div>

                    {item.status && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        Status: {item.status}
                      </div>
                    )}
                  </div>

                    {getDealRoomHref(item) !== "/dashboard/investor/deal-rooms" ? (
                    <Link
                        href={getDealRoomHref(item)}
                        className="text-sm text-primary hover:underline"
                    >
                        Open
                    </Link>
                    ) : (
                    <span className="text-sm text-muted-foreground">
                        Processing
                    </span>
                    )}
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}