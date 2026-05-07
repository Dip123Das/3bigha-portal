export const i18nConfig = {
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

  localeLabels: {
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
};

export type Locale = (typeof i18nConfig.locales)[number];

export function isValidLocale(locale: string): locale is Locale {
  return i18nConfig.locales.includes(locale as Locale);
}