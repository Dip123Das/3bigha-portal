import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function VendorRecruitmentPage() {
  const { data } = await supabase
    .from("marketplace_vendor_recruitment_queue")
    .select("*")
    .order("opportunity_score", { ascending: false })
    .limit(200);

  return (
    <main className="p-6">
      <h1 className="text-3xl font-black">
        Vendor Recruitment Command Center
      </h1>

      <p className="mt-2 text-slate-600">
        Marketplace shortages requiring vendor acquisition.
      </p>

      <div className="mt-6 overflow-auto">
        <table className="min-w-full border">
          <thead>
            <tr className="bg-slate-100">
              <th className="border p-2">Module</th>
              <th className="border p-2">Score</th>
              <th className="border p-2">Need</th>
              <th className="border p-2">Priority</th>
              <th className="border p-2">Status</th>
            </tr>
          </thead>

          <tbody>
            {(data || []).map((row) => (
              <tr key={row.id}>
                <td className="border p-2">{row.module}</td>
                <td className="border p-2">{row.opportunity_score}</td>
                <td className="border p-2">
                  {row.recommended_vendor_count}
                </td>
                <td className="border p-2">
                  {row.priority}
                </td>
                <td className="border p-2">
                  {row.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
