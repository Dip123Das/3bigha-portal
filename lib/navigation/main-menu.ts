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
          ["Marketplace Search", "/search"],
          ["Submit Requirement", "/rfq/general/new"],
          ["Price Today", "/price-today"],
        ],
      },
    ],
  },
  {
    label: "Property",
    href: "/property",
    groups: [
      {
        title: "Property Workflow",
        links: [
          ["Buy / Browse Property", "/property"],
          ["Sell / Post Property", "/property/add"],
          ["Rent / Lease", "/rentals?type=property"],
          ["Investment", "/investment/opportunities"],
          ["Submit Property Requirement", "/rfq/general/new?module=property"],
        ],
      },
    ],
  },
  {
    label: "Materials",
    href: "/materials",
    groups: [
      {
        title: "Material Workflow",
        links: [
          ["Browse Materials", "/materials"],
          ["Check Price Today", "/price-today"],
          ["Submit Material RFQ", "/materials/rfq/new"],
          ["Post Material", "/materials/add"],
          ["Find Vendors", "/vendor/discovery"],
        ],
      },
    ],
  },
  {
    label: "Services",
    href: "/services",
    groups: [
      {
        title: "Service Workflow",
        links: [
          ["Browse Services", "/services"],
          ["Construction Services", "/services?q=construction"],
          ["Design / Engineer / Legal", "/services"],
          ["Add Service", "/services/add"],
          ["Submit Service Requirement", "/rfq/general/new?module=services"],
        ],
      },
    ],
  },
  {
    label: "Rentals",
    href: "/rentals",
    groups: [
      {
        title: "Rental Workflow",
        links: [
          ["Browse Rentals", "/rentals"],
          ["Equipment Rental", "/rentals?q=equipment"],
          ["Property Rental", "/rentals?type=property"],
          ["Add Rental", "/rentals/add"],
          ["Submit Rental Requirement", "/rfq/general/new?module=rentals"],
        ],
      },
    ],
  },
  {
    label: "Construction",
    href: "/construction-cost",
    groups: [
      {
        title: "Build Workflow",
        links: [
          ["Construction Cost", "/construction-cost"],
          ["Land / Building Measurement", "/land-area-calculator"],
          ["Find Contractors", "/services?q=contractor"],
          ["Compare Rates", "/compare-rates"],
          ["Submit Construction RFQ", "/rfq/general/new?module=services"],
        ],
      },
    ],
  },
  {
    label: "Finance",
    href: "/banking-finance-assistance",
    groups: [
      {
        title: "Finance Workflow",
        links: [
          ["Finance Assistance", "/banking-finance-assistance"],
          ["EMI Calculator", "/emi-calculator"],
          ["Loan Eligibility", "/emi-calculator"],
          ["Investment Opportunities", "/investment/opportunities"],
          ["Apply as Banker", "/banker/apply"],
        ],
      },
    ],
  },
  {
    label: "Learn",
    href: "/blog",
    groups: [
      {
        title: "Knowledge",
        links: [
          ["Latest Blogs", "/blog"],
          ["AI Search Guide", "/ai-search-guide"],
          ["Property News", "/blog?q=property"],
          ["Construction Guides", "/blog?q=construction"],
          ["Material Price News", "/blog?q=materials"],
        ],
      },
    ],
  },
];
