export type MenuGroup = {
  title: string;
  links: [string, string][];
};

export type MenuItem = {
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
        title: "Start Here",
        links: [
          ["Search Marketplace", "/search"],
          ["Post Requirement", "/rfq/general/new"],
          ["Continue My Work", "/dashboard"],
        ],
      },
    ],
  },
  {
    label: "Marketplace",
    href: "/property",
    groups: [
      {
        title: "Find / Buy / Hire",
        links: [
          ["Property", "/property"],
          ["Materials", "/materials"],
          ["Services", "/services"],
          ["Rentals", "/rentals"],
          ["🚀 Vendor Opportunities", "/vendor-opportunities"],
        ],
      },
      {
        title: "List / Sell",
        links: [
          ["Post Property", "/property/add"],
          ["Add Material", "/materials/add"],
          ["Add Service", "/services/add"],
          ["Add Rental", "/rentals/add"],
        ],
      },
    ],
  },
  {
    label: "Tools",
    href: "/construction-cost",
    groups: [
      {
        title: "Calculate & Decide",
        links: [
          ["Construction Cost", "/construction-cost"],
          ["Land / Building Calculator", "/land-area-calculator"],
          ["Price Today", "/price-today"],
          ["EMI Calculator", "/emi-calculator"],
          ["Compare Rates", "/compare-rates"],
        ],
      },
    ],
  },
  {
    label: "My Work",
    href: "/dashboard",
    groups: [
      {
        title: "Work Actions",
        links: [
          ["Post Requirement / RFQ", "/rfq/general/new"],
          ["My RFQs", "/dashboard/buyer/rfqs"],
          ["Inbox", "/dashboard/inbox-v2"],
          ["Purchase & Procurement", "/dashboard/procurement-os"],
        ],
      },
      {
        title: "Project Tracking",
        links: [
          ["Construction Projects", "/dashboard/construction-projects"],
          ["Site Work", "/dashboard/site-execution"],
          ["Activity Feed", "/dashboard/activity-feed"],
          ["Project Health", "/dashboard/procurement-health"],
        ],
      },
    ],
  },
  {
    label: "Business",
    href: "/dashboard/vendor",
    groups: [
      {
        title: "For Vendors",
        links: [
          ["Vendor Dashboard", "/dashboard/vendor"],
          ["Vendor Network", "/vendor/discovery"],
          ["Vendor Master Data", "/dashboard/vendor/master-data"],
        ],
      },
      {
        title: "Growth & Finance",
        links: [
          ["Investment Opportunities", "/investment/opportunities"],
          ["Finance Assistance", "/banking-finance-assistance"],
          ["Apply as Banker", "/banker/apply"],
        ],
      },
    ],
  },
  {
    label: "Help",
    href: "/support/my",
    groups: [
      {
        title: "Help & Learning",
        links: [
          ["Support Center", "/support/my"],
          ["Blog / Guides", "/blog"],
          ["AI Search Guide", "/ai-search-guide"],
        ],
      },
    ],
  },
];
