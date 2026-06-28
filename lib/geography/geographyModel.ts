import type { GeoSelection } from "@/components/geography/GeoSelector";
import { resolveGeography } from "./resolver";

export type GeographyModel = {
  country_code: "IN";

  state_id: string | null;
  state_name: string | null;
  state_slug: string | null;
  state_lgd_code: string | null;

  district_id: string | null;
  district_name: string | null;
  district_slug: string | null;
  district_lgd_code: string | null;

  admin_level_1_id: string | null;
  admin_level_1_name: string | null;
  admin_level_1_slug: string | null;
  admin_level_1_lgd_code: string | null;
  admin_level_1_label: string;

  admin_level_2_id: string | null;
  admin_level_2_name: string | null;
  admin_level_2_slug: string | null;
  admin_level_2_lgd_code: string | null;
  admin_level_2_label: string;

  settlement_id: string | null;
  settlement_name: string | null;
  settlement_slug: string | null;
  settlement_lgd_code: string | null;
  settlement_type: string | null;
  settlement_label: string;

  pincode: string | null;
  is_urban: boolean;
  is_rural: boolean;

  display_path: string[];
};

export function buildGeographyModel(selection?: GeoSelection): GeographyModel {
  const s = selection || {};
  const resolved = resolveGeography(s);

  return {
    country_code: "IN",

    state_id: s.state?.id || null,
    state_name: s.state?.name || null,
    state_slug: s.state?.slug || null,
    state_lgd_code: (s.state as any)?.lgd_code || null,

    district_id: s.district?.id || null,
    district_name: s.district?.name || null,
    district_slug: s.district?.slug || null,
    district_lgd_code: (s.district as any)?.lgd_code || null,

    admin_level_1_id: s.subdivision?.id || null,
    admin_level_1_name: s.subdivision?.name || null,
    admin_level_1_slug: s.subdivision?.slug || null,
    admin_level_1_lgd_code: (s.subdivision as any)?.lgd_code || null,
    admin_level_1_label: resolved.labels.admin1,

    admin_level_2_id: s.block?.id || null,
    admin_level_2_name: s.block?.name || null,
    admin_level_2_slug: s.block?.slug || null,
    admin_level_2_lgd_code: (s.block as any)?.lgd_code || null,
    admin_level_2_label: resolved.labels.admin2,

    settlement_id: s.place?.id || null,
    settlement_name: s.place?.name || null,
    settlement_slug: s.place?.slug || null,
    settlement_lgd_code: (s.place as any)?.lgd_code || null,
    settlement_type: s.place?.place_type || null,
    settlement_label: resolved.labels.settlement,

    pincode: s.place?.pincode || null,
    is_urban: resolved.isUrban,
    is_rural: resolved.isRural,

    display_path: resolved.displayPath,
  };
}
