"use client";

import Link from "next/link";
import { useState } from "react";
import { Container } from "@/components/layout/Container";

type MenuGroup = {
  title: string;
  links: [string, string][];
};

type MenuItem = {
  label: string;
  href: string;
  groups: MenuGroup[];
};

export const MENUS: MenuItem[] = [
  {
    label: "Home",
    href: "/",
    groups: [
      {
        title: "3Bigha Home",
        links: [
          ["Go to Homepage", "/"],
          ["Search Marketplace", "/search"],
          ["Submit Requirement", "/rfq/general/new"],
          ["Price Today", "/price-today"],
        ],
      },
      {
        title: "Quick Access",
        links: [
          ["Property", "/property"],
          ["Materials", "/materials"],
          ["Services", "/services"],
          ["Rentals", "/rentals"],
        ],
      },
    ],
  },
  {
    label: "Property",
    href: "/property",
    groups: [
      {
        title: "Buy & Sell",
        links: [
          ["Buy Property", "/property"],
          ["Post Property", "/property/add"],
          ["Builder Projects", "/property/builder/projects"],
          ["Land / Plot", "/property"],
          ["Flat / House", "/property"],
          ["Commercial", "/property"],
        ],
      },
      {
        title: "Investment",
        links: [
          ["Investment Opportunities", "/investment"],
          ["Price Today", "/price-today"],
          ["AI Search", "/search"],
          ["Submit Requirement", "/rfq/general/new"],
        ],
      },
    ],
  },
  {
    label: "Materials",
    href: "/materials",
    groups: [
      {
        title: "Building Materials",
        links: [
          ["Cement", "/materials"],
          ["Steel / Rod", "/materials"],
          ["Sand", "/materials"],
          ["Bricks", "/materials"],
          ["Aggregates", "/materials"],
          ["Tiles", "/materials"],
          ["Paint", "/materials"],
          ["Plumbing", "/materials"],
        ],
      },
      {
        title: "Marketplace",
        links: [
          ["Compare Vendors", "/vendor/discovery"],
          ["Submit Material RFQ", "/rfq/general/new"],
          ["Price Intelligence", "/price-today"],
          ["Local Suppliers", "/materials"],
        ],
      },
    ],
  },
  {
    label: "Services",
    href: "/services",
    groups: [
      {
        title: "Construction Services",
        links: [
          ["Mason", "/services"],
          ["Electrician", "/services"],
          ["Plumber", "/services"],
          ["Contractor", "/services"],
          ["Architect", "/services"],
          ["Engineer", "/services"],
          ["Interior", "/services"],
        ],
      },
      {
        title: "Professional Services",
        links: [
          ["Legal Services", "/services"],
          ["Documentation", "/services"],
          ["Property Valuation", "/services"],
          ["Survey Services", "/services"],
        ],
      },
    ],
  },
  {
    label: "Rentals",
    href: "/rentals",
    groups: [
      {
        title: "Machines & Equipment",
        links: [
          ["JCB / Excavator", "/rentals"],
          ["Concrete Mixer", "/rentals"],
          ["Tools", "/rentals"],
          ["Shuttering", "/rentals"],
          ["Scaffolding", "/rentals"],
          ["Truck / Transport", "/rentals"],
        ],
      },
      {
        title: "Rental Workflow",
        links: [
          ["Find Rental", "/rentals"],
          ["Rental Requirement", "/rfq/general/new"],
          ["Rental Vendors", "/rentals"],
        ],
      },
    ],
  },
  {
    label: "Construction",
    href: "/construction-cost",
    groups: [
      {
        title: "AI Construction Tools",
        links: [
          ["Construction Cost", "/construction-cost"],
          ["Land / Building Measurement", "/land-area-calculator"],
          ["BOQ Generator", "/construction-cost"],
          ["Material Estimator", "/construction-cost"],
          ["Timeline Planner", "/construction-cost"],
        ],
      },
      {
        title: "Execution",
        links: [
          ["Turnkey Construction", "/services"],
          ["Construction RFQ", "/rfq/general/new"],
          ["Find Contractors", "/services"],
        ],
      },
    ],
  },
  {
    label: "Advanced Insights",
    href: "/ai-search-guide",
    groups: [
      {
        title: "AI Workflows",
        links: [
          ["Search Guide", "/search"],
          ["Procurement Workspace", "/dashboard/procurement-health"],
          ["Unified Inbox", "/dashboard/inbox-v2"],
          ["Price Today", "/price-today"],
        ],
      },
      {
        title: "Banking & Finance",
        links: [
          ["Finance Assistance", "/banking-finance-assistance"],
          ["EMI Calculator", "/emi-calculator"],
          ["Loan Eligibility", "/emi-calculator"],
          ["Land Area Calculator", "/land-area-calculator"],
          ["Apply as Banker", "/banker/apply"],
        ],
      },
      {
        title: "Automation",
        links: [
          ["Vendor Discovery", "/vendor/discovery"],
          ["Market Intelligence", "/price-today"],
          ["AI RFQ Assistant", "/rfq/general/new"],
          ["AI Support", "/support/my"],
        ],
      },
    ],
  },
  {
    label: "Blog / News",
    href: "/blog",
    groups: [
      {
        title: "News & Guides",
        links: [
          ["Latest Blogs", "/blog"],
          ["Construction Guides", "/blog"],
          ["Property News", "/blog"],
          ["Material Price News", "/blog"],
          ["Rental Market Updates", "/blog"],
        ],
      },
      {
        title: "Knowledge",
        links: [
          ["AI Marketplace Guide", "/ai-search-guide"],
          ["Local Market Trends", "/blog"],
          ["Investment Insights", "/blog"],
        ],
      },
    ],
  },
];

export default function DesktopMegaNavClient() {
  const [active, setActive] = useState<string | null>(null);
  const activeMenu = MENUS.find((m) => m.label === active) || null;

  return (
    <nav
      className="stableDesktopMegaNav"
      aria-label="Marketplace mega navigation"
      onMouseLeave={() => setActive(null)}
    >
      <Container className="stableDesktopMegaNavInner">
        {MENUS.map((menu) => (
          <div
            className="stableMegaItem"
            key={menu.label}
            onMouseEnter={() => setActive(menu.label)}
          >
            <Link className="stableMegaButton" href={menu.href}>
              <span>{menu.label}</span>
              <span className="stableMegaChevron">⌄</span>
            </Link>
          </div>
        ))}

        {activeMenu ? (
          <div className="stableMegaPanel" onMouseEnter={() => setActive(activeMenu.label)}>
            {activeMenu.label !== "Advanced Insights" ? (
              <div className="stableMegaGroup stableMegaMainGroup">
                <div className="stableMegaTitle">Main Page</div>
                <Link className="stableMegaMainLink" href={activeMenu.href}>
                  Open {activeMenu.label}
                </Link>
              </div>
            ) : null}

            {activeMenu.groups.map((group) => (
              <div className="stableMegaGroup" key={group.title}>
                <div className="stableMegaTitle">{group.title}</div>
                {group.links.map(([label, href]) => (
                  <Link key={href + label} href={href}>
                    {label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        ) : null}
      </Container>
    </nav>
  );
}
