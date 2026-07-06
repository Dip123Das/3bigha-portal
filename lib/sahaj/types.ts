export type SahajInputMode =
  | "type"
  | "photo"
  | "document"
  | "voice"
  | "guided";

export type SahajModule =
  | "rfq"
  | "property"
  | "materials"
  | "services"
  | "rentals"
  | "builder_projects"
  | "investment"
  | "vendor"
  | "buyer"
  | "procurement"
  | "search";

export type SahajRequirementItem = {
  name: string;
  quantity?: string | number | null;
  unit?: string | null;
  notes?: string | null;
};

export type SahajMediaAsset = {
  fileName: string;
  mimeType?: string | null;
  size?: number | null;
  url?: string | null;
  bucket?: string | null;
  objectPath?: string | null;
};

export type SahajLocation = {
  geo_state_id?: string | null;
  geo_district_id?: string | null;
  geo_subdivision_id?: string | null;
  geo_block_id?: string | null;
  geo_place_id?: string | null;
  state?: string | null;
  district?: string | null;
  city?: string | null;
  locality?: string | null;
  pincode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  h3_cell?: string | null;
};

export type SahajDeliveryDetails = {
  house?: string;
  road?: string;
  landmark?: string;
  gate?: string;
  floor?: string;
  instructions?: string;
};

export type UniversalRequirementObject = {
  intent: string;
  module: SahajModule;
  inputMode: SahajInputMode;
  rawInput?: string;
  extractedItems: SahajRequirementItem[];
  media: SahajMediaAsset[];
  location?: SahajLocation;
  delivery?: SahajDeliveryDetails;
  aiEnhancement?: Record<string, unknown>;
  review?: Record<string, unknown>;
};
