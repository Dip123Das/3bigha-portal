import Link from "next/link";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

async function addRegion(formData: FormData) {
  "use server";

  const cookieStore = await cookies();
  const supabase = getSupabaseServerClient(cookieStore);

  const state = String(formData.get("state") || "").trim();
  const district = String(formData.get("district") || "").trim() || null;
  const city = String(formData.get("city") || "").trim() || null;
  const block = String(formData.get("block") || "").trim() || null;
  const mouza = String(formData.get("mouza") || "").trim() || null;
  const warning_note = String(formData.get("warning_note") || "").trim() || null;
  const is_verified = String(formData.get("is_verified") || "") === "on";

  const slugBase = [state, district, city, block, mouza]
    .filter(Boolean)
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  if (!state || !slugBase) return;

  await supabase.from("measurement_regions").upsert(
    {
      state,
      district,
      city,
      block,
      mouza,
      region_slug: slugBase,
      warning_note,
      is_verified,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "region_slug" }
  );

  revalidatePath("/admin/dashboard/master-data/measurement");
  revalidatePath("/land-area-calculator");
}

async function addUnit(formData: FormData) {
  "use server";

  const cookieStore = await cookies();
  const supabase = getSupabaseServerClient(cookieStore);

  const region_id = String(formData.get("region_id") || "").trim();
  const unit_name = String(formData.get("unit_name") || "").trim();
  const sqft_value = Number(formData.get("sqft_value") || 0);
  const notes = String(formData.get("notes") || "").trim() || null;
  const aliasesRaw = String(formData.get("aliases") || "").trim();
  const is_verified = String(formData.get("is_verified") || "") === "on";

  const unit_slug = unit_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  if (!region_id || !unit_name || !unit_slug || !Number.isFinite(sqft_value) || sqft_value <= 0) {
    return;
  }

  const aliases = aliasesRaw
    ? aliasesRaw.split(",").map((item) => item.trim()).filter(Boolean)
    : [];

  await supabase.from("measurement_units").upsert(
    {
      region_id,
      unit_name,
      unit_slug,
      sqft_value,
      sqm_value: sqft_value / 10.7639104167,
      acre_value: sqft_value / 43560,
      hectare_value: sqft_value / 107639.104167,
      aliases,
      notes,
      is_verified,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "region_id,unit_slug" }
  );

  revalidatePath("/admin/dashboard/master-data/measurement");
  revalidatePath("/land-area-calculator");
}

export default async function MeasurementMasterDataPage() {
  const cookieStore = await cookies();
  const supabase = getSupabaseServerClient(cookieStore);

  const { data: regions } = await supabase
    .from("measurement_regions")
    .select("*")
    .order("state", { ascending: true })
    .order("district", { ascending: true });

  const { data: units } = await supabase
    .from("measurement_units")
    .select("*, measurement_regions(state,district,city,block,mouza,region_slug)")
    .order("unit_name", { ascending: true });

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <section className="rounded-3xl border bg-white p-5 shadow-sm md:p-7">
        <p className="text-sm font-semibold text-emerald-700">Master Data</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-950 md:text-4xl">
          Measurement Master Data
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 md:text-base">
          Add district/city measurement regions and local land measurement scales for the public calculator.
        </p>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <section className="rounded-3xl border bg-slate-50 p-5">
            <div className="text-xs font-bold uppercase text-emerald-700">Control Part 1</div>
            <h2 className="mt-2 text-xl font-black text-slate-950">
              Add States, Districts, Cities / Blocks
            </h2>

            <form action={addRegion} className="mt-4 grid gap-3">
              <input name="state" required placeholder="State / Union Territory *" className="rounded-2xl border px-4 py-3 text-sm" />
              <input name="district" placeholder="District" className="rounded-2xl border px-4 py-3 text-sm" />
              <input name="city" placeholder="City / Local town" className="rounded-2xl border px-4 py-3 text-sm" />
              <input name="block" placeholder="Block" className="rounded-2xl border px-4 py-3 text-sm" />
              <input name="mouza" placeholder="Mouza / Local area" className="rounded-2xl border px-4 py-3 text-sm" />
              <textarea name="warning_note" placeholder="Local warning / note" className="min-h-24 rounded-2xl border px-4 py-3 text-sm" />
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <input name="is_verified" type="checkbox" /> Mark as verified
              </label>
              <button type="submit" className="rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white">
                Save Region
              </button>
            </form>
          </section>

          <section className="rounded-3xl border bg-slate-50 p-5">
            <div className="text-xs font-bold uppercase text-blue-700">Control Part 2</div>
            <h2 className="mt-2 text-xl font-black text-slate-950">
              Add Local Measuring Scale / Unit Ratio
            </h2>

            <form action={addUnit} className="mt-4 grid gap-3">
              <select name="region_id" required className="rounded-2xl border px-4 py-3 text-sm">
                <option value="">Select region *</option>
                {(regions || []).map((region: any) => (
                  <option key={region.id} value={region.id}>
                    {[region.state, region.district, region.city, region.block, region.mouza]
                      .filter(Boolean)
                      .join(" / ") || region.region_slug}
                  </option>
                ))}
              </select>
              <input name="unit_name" required placeholder="Local unit name *" className="rounded-2xl border px-4 py-3 text-sm" />
              <input name="sqft_value" required type="number" step="0.0001" placeholder="Value in square feet *" className="rounded-2xl border px-4 py-3 text-sm" />
              <input name="aliases" placeholder="Aliases, comma separated" className="rounded-2xl border px-4 py-3 text-sm" />
              <textarea name="notes" placeholder="Unit note / local practice explanation" className="min-h-24 rounded-2xl border px-4 py-3 text-sm" />
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <input name="is_verified" type="checkbox" /> Mark as verified
              </label>
              <button type="submit" className="rounded-2xl bg-blue-700 px-4 py-3 text-sm font-bold text-white">
                Save Unit
              </button>
            </form>
          </section>
        </div>

        <section className="mt-6 rounded-3xl border bg-white p-5">
          <h2 className="text-lg font-black text-slate-950">Saved Regions</h2>
          <div className="mt-3 grid gap-2">
            {(regions || []).map((region: any) => (
              <div key={region.id} className="rounded-2xl border bg-slate-50 p-3 text-sm">
                <b>{[region.state, region.district, region.city, region.block, region.mouza].filter(Boolean).join(" / ")}</b>
                <div className="text-xs text-slate-500">{region.region_slug} · {region.is_verified ? "Verified" : "Unverified"}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-3xl border bg-white p-5">
          <h2 className="text-lg font-black text-slate-950">Saved Local Units</h2>
          <div className="mt-3 grid gap-2">
            {(units || []).map((unit: any) => (
              <div key={unit.id} className="rounded-2xl border bg-slate-50 p-3 text-sm">
                <b>{unit.unit_name}</b> · {Number(unit.sqft_value).toLocaleString("en-IN")} sqft
                <div className="text-xs text-slate-500">
                  {unit.measurement_regions?.region_slug} · {unit.is_verified ? "Verified" : "Unverified"}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/land-area-calculator" className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white">
            Open Public Calculator
          </Link>
          <Link href="/admin/dashboard" className="rounded-2xl border px-4 py-3 text-sm font-bold text-slate-700">
            Back to Admin Dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
