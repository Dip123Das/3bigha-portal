import type { SeoModule } from "@/lib/geo/india-geo";

type RegionalSeoContent = {
  intro: string;
  sections: {
    title: string;
    content: string;
  }[];
  faqs: {
    question: string;
    answer: string;
  }[];
};

export function getRegionalSeoContent(
  module: SeoModule,
  city: string,
  district: string,
  state: string
): RegionalSeoContent {
  if (module === "property") {
    return {
      intro: `3Bigha helps buyers, sellers, builders and local property investors discover real estate opportunities in ${city}, ${district}, ${state}. Users can explore land, flats, houses, commercial properties and builder projects through an AI-assisted regional marketplace experience.`,

      sections: [
        {
          title: `Property market in ${city}`,
          content: `${city} is gradually emerging as an important regional real estate market in ${district}. Demand for residential land, plotted development, independent houses and commercial properties continues to grow due to improving connectivity, local business expansion and regional infrastructure development.`,
        },

        {
          title: `Land and plot opportunities`,
          content: `Users in ${city} frequently search for residential plots, roadside land, agricultural conversion land and future investment properties. 3Bigha helps connect local buyers and sellers through enquiry and RFQ workflows.`,
        },

        {
          title: `Builder and construction ecosystem`,
          content: `Local builders, contractors, architects, labour providers and material suppliers in ${district} contribute to the growing construction ecosystem around ${city}.`,
        },
      ],

      faqs: [
        {
          question: `How can I find property in ${city}?`,
          answer: `You can browse property listings, submit enquiries and connect with local buyers, sellers and builders through 3Bigha.`,
        },
        {
          question: `Can I post my property on 3Bigha?`,
          answer: `Yes. Owners, agents and builders can post properties, projects and inventory through the platform.`,
        },
      ],
    };
  }

  if (module === "materials") {
    return {
      intro: `3Bigha helps users discover building material suppliers in ${city}, ${district}, ${state}. Buyers can compare vendors, submit requirements and connect with local suppliers faster.`,

      sections: [
        {
          title: `Building material suppliers in ${city}`,
          content: `Local suppliers in ${city} provide cement, steel, sand, bricks, aggregates, plumbing, electrical and finishing materials for residential and commercial construction.`,
        },

        {
          title: `Construction demand in ${district}`,
          content: `Growing property development and infrastructure activities in ${district} are increasing demand for reliable building material vendors.`,
        },

        {
          title: `Material RFQ and quotation workflow`,
          content: `3Bigha enables users to submit material requirements and receive quotations from multiple local suppliers through AI-assisted RFQ workflows.`,
        },
      ],

      faqs: [
        {
          question: `Can I compare building material suppliers in ${city}?`,
          answer: `Yes. 3Bigha allows buyers to compare quotations and connect with local suppliers.`,
        },
        {
          question: `Can suppliers list their materials on 3Bigha?`,
          answer: `Yes. Material vendors can post products and respond to buyer requirements.`,
        },
      ],
    };
  }

  if (module === "services") {
    return {
      intro: `3Bigha connects users with construction and technical service providers in ${city}, ${district}, ${state}, including contractors, labour teams and professional service experts.`,

      sections: [
        {
          title: `Construction services in ${city}`,
          content: `Users can discover local contractors, plumbers, electricians, painters, fabricators and civil work professionals operating around ${city}.`,
        },

        {
          title: `Regional construction ecosystem`,
          content: `The expanding property and infrastructure ecosystem in ${district} is increasing demand for skilled technical and construction services.`,
        },

        {
          title: `AI-assisted service discovery`,
          content: `3Bigha uses intelligent workflows to help users connect with relevant service providers faster.`,
        },
      ],

      faqs: [
        {
          question: `Can I hire local contractors in ${city}?`,
          answer: `Yes. Users can browse and connect with local contractors and service providers through 3Bigha.`,
        },
        {
          question: `Can service providers join 3Bigha?`,
          answer: `Yes. Local professionals and businesses can register and list their services.`,
        },
      ],
    };
  }

  return {
    intro: `3Bigha helps users discover rental services and rental opportunities in ${city}, ${district}, ${state}, including equipment rentals, machinery rentals and property rentals.`,

    sections: [
      {
        title: `Rental ecosystem in ${city}`,
        content: `Rental demand in ${city} includes construction machinery, tools, temporary equipment and local property rentals.`,
      },

      {
        title: `Construction equipment rentals`,
        content: `Builders and contractors in ${district} often require short-term equipment and machine rental support for ongoing projects.`,
      },

      {
        title: `Local rental discovery`,
        content: `3Bigha helps users connect with rental providers through local marketplace workflows.`,
      },
    ],

    faqs: [
      {
        question: `Can I find rental services in ${city}?`,
        answer: `Yes. Users can browse and connect with rental providers through 3Bigha.`,
      },
      {
        question: `Can rental businesses list their services?`,
        answer: `Yes. Rental providers can create listings and respond to local enquiries.`,
      },
    ],
  };
}