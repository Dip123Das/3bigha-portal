import type {
  ThreeBOSAiContextAction,
  ThreeBOSAiPageContext,
} from "./types";

function routeAction(
  id: string,
  title: string,
  description: string,
  href: string,
  icon: string
): ThreeBOSAiContextAction {
  return {
    id,
    title,
    description,
    href,
    icon,
    source: "route",
    priority: "normal",
  };
}

export function resolveThreeBOSAiPageContext(
  rawPathname?: string | null
): ThreeBOSAiPageContext {
  const pathname =
    rawPathname?.trim() || "/";

  if (
    pathname.includes("/chat") ||
    pathname.includes("/inbox")
  ) {
    return {
      pathname,
      area: "chat",
      title: "Messages and conversations",
      description:
        "Review conversations, unread messages and pending replies.",
      suggestedActions: [
        routeAction(
          "open-inbox",
          "Open inbox",
          "Review conversations requiring your attention.",
          pathname.includes("/vendor")
            ? "/vendor/inbox-v2"
            : "/dashboard/inbox-v2",
          "💬"
        ),
      ],
    };
  }

  if (pathname.startsWith("/rfq")) {
    return {
      pathname,
      area: "rfq",
      title: "Requirement and quotation",
      description:
        "Create, improve or continue a procurement requirement.",
      suggestedActions: [
        routeAction(
          "continue-rfq",
          "Continue requirement",
          "Complete the requirement and proceed to vendor matching.",
          pathname,
          "📝"
        ),
        routeAction(
          "open-buyer-rfqs",
          "Review your RFQs",
          "Track quotations and vendor responses.",
          "/dashboard/buyer/rfqs",
          "📋"
        ),
      ],
    };
  }

  if (pathname.startsWith("/property")) {
    return {
      pathname,
      area: "property",
      title: "Property workspace",
      description:
        "Discover, publish or manage property opportunities.",
      suggestedActions: [
        routeAction(
          "browse-property",
          "Browse property",
          "Search available property listings.",
          "/property",
          "🏡"
        ),
        routeAction(
          "add-property",
          "Add property",
          "Create a new property listing.",
          "/property/add",
          "➕"
        ),
      ],
    };
  }

  if (pathname.startsWith("/materials")) {
    return {
      pathname,
      area: "materials",
      title: "Materials workspace",
      description:
        "Find materials, publish supply and request quotations.",
      suggestedActions: [
        routeAction(
          "browse-materials",
          "Browse materials",
          "Search construction material listings.",
          "/materials",
          "🧱"
        ),
        routeAction(
          "material-rfq",
          "Request material quotations",
          "Create a material procurement requirement.",
          "/materials/rfq",
          "📝"
        ),
      ],
    };
  }

  if (pathname.startsWith("/services")) {
    return {
      pathname,
      area: "services",
      title: "Services workspace",
      description:
        "Find professionals and construction service providers.",
      suggestedActions: [
        routeAction(
          "browse-services",
          "Find service providers",
          "Search contractors and professionals.",
          "/services",
          "👷"
        ),
      ],
    };
  }

  if (pathname.startsWith("/rentals")) {
    return {
      pathname,
      area: "rentals",
      title: "Rental workspace",
      description:
        "Find or publish construction equipment rentals.",
      suggestedActions: [
        routeAction(
          "browse-rentals",
          "Browse rentals",
          "Search available rental equipment.",
          "/rentals",
          "🚜"
        ),
      ],
    };
  }

  if (pathname.startsWith("/support")) {
    return {
      pathname,
      area: "support",
      title: "Support",
      description:
        "Get guided help or raise a support request.",
      suggestedActions: [
        routeAction(
          "new-support",
          "Raise support request",
          "Describe your issue and receive guided assistance.",
          "/support/new",
          "🛡️"
        ),
      ],
    };
  }

  if (pathname.startsWith("/admin")) {
    return {
      pathname,
      area: "admin",
      title: "Administration workspace",
      description:
        "Review governance, moderation and platform operations.",
      suggestedActions: [
        routeAction(
          "admin-dashboard",
          "Open admin dashboard",
          "Review platform operations.",
          "/admin/dashboard",
          "🛡️"
        ),
      ],
    };
  }

  if (pathname.startsWith("/dashboard/vendor")) {
    return {
      pathname,
      area: "vendor",
      title: "Business workspace",
      description:
        "Manage opportunities, quotations, listings and buyer conversations.",
      suggestedActions: [
        routeAction(
          "vendor-opportunities",
          "Review RFQ opportunities",
          "Respond to open buyer requirements.",
          "/vendor/inbox-v2",
          "📨"
        ),
        routeAction(
          "vendor-dashboard",
          "Open business dashboard",
          "Review business activity and priorities.",
          "/dashboard/vendor",
          "🏢"
        ),
      ],
    };
  }

  if (pathname.startsWith("/dashboard/buyer")) {
    return {
      pathname,
      area: "buyer",
      title: "Buying workspace",
      description:
        "Manage requirements, quotations and vendor conversations.",
      suggestedActions: [
        routeAction(
          "buyer-rfqs",
          "Review your RFQs",
          "Compare quotations and track responses.",
          "/dashboard/buyer/rfqs",
          "📋"
        ),
        routeAction(
          "create-rfq",
          "Create a new requirement",
          "Start a guided procurement request.",
          "/rfq",
          "📝"
        ),
      ],
    };
  }

  if (pathname.startsWith("/dashboard")) {
    return {
      pathname,
      area: "dashboard",
      title: "Workspace dashboard",
      description:
        "Review active work, priorities and recommended next steps.",
      suggestedActions: [
        routeAction(
          "open-dashboard",
          "Open workspace",
          "Review your active business work.",
          "/dashboard",
          "📊"
        ),
      ],
    };
  }

  return {
    pathname,
    area: "public",
    title: "3Bigha business platform",
    description:
      "Search property, materials, services, rentals and business opportunities.",
    suggestedActions: [
      routeAction(
        "smart-search",
        "Smart search",
        "Search across the 3Bigha marketplace.",
        "/search",
        "🔍"
      ),
      routeAction(
        "create-requirement",
        "Create requirement",
        "Tell vendors what you need.",
        "/rfq",
        "📝"
      ),
    ],
  };
}
