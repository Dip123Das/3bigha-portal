import Link from "next/link";

export default function ProcurementAssistantLink({
  query,
  city,
  district,
  locality,
  module,
  category,
}: {
  query: string;
  city?: string | null;
  district?: string | null;
  locality?: string | null;
  module?: string | null;
  category?: string | null;
}) {
  const params = new URLSearchParams();

  params.set("q", query || "marketplace requirement");
  if (city) params.set("city", city);
  if (district) params.set("district", district);
  if (locality) params.set("locality", locality);
  if (module) params.set("module", module);
  if (category) params.set("category", category);

  return (
    <Link
      href={`/vendor/discovery?${params.toString()}`}
      className="topBtn topBtnPrimary"
      style={{ textDecoration: "none", marginTop: 10 }}
    >
      Ask AI Workflow Assistant →
    </Link>
  );
}