export const siteConfig = {
  name: "3bigha",
  title: "3bigha.com | AI-Powered Property, Materials, Services & Rentals Marketplace",
  description:
    "3bigha.com is an AI-powered procurement and marketplace operating system for property, building materials, services, rentals, RFQs, vendor comparison, price intelligence, and regional marketplace workflows.",

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
    "property marketplace",
    "building materials marketplace",
    "construction services",
    "rental services",
    "RFQ platform",
    "AI marketplace",
    "AI procurement",
    "vendor comparison",
    "price prediction",
    "real estate marketplace India",
    "Cooch Behar property",
    "West Bengal construction marketplace",
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