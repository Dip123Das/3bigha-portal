export type VendorAuthorityEntityType =
  | "vendor"
  | "location"
  | "service"
  | "material"
  | "category"
  | "trust_signal"
  | "rfq_intent";

export type VendorAuthorityNode = {
  id: string;
  type: VendorAuthorityEntityType;
  label: string;
  slug: string;
  description?: string;
  score?: number;
  metadata?: Record<string, string | number | boolean | null>;
};

export type VendorAuthorityEdge = {
  from: string;
  to: string;
  relation:
    | "serves_location"
    | "supplies_material"
    | "offers_service"
    | "belongs_to_category"
    | "has_trust_signal"
    | "matches_rfq_intent"
    | "related_to";
  weight: number;
  reason?: string;
};

export type VendorAuthorityGraph = {
  nodes: VendorAuthorityNode[];
  edges: VendorAuthorityEdge[];
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildVendorAuthorityGraph(input: {
  vendorId: string;
  businessName: string;
  city?: string | null;
  district?: string | null;
  state?: string | null;
  locality?: string | null;
  categories?: string[];
  services?: string[];
  materials?: string[];
  trustSignals?: string[];
  rfqIntents?: string[];
  reputationScore?: number | null;
}): VendorAuthorityGraph {
  const nodes: VendorAuthorityNode[] = [];
  const edges: VendorAuthorityEdge[] = [];

  const vendorSlug = slugify(input.businessName || input.vendorId);
  const vendorNodeId = `vendor:${input.vendorId}`;

  nodes.push({
    id: vendorNodeId,
    type: "vendor",
    label: input.businessName,
    slug: vendorSlug,
    score: input.reputationScore ?? 0,
    description: `${input.businessName} marketplace authority profile`,
    metadata: {
      vendorId: input.vendorId,
      city: input.city || null,
      district: input.district || null,
      state: input.state || null,
      locality: input.locality || null,
    },
  });

  const addNodeWithEdge = (
    type: VendorAuthorityEntityType,
    label: string,
    relation: VendorAuthorityEdge["relation"],
    weight: number
  ) => {
    const cleanLabel = label.trim();
    if (!cleanLabel) return;

    const nodeId = `${type}:${slugify(cleanLabel)}`;

    if (!nodes.some((node) => node.id === nodeId)) {
      nodes.push({
        id: nodeId,
        type,
        label: cleanLabel,
        slug: slugify(cleanLabel),
      });
    }

    edges.push({
      from: vendorNodeId,
      to: nodeId,
      relation,
      weight,
      reason: `${input.businessName} is connected with ${cleanLabel}`,
    });
  };

  [input.locality, input.city, input.district, input.state]
    .filter(Boolean)
    .forEach((location) =>
      addNodeWithEdge("location", String(location), "serves_location", 0.9)
    );

  (input.categories || []).forEach((category) =>
    addNodeWithEdge("category", category, "belongs_to_category", 0.85)
  );

  (input.services || []).forEach((service) =>
    addNodeWithEdge("service", service, "offers_service", 0.8)
  );

  (input.materials || []).forEach((material) =>
    addNodeWithEdge("material", material, "supplies_material", 0.8)
  );

  (input.trustSignals || []).forEach((signal) =>
    addNodeWithEdge("trust_signal", signal, "has_trust_signal", 0.75)
  );

  (input.rfqIntents || []).forEach((intent) =>
    addNodeWithEdge("rfq_intent", intent, "matches_rfq_intent", 0.7)
  );

  return { nodes, edges };
}

export function getVendorAuthorityScore(graph: VendorAuthorityGraph) {
  const edgeScore = graph.edges.reduce((sum, edge) => sum + edge.weight, 0);
  const nodeScore = graph.nodes.length * 0.15;

  return Math.min(100, Math.round((edgeScore + nodeScore) * 10));
}

export function getVendorAuthoritySummary(graph: VendorAuthorityGraph) {
  const vendor = graph.nodes.find((node) => node.type === "vendor");

  const locations = graph.nodes
    .filter((node) => node.type === "location")
    .map((node) => node.label);

  const categories = graph.nodes
    .filter((node) => node.type === "category")
    .map((node) => node.label);

  const services = graph.nodes
    .filter((node) => node.type === "service")
    .map((node) => node.label);

  const materials = graph.nodes
    .filter((node) => node.type === "material")
    .map((node) => node.label);

  const trustSignals = graph.nodes
    .filter((node) => node.type === "trust_signal")
    .map((node) => node.label);

  return {
    vendorName: vendor?.label || "Vendor",
    authorityScore: getVendorAuthorityScore(graph),
    locations,
    categories,
    services,
    materials,
    trustSignals,
    summary: `${vendor?.label || "This vendor"} has marketplace authority across ${[
      ...locations,
      ...categories,
      ...services,
      ...materials,
    ]
      .slice(0, 6)
      .join(", ")}.`,
  };
}