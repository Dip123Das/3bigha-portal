export const siteConfig = {
  name: "3bigha",
  title:
  "3bigha.com | AI-Powered Property, Construction, RFQ, Materials & Vendor Marketplace India",
  description:
  "3bigha.com is India's AI-powered real estate, construction, RFQ, materials, rentals and vendor marketplace platform. Search property, compare vendors, submit procurement RFQs, discover local services and track AI-powered price intelligence across regional marketplaces.",

  domain: "3bigha.com",
  url: "https://www.3bigha.com",

  ogImage: "/og-image.jpg",

    defaultLocale: "en",
  locales: [
    "en",
    "bn",
    "hi",
    "as",
    "or",
    "gu",
    "mr",
    "pa",
    "ta",
    "te",
    "kn",
    "ml",
    "ur",
    "ne",
    "sa",
    "kok",
    "mai",
    "mni",
    "sd",
    "ks",
    "doi",
    "sat",
  ] as const,

  localeNames: {
    en: "English",
    bn: "বাংলা",
    hi: "हिन्दी",
    as: "অসমীয়া",
    or: "ଓଡ଼ିଆ",
    gu: "ગુજરાતી",
    mr: "मराठी",
    pa: "ਪੰਜਾਬੀ",
    ta: "தமிழ்",
    te: "తెలుగు",
    kn: "ಕನ್ನಡ",
    ml: "മലയാളം",
    ur: "اردو",
    ne: "नेपाली",
    sa: "संस्कृतम्",
    kok: "कोंकणी",
    mai: "मैथिली",
    mni: "মৈতৈলোন্",
    sd: "سنڌي",
    ks: "کٲشُر",
    doi: "डोगरी",
    sat: "ᱥᱟᱱᱛᱟᱲᱤ",
  },

  keywords: [
  "3bigha",
  "3 bigha",
  "3bigha.com",

  "property marketplace",
  "real estate marketplace India",
  "construction marketplace",
  "materials marketplace",
  "RFQ marketplace",
  "vendor marketplace",

  "AI marketplace",
  "AI procurement platform",
  "AI RFQ system",

  "building materials marketplace",
  "construction services",
  "rental services",
  "vendor comparison",
  "price prediction",

  "property listing India",
  "land for sale India",
  "construction vendors India",

  "Cooch Behar property",
  "West Bengal construction marketplace",

  "local business marketplace",
  "regional procurement platform",
],

  social: {
    facebook: "",
    x: "",
    linkedin: "",
    youtube: "",
  },

  contact: {
    email: "support@3bigha.com",
    phone: "",
    address: "Cooch Behar, West Bengal, India",
  },
};

export type SiteLocale = (typeof siteConfig.locales)[number];

export function absoluteUrl(path = "") {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${siteConfig.url}${cleanPath}`;
}