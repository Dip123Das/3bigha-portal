import type { TaxonomyNode } from "./types";

function service(label: string, group: string, keywords: string[] = []): TaxonomyNode {
  const slug = label.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const query = label.toLowerCase();

  return {
    label,
    slug,
    query,
    group,
    module: "services",
    href: `/services?q=${encodeURIComponent(query)}`,
    keywords: [query, slug, ...keywords],
  };
}

export const serviceTaxonomy: TaxonomyNode[] = [
  service("Engineering", "Professional / Skilled", ["civil engineer", "structural engineer"]),
  service("Architecture", "Professional / Skilled", ["architect", "building design"]),
  service("Design", "Professional / Skilled", ["planning", "drawing"]),
  service("Project Management", "Professional / Skilled", ["project", "supervision"]),
  service("Estimation", "Professional / Skilled", ["estimate", "boq"]),
  service("Testing", "Professional / Skilled", ["material testing", "soil testing"]),
  service("Surveying", "Professional / Skilled", ["land survey", "site survey"]),
  service("MEP", "Professional / Skilled", ["mechanical electrical plumbing"]),
  service("Contracting", "Professional / Skilled", ["contractor", "turnkey"]),
  service("Masonry", "Professional / Skilled", ["mason", "rajmistri"]),
  service("Carpentry", "Professional / Skilled", ["wood work"]),
  service("Electrical", "Professional / Skilled", ["electrician"]),
  service("Plumbing", "Professional / Skilled", ["plumber"]),
  service("Painting", "Professional / Skilled", ["painter"]),
  service("Flooring", "Professional / Skilled", ["tiles", "floor work"]),
  service("Fabrication", "Professional / Skilled", ["grill", "steel fabrication"]),
  service("Roofing", "Professional / Skilled", ["roof work"]),
  service("Operators", "Professional / Skilled", ["machine operator"]),
  service("Manpower", "Professional / Skilled", ["labour", "worker"]),
  service("Maintenance", "Professional / Skilled", ["repair"]),
  service("Interior", "Professional / Skilled", ["interior work"]),
  service("Security", "Professional / Skilled", ["security systems"]),
  service("Safety", "Professional / Skilled", ["site safety"]),
  service("Renewable", "Professional / Skilled", ["solar"]),
  service("Water", "Professional / Skilled", ["water supply", "boring"]),

  service("Documentation", "Legal", ["registry", "mutation"]),
  service("Advisory", "Legal", ["legal advice"]),
  service("Valuation", "Legal", ["property valuation"]),
  service("Banking", "Legal", ["loan", "finance"]),
  service("Legal Survey", "Legal", ["land survey", "legal measurement"]),
];
