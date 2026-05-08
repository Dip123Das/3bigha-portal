import type { SeoModule } from "@/lib/geo/india-geo";

function moduleTitle(module: SeoModule) {
  if (module === "property") return "property";
  if (module === "materials") return "building materials";
  if (module === "services") return "construction services";
  return "rental services";
}

export function getAiMarketContent({
  module,
  area,
  city,
  district,
  state,
}: {
  module: SeoModule;
  area: string;
  city?: string;
  district?: string;
  state?: string;
}) {
  const title = moduleTitle(module);
  const location = [area, city, district, state].filter(Boolean).join(", ");

  if (module === "property") {
    return {
      heading: `Local property market in ${area}`,
      paragraphs: [
        `${area} is becoming an important local discovery area for land, plots, flats, houses, commercial property and builder projects. Buyers often search for jomi, bastu jomi, residential plots, road-side land, shop space and investment property around ${location}.`,
        `3Bigha helps users explore property opportunities in ${area} through regional SEO pages, live marketplace signals, RFQ workflows and local discovery links. This makes it easier for buyers, sellers, brokers, agents, builders and local property owners to connect in one marketplace flow.`,
        `For users searching property near me in ${area}, 3Bigha connects location, intent, listings, vendors and enquiries so that property discovery becomes more practical and locally relevant.`,
      ],
    };
  }

  if (module === "materials") {
    return {
      heading: `Local building material market in ${area}`,
      paragraphs: [
        `${area} has growing demand for cement, rod, balu, pathor, gitti, bricks, tiles, plumbing, electrical, sanitary, doors, janla, kather dorja, chimney, kitchen appliances and other construction materials. Local buyers often search using both formal and regional words such as balu, pathor, tep kol, dorja and rajmistri-related material needs.`,
        `3Bigha helps users find building material suppliers, dealers, shops, wholesalers and RFQ-ready vendors around ${location}. The platform connects material demand with local suppliers so users can compare availability, price intent and vendor response more easily.`,
        `For construction material searches in ${area}, the regional keyword engine and marketplace signals help users discover cement dealers, sand suppliers, stone chips providers, rod shops, tiles dealers, sanitary sellers and hardware stores in a more structured way.`,
      ],
    };
  }

  if (module === "services") {
    return {
      heading: `Local construction service market in ${area}`,
      paragraphs: [
        `${area} has demand for rajmistri, contractors, plumbers, electricians, painters, carpenters, aluminium workers, grill makers, false ceiling workers, waterproofing contractors, borewell services, renovation teams and turnkey construction providers.`,
        `3Bigha helps users discover construction service providers near ${location} through local search intent, RFQ workflows and connected marketplace pages. Users can search for service providers, post requirements and connect with relevant local professionals.`,
        `For home construction, renovation, plumbing, electrical work, painting, tiles fitting or contractor services in ${area}, 3Bigha builds a practical local discovery layer for both customers and service providers.`,
      ],
    };
  }

  return {
    heading: `Local rental marketplace in ${area}`,
    paragraphs: [
      `${area} has rental demand for houses, rooms, flats, shops, godowns, warehouses, JCB, excavators, mixers, shuttering materials, scaffolding, generators, tools and other construction equipment.`,
      `3Bigha helps users discover rental services around ${location}, including property rentals and construction equipment rentals. Users can search rental options, post requirements and connect with local providers through the marketplace workflow.`,
      `For JCB rent, mixer machine rent, shop rent, room rent, godown rent or construction equipment rental in ${area}, 3Bigha creates a local discovery route with RFQ and marketplace connectivity.`,
    ],
  };
}