import Link from "next/link";

const marketplaceMenus = [
  {
    title: "Property",
    icon: "🏡",
    href: "/property",
    preview: "Land, house, flat and commercial property.",
  },
  {
    title: "Materials",
    icon: "🧱",
    href: "/materials",
    preview: "Cement, steel, sand, bricks and building items.",
  },
  {
    title: "Services",
    icon: "🛠️",
    href: "/services",
    preview: "Masons, contractors, engineers and legal help.",
  },
  {
    title: "Rentals",
    icon: "🚜",
    href: "/rentals",
    preview: "JCB, tools, shuttering and machinery rentals.",
  },
];

const quickActions = [
  {
    title: "Post Requirement",
    icon: "⚡",
    href: "/rfq/general/new",
    preview: "Tell vendors what you need and get responses.",
  },
  {
    title: "Price Today",
    icon: "📈",
    href: "/price-today",
    preview: "Check material rates before buying.",
  },
  {
    title: "Cost Calculator",
    icon: "🏗️",
    href: "/construction-cost",
    preview: "Estimate house construction cost.",
  },
  {
    title: "Land Calculator",
    icon: "📐",
    href: "/land-area-calculator",
    preview: "Convert sqft, decimal, katha and bigha.",
  },
];

const workMenus = [
  {
    title: "Inbox",
    icon: "💬",
    href: "/dashboard/inbox-v2",
    preview: "Continue buyer and vendor conversations.",
  },
  {
    title: "My RFQs",
    icon: "🧾",
    href: "/dashboard/buyer/rfqs",
    preview: "Track requirements and vendor quotations.",
  },
  {
    title: "My Dashboard",
    icon: "📋",
    href: "/dashboard",
    preview: "Open your work area and recent activity.",
  },
];

function SidebarSection({
  title,
  items,
}: {
  title: string;
  items: typeof marketplaceMenus;
}) {
  return (
    <div className="marketplaceSideNavSection">
      <div className="marketplaceSideNavSectionTitle">{title}</div>

      <div className="marketplaceSideNavList">
        {items.map((item) => (
          <Link key={item.href} href={item.href} className="marketplaceSideNavItem">
            <span className="marketplaceSideNavIcon">{item.icon}</span>

            <span className="marketplaceSideNavText">
              <b>{item.title}</b>
              <small>{item.preview}</small>
            </span>

            <span className="marketplaceSideNavArrow">›</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function MarketplaceSidebar() {
  const mobileMenus = [
    { title: "Marketplace", items: marketplaceMenus },
    { title: "Quick Actions", items: quickActions },
    { title: "Continue Work", items: workMenus },
  ];

  return (
    <>
      <aside className="marketplaceSideNav" aria-label="3bigha marketplace shortcuts">
        <div className="marketplaceSideNavTitle">
          <span>☰</span>
          <b>Quick Shortcuts</b>
        </div>

        <SidebarSection title="Marketplace" items={marketplaceMenus} />
        <SidebarSection title="Quick Actions" items={quickActions} />
        <SidebarSection title="Continue Work" items={workMenus} />
      </aside>

      <details className="marketplaceMobileNav">
        <summary>
          <span>☰ Shortcuts</span>
          <b>Open</b>
        </summary>

        <div className="marketplaceMobileNavPanel">
          {mobileMenus.map((section) => (
            <details key={section.title} className="marketplaceMobileNavItem">
              <summary>
                <span>{section.title}</span>
                <b>⌄</b>
              </summary>

              <div>
                {section.items.map((item) => (
                  <Link key={item.href} href={item.href}>
                    {item.icon} {item.title}
                  </Link>
                ))}
              </div>
            </details>
          ))}
        </div>
      </details>
    </>
  );
}
