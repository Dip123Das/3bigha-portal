import type { SeoModule } from "@/lib/geo/india-geo";

export type MarketSignal = {
  label: string;
  value: string;
  trend?: "up" | "down" | "stable";
};

export type MarketInsight = {
  title: string;
  description: string;
};

function randomRange(min: number, max: number) {
  return Math.floor(
    Math.random() * (max - min + 1)
  ) + min;
}

export function getLiveMarketSignals({
  module,
  area,
}: {
  module: SeoModule;
  area: string;
}) {
  if (module === "property") {
    return [
      {
        label: "Active property searches",
        value: `${randomRange(90, 480)}+`,
        trend: "up",
      },
      {
        label: "Property enquiries",
        value: `${randomRange(20, 110)}+`,
        trend: "up",
      },
      {
        label: "Land demand growth",
        value: `${randomRange(12, 42)}%`,
        trend: "up",
      },
      {
        label: "Builders & brokers active",
        value: `${randomRange(10, 70)}+`,
        trend: "stable",
      },
    ];
  }

  if (module === "materials") {
    return [
      {
        label: "Material suppliers active",
        value: `${randomRange(30, 220)}+`,
        trend: "up",
      },
      {
        label: "Daily material searches",
        value: `${randomRange(100, 600)}+`,
        trend: "up",
      },
      {
        label: "RFQs for cement & rod",
        value: `${randomRange(10, 90)}+`,
        trend: "up",
      },
      {
        label: "Construction material demand",
        value: `${randomRange(18, 48)}%`,
        trend: "up",
      },
    ];
  }

  if (module === "services") {
    return [
      {
        label: "Service providers active",
        value: `${randomRange(20, 180)}+`,
        trend: "up",
      },
      {
        label: "Contractor enquiries",
        value: `${randomRange(15, 95)}+`,
        trend: "up",
      },
      {
        label: "Rajmistri demand",
        value: `${randomRange(12, 38)}%`,
        trend: "up",
      },
      {
        label: "Home construction activity",
        value: `${randomRange(20, 60)}%`,
        trend: "stable",
      },
    ];
  }

  return [
    {
      label: "Rental enquiries",
      value: `${randomRange(15, 90)}+`,
      trend: "up",
    },
    {
      label: "Equipment rentals active",
      value: `${randomRange(10, 70)}+`,
      trend: "up",
    },
    {
      label: "JCB & machine demand",
      value: `${randomRange(8, 32)}%`,
      trend: "up",
    },
    {
      label: "Rental listing growth",
      value: `${randomRange(15, 44)}%`,
      trend: "stable",
    },
  ];
}

export function getMarketInsights({
  module,
  area,
}: {
  module: SeoModule;
  area: string;
}): MarketInsight[] {
  if (module === "property") {
    return [
      {
        title: "Land demand increasing",
        description:
          `${area} is witnessing increased searches for residential plots, bastu jomi and roadside commercial land.`,
      },
      {
        title: "Investment interest growing",
        description:
          `Property investors are actively exploring long-term land and housing opportunities around ${area}.`,
      },
    ];
  }

  if (module === "materials") {
    return [
      {
        title: "Construction material demand rising",
        description:
          `Cement, rod, balu, pathor and tiles searches are increasing rapidly around ${area}.`,
      },
      {
        title: "Supplier competition increasing",
        description:
          `More local dealers and suppliers are joining the marketplace around ${area}.`,
      },
    ];
  }

  if (module === "services") {
    return [
      {
        title: "Contractor activity trending",
        description:
          `Demand for rajmistri, plumbers, electricians and renovation workers is increasing near ${area}.`,
      },
      {
        title: "Turnkey construction interest growing",
        description:
          `Users are increasingly searching for complete home construction services around ${area}.`,
      },
    ];
  }

  return [
    {
      title: "Rental demand expanding",
      description:
        `JCB rentals, room rent and equipment rental searches are growing near ${area}.`,
    },
    {
      title: "Construction equipment activity rising",
      description:
        `More users are searching for machine rentals and temporary construction support in ${area}.`,
    },
  ];
}