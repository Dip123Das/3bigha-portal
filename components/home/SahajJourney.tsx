type SahajNeedCard = {
  icon: string;
  title: string;
  description: string;
  href: string;
};

type SahajJourneyProps = {
  expanded: boolean;
};

const sahajNeedCards: SahajNeedCard[] = [
  {
    icon: "🏗️",
    title: "Build",
    description:
      "Plan construction, estimate cost, find contractors, materials and equipment.",
    href: "/construction-cost",
  },
  {
    icon: "🏠",
    title: "Buy",
    description:
      "Search property, materials, rentals and services near your location.",
    href: "/search",
  },
  {
    icon: "💰",
    title: "Sell",
    description:
      "List property, materials, services or business offerings.",
    href: "/property/add",
  },
  {
    icon: "👷",
    title: "Hire",
    description:
      "Find contractors, architects, engineers, labour and service providers.",
    href: "/services",
  },
  {
    icon: "🚜",
    title: "Rent",
    description:
      "Find JCB, machines, tools and construction equipment.",
    href: "/rentals",
  },
  {
    icon: "📋",
    title: "Manage",
    description:
      "Track RFQs, vendors, bills, dispatch and project work.",
    href: "/dashboard",
  },
  {
    icon: "📈",
    title: "Grow",
    description:
      "Join as vendor, supplier, contractor or service provider.",
    href: "/vendor-opportunities",
  },
  {
    icon: "📮",
    title: "Submit Requirement",
    description:
      "Tell us what you need. We will prepare the request.",
    href: "/rfq/start",
  },
];

export default function SahajJourney({ expanded }: SahajJourneyProps) {
  return (
    <section
      className={`contentSection sahajJourneySection ${
        expanded ? "isSahajExpanded" : ""
      }`}
    >
      <div className="sectionHead">
        <div>
          <h2>What would you like to do?</h2>
          <p>
            Choose one clear path. You can review every detail before taking
            the next step.
          </p>
        </div>

        <a href="/rfq/start">Post requirement →</a>
      </div>

      <div className="sahajJourneyGrid">
        {sahajNeedCards.map(
          ({ icon, title, description, href }, index) => (
            <a
              key={title}
              href={href}
              className={`sahajJourneyCard ${
                index > 3 ? "mobileSahajExtra" : ""
              }`}
            >
              <div className="sahajJourneyIcon">{icon}</div>

              <div>
                <strong>{title}</strong>
                <p>{description}</p>
              </div>
            </a>
          )
        )}
      </div>
    </section>
  );
}
