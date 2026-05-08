import type { SeoModule } from "@/lib/geo/india-geo";
import type { SeoCategory } from "@/lib/seo/category-slugs";

function moduleTitle(module: SeoModule) {
  if (module === "property") return "Property";
  if (module === "materials") return "Building Materials";
  if (module === "services") return "Construction Services";
  return "Rental Services";
}

export function getCategorySeoContent({
  module,
  category,
  area,
  city,
  district,
  state,
}: {
  module: SeoModule;
  category: SeoCategory;
  area: string;
  city?: string;
  district?: string;
  state?: string;
}) {
  const location = [area, city, district, state].filter(Boolean).join(", ");
  const title = `${category.label} in ${area}`;

  return {
    title,
    heading: `${category.label} in ${area}`,
    description: `Find ${category.label.toLowerCase()} related ${moduleTitle(
      module
    ).toLowerCase()} options, vendors, prices, RFQs and local marketplace activity in ${location}.`,
    paragraphs: [
      `${category.label} is an important search category for users looking for ${moduleTitle(
        module
      ).toLowerCase()} in ${location}. People may search using words like ${category.aliases
        .slice(0, 4)
        .join(", ")} and related local market terms.`,
      `3Bigha connects this category with local marketplace discovery, RFQ workflows, vendor visibility, search intent and regional SEO signals so that users can find relevant options faster.`,
      `For ${category.label.toLowerCase()} near ${area}, users can browse related pages, post requirements, compare local availability and connect with marketplace participants through 3Bigha.`,
    ],
    faqs: [
      {
        question: `Where can I find ${category.label.toLowerCase()} in ${area}?`,
        answer: `You can explore ${category.label.toLowerCase()} related listings, vendors, RFQ options and local marketplace links for ${area} on 3Bigha.`,
      },
      {
        question: `Can I post a requirement for ${category.label.toLowerCase()} in ${area}?`,
        answer: `Yes. You can post your requirement on 3Bigha and connect with relevant local vendors, suppliers or service providers.`,
      },
    ],
  };
}