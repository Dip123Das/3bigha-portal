import type { Session } from "@supabase/supabase-js";

import { mobileApiRequest } from "@/lib/api/request";

export type MobilePropertyUnitStatus =
  | "available"
  | "hold"
  | "booked"
  | "sold"
  | "blocked";

export type MobilePropertyDiscoveryProject = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  pincode: string | null;
  updatedAt: string | null;
  verifiedUnitCount: number;
  availableUnitCount: number;
  webPath: string;
};

export type MobilePropertyDiscoveryUnit = {
  id: string;
  catalogueId: string | null;
  unitCode: string | null;
  title: string | null;
  unitKind: string;
  tower: string | null;
  block: string | null;
  floorNumber: number | null;
  unitNumber: string | null;
  facing: string | null;
  status: MobilePropertyUnitStatus;
  price: number | null;
  plotAreaSqft: number | null;
  builtUpAreaSqft: number | null;
  carpetAreaSqft: number | null;
  superBuiltUpAreaSqft: number | null;
  dimensionLengthFt: number | null;
  dimensionWidthFt: number | null;
  boundaryNorth: string | null;
  boundarySouth: string | null;
  boundaryEast: string | null;
  boundaryWest: string | null;
  landVacancyStatus: string | null;
  existingStructureType: string | null;
  boundaryDemarcationType: string | null;
  trustStatus: "verified";
  listingId: string | null;
  listingWebPath: string | null;
  updatedAt: string | null;
};

export type MobilePropertyPublishedLayout = {
  id: string;
  version: number;
  name: string;
  canvasWidth: number;
  canvasHeight: number;
  placements: Array<{
    unitId: string;
    positionX: number;
    positionY: number;
    width: number;
    height: number;
    rotation: number;
    labelOverride: string | null;
  }>;
};

export type MobilePropertyProjectPreview = {
  project: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    city: string | null;
    district: string | null;
    state: string | null;
    updatedAt: string | null;
    webPath: string;
  };
  catalogues: Array<{
    id: string;
    kind: string;
    name: string;
    slug: string;
    sortOrder: number | null;
  }>;
  units: MobilePropertyDiscoveryUnit[];
  layout: MobilePropertyPublishedLayout | null;
};

export type MobilePropertyDiscovery = {
  generatedAt: string;
  projects: MobilePropertyDiscoveryProject[];
  selectedProject: MobilePropertyProjectPreview | null;
};

export async function loadPropertyDiscovery(
  session: Session,
  projectSlug?: string | null,
): Promise<MobilePropertyDiscovery> {
  const slug = projectSlug?.trim();
  const path = slug
    ? `/api/v1/mobile/property-discovery?slug=${encodeURIComponent(slug)}`
    : "/api/v1/mobile/property-discovery";

  return mobileApiRequest(
    session,
    path,
    {},
    "Property projects could not be loaded safely.",
  );
}
