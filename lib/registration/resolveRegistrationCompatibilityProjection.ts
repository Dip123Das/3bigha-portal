export type RegistrationCompatibilityRole =
  | "buyer"
  | "vendor"
  | "builder"
  | "hub_vendor"
  | "blogger"
  | "investor";

export type RegistrationCompatibilityInput = {
  role?: string | null;
  portalUseReason?: string | null;
  roleDisplayLabel?: string | null;
  natureOfBusiness?: string[] | null;
  projectedModules?: string[] | null;
  contactPerson?: string | null;
  phonePrimary?: string | null;
  city?: string | null;
  state?: string | null;
};

export type RegistrationCompatibilityProjection = {
  role: RegistrationCompatibilityRole;
  isVendor: boolean;
  portalUseReason: string;
  roleDisplayLabel: string;
  moduleGrants: string[];
  profilePatch: {
    onboarding_version: 2;
    onboarding_completed: true;
    portal_use_reason: string;
    role_display_label: string;
    full_name: string | null;
    phone: string | null;
    city: string | null;
    state: string | null;
  };
};

const ALLOWED_ROLES = new Set<RegistrationCompatibilityRole>([
  "buyer",
  "vendor",
  "builder",
  "hub_vendor",
  "blogger",
  "investor",
]);

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeRole(
  value: string | null | undefined
): RegistrationCompatibilityRole {
  const role = clean(value).toLowerCase() as RegistrationCompatibilityRole;

  if (!ALLOWED_ROLES.has(role)) {
    throw new Error(
      "Registration compatibility projection requires an existing permitted member role."
    );
  }

  return role;
}

function normalizeNature(value: string[] | null | undefined) {
  return Array.from(
    new Set(
      (Array.isArray(value) ? value : [])
        .map((item) => clean(item).toLowerCase())
        .filter(Boolean)
    )
  );
}

function derivePortalUseReason(
  role: RegistrationCompatibilityRole,
  nature: string[],
  supplied?: string | null
) {
  const existing = clean(supplied);
  if (existing) return existing;

  if (role === "builder") return "manage_builder_projects";
  if (role === "hub_vendor") return "operate_multiple_businesses";
  if (role === "blogger") return "publish_blog_or_news";
  if (role === "investor") return "invest_in_opportunities";
  if (role === "buyer") return "buy_products_or_services";

  if (nature.includes("materials")) return "sell_materials";
  if (nature.includes("services")) return "offer_services";
  if (nature.includes("rentals")) return "provide_rentals";
  if (nature.includes("property")) return "list_property_for_sale";
  if (nature.includes("blog")) return "publish_blog_or_news";

  return "operate_multiple_businesses";
}

function deriveRoleDisplayLabel(
  role: RegistrationCompatibilityRole,
  nature: string[],
  supplied?: string | null
) {
  const existing = clean(supplied);
  if (existing) return existing;

  if (role === "buyer") return "Buyer";
  if (role === "builder") return "Builder / Developer";
  if (role === "hub_vendor") return "Vendor Hub";
  if (role === "blogger") return "Blogger / Author";
  if (role === "investor") return "Investor";

  if (nature.length === 1) {
    if (nature[0] === "materials") return "Materials Vendor";
    if (nature[0] === "services") return "Service Vendor";
    if (nature[0] === "rentals") return "Rental Vendor";
    if (nature[0] === "property") {
      return "Property Vendor / Seller";
    }
    if (nature[0] === "blog") return "Blogger / Author";
  }

  return "Multi-Service Vendor";
}

function projectedModuleGrants(
  value: string[] | null | undefined
) {
  return Array.from(
    new Set(
      (Array.isArray(value) ? value : [])
        .map((item) => clean(item).toLowerCase())
        .filter(Boolean)
    )
  );
}

/**
 * Produces legacy compatibility fields from an already-authorised role.
 *
 * This resolver never selects, elevates or changes a member role.
 * The role must already have been established through the canonical
 * identity declaration and controlled-role transition system.
 */
export function resolveRegistrationCompatibilityProjection(
  input: RegistrationCompatibilityInput
): RegistrationCompatibilityProjection {
  const role = normalizeRole(input.role);
  const nature = normalizeNature(input.natureOfBusiness);

  const portalUseReason = derivePortalUseReason(
    role,
    nature,
    input.portalUseReason
  );

  const roleDisplayLabel = deriveRoleDisplayLabel(
    role,
    nature,
    input.roleDisplayLabel
  );

  const moduleGrants = projectedModuleGrants(
    input.projectedModules
  );

  return {
    role,
    isVendor: [
      "vendor",
      "builder",
      "hub_vendor",
      "blogger",
    ].includes(role),
    portalUseReason,
    roleDisplayLabel,
    moduleGrants,
    profilePatch: {
      onboarding_version: 2,
      onboarding_completed: true,
      portal_use_reason: portalUseReason,
      role_display_label: roleDisplayLabel,
      full_name: clean(input.contactPerson) || null,
      phone: clean(input.phonePrimary) || null,
      city: clean(input.city) || null,
      state: clean(input.state) || null,
    },
  };
}
