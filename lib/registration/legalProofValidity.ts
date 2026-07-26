export type LegalProofValidityType =
  | "exact_date"
  | "financial_period"
  | "no_expiry";

export type LegalProofValidity = {
  validityType?: LegalProofValidityType | string | null;
  validUntil?: string | null;
  noExpiry?: boolean | null;
  periodStartYear?: number | string | null;
  periodEndYear?: number | string | null;
};

export function normalizeValidityType(
  input: LegalProofValidity
): LegalProofValidityType {
  const explicit = String(input.validityType || "")
    .trim()
    .toLowerCase();

  if (explicit === "financial_period") {
    return "financial_period";
  }

  if (explicit === "no_expiry" || input.noExpiry === true) {
    return "no_expiry";
  }

  return "exact_date";
}

export function normalizeFinancialYear(
  value: unknown
): number | null {
  const year = Number(value);

  if (
    !Number.isInteger(year) ||
    year < 1900 ||
    year > 2200
  ) {
    return null;
  }

  return year;
}

export function financialPeriodIsComplete(
  input: LegalProofValidity
) {
  const startYear = normalizeFinancialYear(
    input.periodStartYear
  );
  const endYear = normalizeFinancialYear(
    input.periodEndYear
  );

  return Boolean(
    startYear &&
      endYear &&
      endYear > startYear
  );
}

export function financialPeriodEndDate(
  input: LegalProofValidity
): Date | null {
  const endYear = normalizeFinancialYear(
    input.periodEndYear
  );

  if (!endYear) return null;

  /*
   * Indian financial and assessment periods conventionally end
   * on 31 March of the ending year.
   *
   * Example:
   * 2028–2029 remains valid through 31 March 2029.
   */
  return new Date(
    Date.UTC(endYear, 2, 31, 23, 59, 59, 999)
  );
}

export function legalProofValidityIsComplete(
  input: LegalProofValidity
) {
  const type = normalizeValidityType(input);

  if (type === "no_expiry") return true;

  if (type === "financial_period") {
    return financialPeriodIsComplete(input);
  }

  return Boolean(String(input.validUntil || "").trim());
}

export function legalProofValidityIsExpired(
  input: LegalProofValidity
) {
  const type = normalizeValidityType(input);

  if (type === "no_expiry") return false;

  if (type === "financial_period") {
    const expiry = financialPeriodEndDate(input);

    return Boolean(
      expiry &&
        expiry.getTime() < Date.now()
    );
  }

  const value = String(input.validUntil || "").trim();
  if (!value) return false;

  const expiry = new Date(
    `${value}T23:59:59.999`
  );

  return Boolean(
    Number.isFinite(expiry.getTime()) &&
      expiry.getTime() < Date.now()
  );
}

export function financialPeriodsMatch(
  leftStart: unknown,
  leftEnd: unknown,
  rightStart: unknown,
  rightEnd: unknown
) {
  const aStart = normalizeFinancialYear(leftStart);
  const aEnd = normalizeFinancialYear(leftEnd);
  const bStart = normalizeFinancialYear(rightStart);
  const bEnd = normalizeFinancialYear(rightEnd);

  return Boolean(
    aStart &&
      aEnd &&
      bStart &&
      bEnd &&
      aStart === bStart &&
      aEnd === bEnd
  );
}

export function legalProofValidityLabel(
  input: LegalProofValidity
) {
  const type = normalizeValidityType(input);

  if (type === "no_expiry") {
    return "No expiry";
  }

  if (type === "financial_period") {
    const startYear = normalizeFinancialYear(
      input.periodStartYear
    );
    const endYear = normalizeFinancialYear(
      input.periodEndYear
    );

    return startYear && endYear
      ? `${startYear}–${endYear}`
      : "Financial period";
  }

  return String(input.validUntil || "").trim() ||
    "Exact expiry date";
}
