export type GstinValidationResult = {
  input: string;
  normalized: string;
  valid: boolean;
  errors: string[];
  parts: {
    stateCode: string;
    pan: string;
    entityCode: string;
    defaultZ: string;
    checksum: string;
  } | null;
};

const VALID_GST_STATE_CODES = new Set([
  "01", "02", "03", "04", "05", "06", "07", "08", "09",
  "10", "11", "12", "13", "14", "15", "16", "17", "18",
  "19", "20", "21", "22", "23", "24", "25", "26", "27",
  "28", "29", "30", "31", "32", "33", "34", "35", "36",
  "37", "38", "97", "99",
]);

export function normalizeGstin(value: string) {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
}

export function validateGstin(value: string): GstinValidationResult {
  const normalized = normalizeGstin(value);
  const errors: string[] = [];

  if (!normalized) {
    errors.push("GSTIN is empty.");
  }

  if (normalized.length !== 15) {
    errors.push("GSTIN must be exactly 15 characters.");
  }

  const stateCode = normalized.slice(0, 2);
  const pan = normalized.slice(2, 12);
  const entityCode = normalized.slice(12, 13);
  const defaultZ = normalized.slice(13, 14);
  const checksum = normalized.slice(14, 15);

  if (normalized.length >= 2 && !VALID_GST_STATE_CODES.has(stateCode)) {
    errors.push("First 2 digits must be a valid Indian GST state code.");
  }

  const panPattern = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
  if (normalized.length >= 12 && !panPattern.test(pan)) {
    errors.push("Characters 3 to 12 must follow PAN format: AAAAA9999A.");
  }

  const entityPattern = /^[1-9A-Z]$/;
  if (normalized.length >= 13 && !entityPattern.test(entityCode)) {
    errors.push("13th character must be a valid registration/entity code.");
  }

  if (normalized.length >= 14 && defaultZ !== "Z") {
    errors.push("14th character should be Z.");
  }

  const checksumPattern = /^[0-9A-Z]$/;
  if (normalized.length >= 15 && !checksumPattern.test(checksum)) {
    errors.push("15th character must be a valid checksum character.");
  }

  const fullPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
  if (normalized.length === 15 && !fullPattern.test(normalized)) {
    errors.push("GSTIN pattern is invalid.");
  }

  return {
    input: value,
    normalized,
    valid: errors.length === 0,
    errors,
    parts:
      normalized.length === 15
        ? {
            stateCode,
            pan,
            entityCode,
            defaultZ,
            checksum,
          }
        : null,
  };
}

export function documentTextContainsNeedle(text: string, needle: string) {
  const cleanText = String(text || "").toUpperCase().replace(/\s+/g, "");
  const cleanNeedle = String(needle || "").toUpperCase().replace(/\s+/g, "");
  if (!cleanText || !cleanNeedle) return false;
  return cleanText.includes(cleanNeedle);
}