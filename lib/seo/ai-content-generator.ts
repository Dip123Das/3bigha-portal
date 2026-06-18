function clean(value: unknown) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function lower(value: unknown) {
  return clean(value).toLowerCase();
}

export function getSeoDemandCategory(requirement: string) {
  const text = lower(requirement);

  if (
    text.includes("cement") ||
    text.includes("opc") ||
    text.includes("ppc") ||
    text.includes("psc") ||
    text.includes("brick") ||
    text.includes("block") ||
    text.includes("sand") ||
    text.includes("stone") ||
    text.includes("aggregate") ||
    text.includes("gravel") ||
    text.includes("steel") ||
    text.includes("bar") ||
    text.includes("sheet") ||
    text.includes("pipe")
  ) {
    return "materials";
  }

  if (
    text.includes("jcb") ||
    text.includes("rental") ||
    text.includes("excavator") ||
    text.includes("loader") ||
    text.includes("pump") ||
    text.includes("scaffolding") ||
    text.includes("mixer") ||
    text.includes("crane") ||
    text.includes("hoist") ||
    text.includes("generator") ||
    text.includes("dg set") ||
    text.includes("machine")
  ) {
    return "rentals";
  }

  if (
    text.includes("property") ||
    text.includes("seller") ||
    text.includes("plot") ||
    text.includes("land") ||
    text.includes("house") ||
    text.includes("flat") ||
    text.includes("builder")
  ) {
    return "property";
  }

  return "services";
}

export function generateDemandContent(requirement: string, location: string) {
  const req = clean(requirement) || "local vendors";
  const loc = clean(location) || "this area";
  const category = getSeoDemandCategory(req);
  const reqLower = lower(req);

  if (category === "materials") {
    if (reqLower.includes("cement") || reqLower.includes("opc") || reqLower.includes("ppc")) {
      return {
        heading: `Construction material demand for ${req} in ${loc}`,
        paragraphs: [
          `${req} suppliers in ${loc} are important for house construction, masonry work, plastering, RCC activity, boundary walls and small commercial building projects.`,
          `Contractors, builders and property owners usually prefer suppliers who can maintain stock, arrange timely delivery and support repeat purchase requirements during active construction periods.`,
          `A visible 3Bigha business profile helps local material vendors receive enquiries from buyers searching for reliable supply options near ${loc}.`,
        ],
      };
    }

    if (reqLower.includes("brick") || reqLower.includes("block")) {
      return {
        heading: `Local block and brick supply opportunity in ${loc}`,
        paragraphs: [
          `${req} demand in ${loc} is connected with new house construction, partition work, boundary walls, renovation projects and small real estate development activity.`,
          `Buyers generally look for consistent quality, transport support, clear pricing and availability during foundation and wall construction stages.`,
          `Suppliers serving ${loc} can improve discovery by listing their business, delivery area and product availability on 3Bigha.`,
        ],
      };
    }

    if (reqLower.includes("sand") || reqLower.includes("stone") || reqLower.includes("aggregate") || reqLower.includes("gravel")) {
      return {
        heading: `Bulk material supply demand in ${loc}`,
        paragraphs: [
          `${req} is commonly required for foundations, RCC work, road preparation, drainage work, floor base preparation and general construction activity around ${loc}.`,
          `Local buyers often need dependable delivery, proper quantity handling and vendor availability during urgent site work.`,
          `3Bigha helps suppliers become discoverable for contractors and property owners searching for bulk construction materials in ${loc}.`,
        ],
      };
    }

    return {
      heading: `Building material supplier opportunity in ${loc}`,
      paragraphs: [
        `${req} suppliers in ${loc} support residential construction, renovation work, contractor procurement and local property development activity.`,
        `Buyers prefer vendors who can respond quickly, confirm stock availability and support transparent local delivery coordination.`,
        `Material businesses operating near ${loc} can use 3Bigha to improve visibility and receive relevant construction enquiries.`,
      ],
    };
  }

  if (category === "rentals") {
    return {
      heading: `Rental equipment demand in ${loc}`,
      paragraphs: [
        `${req} demand in ${loc} is linked with site preparation, excavation, lifting, concreting, road work, repair work and short-term construction requirements.`,
        `Contractors and property developers usually need rental providers who can confirm availability, operating area, rental terms and service support quickly.`,
        `Equipment owners serving ${loc} can use 3Bigha to become visible to local buyers and receive demand signals from nearby construction projects.`,
      ],
    };
  }

  if (category === "property") {
    return {
      heading: `Property marketplace opportunity in ${loc}`,
      paragraphs: [
        `${req} demand in ${loc} is connected with residential plots, houses, commercial property, land investment and local real estate development.`,
        `Buyers usually compare location, access roads, documentation, pricing, nearby development and seller credibility before making enquiries.`,
        `Property sellers and local agents near ${loc} can list on 3Bigha to improve discovery among buyers searching for verified marketplace options.`,
      ],
    };
  }

  if (reqLower.includes("electrical")) {
    return {
      heading: `Electrical service demand in ${loc}`,
      paragraphs: [
        `${req} in ${loc} support new building wiring, repair work, lighting installation, meter-related work, panel maintenance and renovation projects.`,
        `Homeowners, builders and shop owners usually prefer service providers who can respond quickly, inspect the site and complete work safely.`,
        `Electrical professionals serving ${loc} can improve local discovery by creating a visible service profile on 3Bigha.`,
      ],
    };
  }

  if (reqLower.includes("plumbing") || reqLower.includes("water")) {
    return {
      heading: `Plumbing and water service demand in ${loc}`,
      paragraphs: [
        `${req} in ${loc} are required for new construction, bathroom work, kitchen connections, pipeline repair, water tank installation and maintenance activity.`,
        `Local customers usually look for quick response, practical site inspection and reliable workmanship for water-related issues.`,
        `Service providers operating around ${loc} can use 3Bigha to receive relevant local enquiries and improve business visibility.`,
      ],
    };
  }

  if (reqLower.includes("masonry") || reqLower.includes("labour") || reqLower.includes("contracting")) {
    return {
      heading: `Construction workforce demand in ${loc}`,
      paragraphs: [
        `${req} in ${loc} are important for house building, repair work, plastering, concreting, foundation work and small contractor-led projects.`,
        `Builders and homeowners often search for dependable workers or contractors who understand local construction practices and can coordinate site work.`,
        `3Bigha helps local service providers become discoverable to buyers and project owners looking for construction support in ${loc}.`,
      ],
    };
  }

  return {
    heading: `Local service demand in ${loc}`,
    paragraphs: [
      `${req} in ${loc} support property development, construction execution, maintenance, documentation and local project completion.`,
      `Customers usually prefer professionals who are reachable, locally available and able to explain scope, pricing and timelines clearly.`,
      `Service providers near ${loc} can use 3Bigha to improve search visibility and receive relevant buyer enquiries from the local marketplace.`,
    ],
  };
}

export function generateMarketContent(category: string, location: string) {
  const cat = clean(category) || "Marketplace";
  const loc = clean(location) || "this location";
  const text = lower(`${cat} ${loc}`);

  if (text.includes("building material") || text.includes("supplier")) {
    return {
      heading: `Building material marketplace in ${loc}`,
      paragraphs: [
        `The ${cat} page for ${loc} helps buyers discover local supply options for cement, bricks, blocks, sand, aggregates, steel, pipes and other construction inputs.`,
        `Local contractors and property owners can use this marketplace view to understand demand, compare supplier availability and move toward faster procurement decisions.`,
      ],
    };
  }

  if (text.includes("rental")) {
    return {
      heading: `Rental equipment marketplace in ${loc}`,
      paragraphs: [
        `The ${cat} page for ${loc} supports discovery of local equipment owners and rental providers for construction, excavation, lifting, concreting and site preparation work.`,
        `Rental businesses can improve visibility by keeping their service area, availability and equipment category updated on 3Bigha.`,
      ],
    };
  }

  if (text.includes("property")) {
    return {
      heading: `Property marketplace in ${loc}`,
      paragraphs: [
        `The ${cat} page for ${loc} helps buyers and sellers connect around plots, houses, land, commercial property and local investment opportunities.`,
        `A strong marketplace page improves discovery for property sellers, agents, builders and buyers searching for regional real estate options.`,
      ],
    };
  }

  return {
    heading: `Service marketplace in ${loc}`,
    paragraphs: [
      `The ${cat} page for ${loc} helps buyers discover local service professionals for construction, repair, maintenance, documentation and project support.`,
      `Service providers can improve visibility by joining 3Bigha and keeping their business profile updated for local search and marketplace enquiries.`,
    ],
  };
}
