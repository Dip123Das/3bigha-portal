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
          ["Homepage", "/"],
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
        title: "Browse Property",
        links: [
          ["All Properties", "/property"],
          ["Builder Projects", "/property/projects"],
          ["Builder Inventory", "/property/inventory"],
          ["Investment Opportunities", "/investment/opportunities"],
        ],
      },
      {
        title: "Property Work",
        links: [
          ["Post Property", "/property/add"],
          ["My Property Listings", "/property/my"],
          ["Create Builder Project", "/property/builder/projects/add"],
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
        title: "Browse Materials",
        links: [
          ["All Materials", "/materials"],
          ["Cement & Concrete", "/materials?q=cement"],
          ["Steel / TMT Rod", "/materials?q=steel"],
          ["Sand & Aggregates", "/materials?q=sand"],
          ["Bricks & Blocks", "/materials?q=bricks"],
          ["Tiles & Flooring", "/materials?q=tiles"],
          ["Paints", "/materials?q=paint"],
          ["Plumbing Materials", "/materials?q=plumbing"],
          ["Electrical Materials", "/materials?q=electrical"],
        ],
      },
      {
        title: "Material Work",
        links: [
          ["Submit Material RFQ", "/materials/rfq/new"],
          ["Post Material", "/materials/add"],
          ["My Materials", "/materials/my"],
          ["Price Today", "/price-today"],
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
        title: "Professional / Skilled",
        links: [
          ["Engineering", "/services?q=engineering"],
          ["Architecture", "/services?q=architecture"],
          ["Design", "/services?q=design"],
          ["Project Management", "/services?q=project"],
          ["Estimation", "/services?q=estimation"],
          ["Testing", "/services?q=testing"],
          ["Surveying", "/services?q=surveying"],
          ["MEP", "/services?q=mep"],
          ["Contracting", "/services?q=contracting"],
          ["Masonry", "/services?q=masonry"],
          ["Carpentry", "/services?q=carpentry"],
          ["Electrical", "/services?q=electrical"],
          ["Plumbing", "/services?q=plumbing"],
          ["Painting", "/services?q=painting"],
          ["Flooring", "/services?q=flooring"],
          ["Fabrication", "/services?q=fabrication"],
          ["Roofing", "/services?q=roofing"],
          ["Operators", "/services?q=operators"],
          ["Manpower", "/services?q=manpower"],
          ["Maintenance", "/services?q=maintenance"],
          ["Interior", "/services?q=interior"],
          ["Security", "/services?q=security"],
          ["Safety", "/services?q=safety"],
          ["Renewable", "/services?q=renewable"],
          ["Water", "/services?q=water"],
        ],
      },
      {
        title: "Legal",
        links: [
          ["Documentation", "/services?q=documentation"],
          ["Advisory", "/services?q=advisory"],
          ["Valuation", "/services?q=valuation"],
          ["Banking", "/services?q=banking"],
          ["Legal Survey", "/services?q=legal%20survey"],
        ],
      },
      {
        title: "Service Work",
        links: [
          ["All Services", "/services"],
          ["Service Providers", "/services/providers"],
          ["Turnkey Construction", "/services/turnkey"],
          ["Add Service", "/services/add"],
          ["My Services", "/services/my"],
        ],
      },
    ],
  },
  {
    label: "Rentals",
    href: "/rentals",
    groups: [
      {
        title: "Browse Rentals",
        links: [
          ["All Rentals", "/rentals"],
          ["Rental Catalog", "/rentals/catalog"],
          ["JCB / Excavator", "/rentals?q=jcb"],
          ["Concrete Mixer", "/rentals?q=concrete%20mixer"],
          ["Scaffolding", "/rentals?q=scaffolding"],
          ["Shuttering", "/rentals?q=shuttering"],
          ["Tools", "/rentals?q=tools"],
          ["Transport", "/rentals?q=transport"],
        ],
      },
      {
        title: "Rental Work",
        links: [
          ["Add Rental", "/rentals/add"],
          ["My Rentals", "/rentals/my"],
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
        title: "Calculators",
        links: [
          ["Construction Cost", "/construction-cost"],
          ["House Construction Cost", "/house-construction-cost"],
          ["Land / Building Measurement", "/land-area-calculator"],
          ["EMI Calculator", "/emi-calculator"],
          ["Compare Rates", "/compare-rates"],
        ],
      },
      {
        title: "Construction Work",
        links: [
          ["Turnkey Construction", "/services/turnkey"],
          ["Find Contractors", "/services?q=contractor"],
          ["Submit Construction RFQ", "/rfq/general/new?module=services"],
          ["Price Today", "/price-today"],
        ],
      },
    ],
  },
  {
    label: "Finance",
    href: "/banking-finance-assistance",
    groups: [
      {
        title: "Finance Tools",
        links: [
          ["Finance Assistance", "/banking-finance-assistance"],
          ["EMI Calculator", "/emi-calculator"],
          ["Loan Eligibility", "/emi-calculator"],
          ["Apply as Banker", "/banker/apply"],
          ["Investment Opportunities", "/investment/opportunities"],
        ],
      },
    ],
  },
  {
    label: "Blog / News",
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
