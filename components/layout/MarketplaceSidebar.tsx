import Link from "next/link";

const mainMenus = [
  {
    title: "Home",
    icon: "🏠",
    href: "/",
    preview: "Main marketplace dashboard.",
  },
  {
    title: "Property",
    icon: "🏡",
    href: "/property",
    preview: "Land, flat, house and commercial property listings.",
  },
  {
    title: "Materials",
    icon: "🧱",
    href: "/materials",
    preview: "Cement, steel, sand, bricks and construction materials.",
  },
  {
    title: "Services",
    icon: "🛠️",
    href: "/services",
    preview: "Contractors, masons, engineers, plumbers and legal services.",
  },
  {
    title: "Rentals",
    icon: "🚜",
    href: "/rentals",
    preview: "JCB, excavator, shuttering, tools and machinery rentals.",
  },
  {
    title: "Construction Cost",
    icon: "🏗️",
    href: "/construction-cost",
    preview: "AI house construction cost, BOQ, materials and timeline calculator.",
  },
  {
    title: "RFQ",
    icon: "⚡",
    href: "/rfq/general/new",
    preview: "Submit requirement and get vendor quotations.",
  },
  {
    title: "Inbox",
    icon: "💬",
    href: "/dashboard/inbox-v2",
    preview: "Continue buyer, vendor and RFQ conversations.",
  },
  {
    title: "Vendor Hub",
    icon: "🏪",
    href: "/dashboard/vendor",
    preview: "Vendor dashboard, RFQs, leads and performance.",
  },
  {
    title: "AI Procurement",
    icon: "🧠",
    href: "/dashboard/procurement-health",
    preview: "AI procurement OS, mission control and intelligence.",
  },
  {
    title: "Support",
    icon: "🆘",
    href: "/support/my",
    preview: "Support tickets and help desk.",
  },
];

export default function MarketplaceSidebar() {
  return (
    <>
      <aside className="marketplaceSideNav" aria-label="3bigha marketplace sidebar">
        <div className="marketplaceSideNavTitle">
          <span>☰</span>
          <b>3Bigha Menu</b>
        </div>

        <div className="marketplaceSideNavList">
          {mainMenus.map((item) => (
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
      </aside>

      <details className="marketplaceMobileNav">
        <summary>
          <span>☰ Menu</span>
          <b>View shortcuts</b>
        </summary>

        <div className="marketplaceMobileNavPanel">
          {mainMenus.map((item) => (
            <details key={item.href} className="marketplaceMobileNavItem">
              <summary>
                <span>
                  {item.icon} {item.title}
                </span>
                <b>⌄</b>
              </summary>

              <div>
                <p>{item.preview}</p>
                <Link href={item.href}>Open {item.title} →</Link>
              </div>
            </details>
          ))}
        </div>
      </details>
    </>
  );
}
