"use client";

import {
  MarketplaceIdentityHeader,
  useMarketplaceTrust,
} from "@/components/trust";
import { getMarketplaceIdentityFromMap } from "@/lib/trust";

type DiscoveryMemoryItem = {
  id: string;
  module: "property" | "materials" | "services" | "rentals";
  title: string;
  href: string;
  city?: string | null;
  district?: string | null;
  locality?: string | null;
};

type MarketplaceItem = {
  id: string;
  module: "Property" | "Material" | "Service" | "Rental";
  title: string;
  subtitle: string;
  meta: string;
  price: string;
  href: string;
  badge: string;
  image?: string | null;
  ownerUserId?: string | null;
};

type FeaturedListingsProps = {
  featuredItems: MarketplaceItem[];
  recentDiscovery: DiscoveryMemoryItem[];
  mobileExpanded: boolean;
};

function moduleIcon(module: MarketplaceItem["module"]) {
  switch (module) {
    case "Property":
      return "🏠";
    case "Material":
      return "🧱";
    case "Service":
      return "🛠️";
    case "Rental":
      return "🚜";
    default:
      return "📋";
  }
}

function discoveryLocation(item: DiscoveryMemoryItem) {
  return (
    [item.locality, item.city, item.district].filter(Boolean).join(", ") ||
    "Continue browsing"
  );
}

export default function FeaturedListings({
  featuredItems,
  recentDiscovery,
  mobileExpanded,
}: FeaturedListingsProps) {
  const ownerUserIds = featuredItems.map(
    (item) => item.ownerUserId
  );

  const { trustByUserId } =
    useMarketplaceTrust(ownerUserIds);

  return (
    <section className="contentSection">
      <div className="sectionHead">
        <div>
          <h2>Featured Listings</h2>
          <p>Fresh opportunities from our marketplace</p>
        </div>

        <a href="/search">View all listings →</a>
      </div>

      {recentDiscovery.length > 0 ? (
        <div className="personalFeedStrip">
          <div>
            <strong>Recommended for you</strong>
            <span>Based on recently viewed property interest</span>
          </div>

          <div className="personalFeedItems">
            {recentDiscovery.slice(0, 4).map((item) => (
              <a key={`${item.module}:${item.id}`} href={item.href}>
                <b>✨ {item.module}</b>
                <strong>{item.title}</strong>
                <small>{discoveryLocation(item)}</small>
              </a>
            ))}
          </div>
        </div>
      ) : null}

      <div
        className={`listingGrid premiumListingsGrid ${
          mobileExpanded ? "isMobileExpanded" : ""
        }`}
      >
        {featuredItems.map((item) => {
          const module =
            item.module === "Property"
              ? "property"
              : item.module === "Material"
              ? "materials"
              : item.module === "Service"
              ? "services"
              : "rentals";

          const marketplaceIdentity =
            item.ownerUserId
              ? getMarketplaceIdentityFromMap(
                  {
                    module,
                    ownerUserId: item.ownerUserId,
                    displayName:
                      module === "property"
                        ? "Property owner"
                        : module === "materials"
                        ? "Material vendor"
                        : module === "services"
                        ? "Service provider"
                        : "Rental provider",
                    subject:
                      module === "services"
                        ? "individual_professional"
                        : "business",
                  },
                  trustByUserId
                )
              : null;

          return (
          <a
            href={item.href}
            className="listingCard"
            key={`${item.module}-${item.id}`}
          >
            <div className="listingImage">
              {item.image ? (
                <img src={item.image} alt={item.title} />
              ) : (
                <b>{moduleIcon(item.module)}</b>
              )}

              <span>{item.badge}</span>
            </div>

            <div className="listingBody">
              <h3>{item.title}</h3>

              {marketplaceIdentity ? (
                <MarketplaceIdentityHeader
                  identity={marketplaceIdentity}
                  compact
                  showName={false}
                />
              ) : null}

              <p>📍 {item.subtitle}</p>
              <strong>{item.price}</strong>
              <small>{item.meta}</small>
            </div>
          </a>
          );
        })}
      </div>
    </section>
  );
}
