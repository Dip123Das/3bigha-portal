import type { Locale } from "./config";

import en from "./dictionaries/en";
import bn from "./dictionaries/bn";

const dictionaries = {
  en,
  bn,
};

export async function getDictionary(locale: Locale) {
  return dictionaries[locale as keyof typeof dictionaries] || dictionaries.en;
}