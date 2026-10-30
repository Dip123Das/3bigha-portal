import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const languagePage = read("components/language/AutoTranslatePage.tsx");
const languageApi = read("app/api/ai/translate/route.ts");
const languageSwitcher = read("components/language/LanguageSwitcher.tsx");
const translatedText = read("components/language/TranslatedText.tsx");
const geoSelector = read("components/geography/GeoSelector.tsx");
const geoApi = read("app/api/geography/options/route.ts");

assert.match(languagePage, /MutationObserver/);
assert.match(languagePage, /BATCH_SIZE = 80/);
assert.match(languagePage, /response\.ok/);
assert.match(languagePage, /json\?\.ok !== true/);
assert.doesNotMatch(languagePage, /parent\.setAttribute\("data-ai-translated"/);
assert.match(languagePage, /Never cache an English fallback/);
assert.match(languageApi, /isValidLocale\(targetLocale\)/);
assert.match(languageApi, /status: 503/);
assert.match(languageApi, /translated === text\.trim\(\)/);
assert.match(languageSwitcher, /setSelectedLocale\(activeLocale\)/);
assert.match(translatedText, /!res\.ok \|\| json\?\.ok !== true/);
assert.match(geoSelector, /!res\.ok \|\| !json \|\| !Array\.isArray\(json\.options\)/);
assert.match(geoSelector, /optionCache\.set\(key, response\)/);
assert.match(geoSelector, /Location data could not be loaded\. Please retry\./);
assert.match(geoApi, /Official location data is temporarily unavailable\./);
assert.match(geoApi, /Official location data could not be loaded\. Please retry\./);
assert.doesNotMatch(geoApi, /error: error\?\.message/);

console.log("Portal language translation and LGD error-handling assertions passed.");
