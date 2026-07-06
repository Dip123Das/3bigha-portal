import type { SeoModule } from "@/lib/geo/india-geo";

export type SeoInternalLink = {
  label: string;
  href: string;
  intent: "geo" | "module" | "rfq" | "search";
};

function moduleTitle(module: SeoModule) {
  if (module === "property") return "Property";
  if (module === "materials") return "Building Materials";
  if (module === "services") return "Construction Services";
  return "Rental Services";
}

export function getCrossModuleSeoLinks({
  currentModule,
  state,
  district,
  city,
  locality,
  areaLabel,
}: {
  currentModule: SeoModule;
  state: string;
  district: string;
  city: string;
  locality?: string;
  areaLabel: string;
}): SeoInternalLink[] {
  const modules: SeoModule[] = ["property", "materials", "services", "rentals"];

  return modules
    .filter((module) => module !== currentModule)
    .map((module) => ({
      label: `${moduleTitle(module)} in ${areaLabel}`,
      href: locality
        ? `/seo/${module}/${state}/${district}/${city}/${locality}`
        : `/seo/${module}/${state}/${district}/${city}`,
      intent: "module" as const,
    }));
}

export function getIntentSeoLinks({
  module,
  areaLabel,
}: {
  module: SeoModule;
  areaLabel: string;
}): SeoInternalLink[] {
  return [
    {
      label: `Search ${moduleTitle(module)} in ${areaLabel}`,
      href: `/search?module=${module}&q=${encodeURIComponent(areaLabel)}`,
      intent: "search",
    },
    {
      label: `Post requirement in ${areaLabel}`,
      href: `/rfq?module=${module}&q=${encodeURIComponent(areaLabel)}`,
      intent: "rfq",
    },
  ];
}