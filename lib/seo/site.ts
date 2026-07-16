export const siteConfig = {
  name: "3bigha",
  title:
  "3bigha.com | Property and Construction Business Operating System",
  description:
  "3bigha connects property, construction, materials, services, rentals and daily business work in one human-first operating system.",

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

  "banking finance assistance",
  "banking finance assistance India",
  "home loan assistance",
  "construction loan assistance",
  "property loan assistance",
  "EMI calculator India",
  "loan eligibility calculator",
  "CIBIL based loan assistance",
  "verified banker assistance",
  "bank loan support India",
  "housing loan assistance",
  "loan assistance West Bengal",
  "home loan Cooch Behar",
  "construction finance Cooch Behar",

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
