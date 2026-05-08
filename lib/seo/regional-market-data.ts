import type { SeoModule } from "@/lib/geo/india-geo";

export type RegionalMarketStat = {
  label: string;
  value: string;
};

export type RegionalMarketListing = {
  title: string;
  subtitle: string;
};

export type RegionalMarketData = {
  stats: RegionalMarketStat[];
  listings: RegionalMarketListing[];
};

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function getRegionalMarketData(
  module: SeoModule,
  city: string,
  district: string
): RegionalMarketData {
  if (module === "property") {
    return {
      stats: [
        {
          label: "Active property listings",
          value: `${randomBetween(25, 180)}+`,
        },
        {
          label: "Local buyers",
          value: `${randomBetween(40, 300)}+`,
        },
        {
          label: "Builder projects",
          value: `${randomBetween(5, 40)}+`,
        },
        {
          label: "Property enquiries",
          value: `${randomBetween(20, 160)}+`,
        },
      ],

      listings: [
        {
          title: `Residential land in ${city}`,
          subtitle: `Buyer demand growing around ${district}`,
        },
        {
          title: `Commercial property opportunities`,
          subtitle: `Roadside and market-area interest`,
        },
        {
          title: `Builder projects near ${city}`,
          subtitle: `New regional development activity`,
        },
      ],
    };
  }

  if (module === "materials") {
    return {
      stats: [
        {
          label: "Material suppliers",
          value: `${randomBetween(12, 120)}+`,
        },
        {
          label: "Active quotations",
          value: `${randomBetween(15, 140)}+`,
        },
        {
          label: "Construction buyers",
          value: `${randomBetween(25, 220)}+`,
        },
        {
          label: "Vendor responses",
          value: `${randomBetween(20, 260)}+`,
        },
      ],

      listings: [
        {
          title: `Cement suppliers in ${city}`,
          subtitle: `Multiple local vendor options`,
        },
        {
          title: `Steel and TMT dealers`,
          subtitle: `Regional construction demand rising`,
        },
        {
          title: `Sand and brick suppliers`,
          subtitle: `Local infrastructure activity support`,
        },
      ],
    };
  }

  if (module === "services") {
    return {
      stats: [
        {
          label: "Service providers",
          value: `${randomBetween(15, 140)}+`,
        },
        {
          label: "Construction enquiries",
          value: `${randomBetween(18, 170)}+`,
        },
        {
          label: "Project support requests",
          value: `${randomBetween(8, 80)}+`,
        },
        {
          label: "Active contractors",
          value: `${randomBetween(10, 90)}+`,
        },
      ],

      listings: [
        {
          title: `Contractors in ${city}`,
          subtitle: `Civil and residential project support`,
        },
        {
          title: `Plumbers and electricians`,
          subtitle: `Local technical services available`,
        },
        {
          title: `Turnkey construction providers`,
          subtitle: `Project execution support in ${district}`,
        },
      ],
    };
  }

  return {
    stats: [
      {
        label: "Rental providers",
        value: `${randomBetween(8, 70)}+`,
      },
      {
        label: "Equipment requests",
        value: `${randomBetween(10, 100)}+`,
      },
      {
        label: "Rental enquiries",
        value: `${randomBetween(15, 130)}+`,
      },
      {
        label: "Machine availability",
        value: `${randomBetween(5, 60)}+`,
      },
    ],

    listings: [
      {
        title: `Construction machine rentals`,
        subtitle: `Local contractor equipment demand`,
      },
      {
        title: `Tool and equipment rentals`,
        subtitle: `Short-term project support`,
      },
      {
        title: `Property and room rentals`,
        subtitle: `Regional rental marketplace activity`,
      },
    ],
  };
}