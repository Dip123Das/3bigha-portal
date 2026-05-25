"use client";

import { useEffect, useMemo, useState } from "react";
import {
  defaultBankOffers,
  getBankOffersByState,
  indianStatesWithRegionalBanks,
  type BankOffer,
} from "@/lib/finance/bankRates";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { LiveLenderOffer } from "@/lib/finance/lenderOffer";

type TenureMode = "years" | "months";

function formatINR(value: number) {
  if (!Number.isFinite(value)) return "₹0";
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

function calculateEmi(principal: number, annualRate: number, months: number) {
  const monthlyRate = annualRate / 12 / 100;

  if (months <= 0) return 0;

  if (monthlyRate === 0) {
    return principal / months;
  }

  return (
    (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
    (Math.pow(1 + monthlyRate, months) - 1)
  );
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function getCibilRateAdjustment(score: number) {
  if (!Number.isFinite(score) || score <= 0) return 0;
  if (score >= 800) return -0.15;
  if (score >= 760) return -0.05;
  if (score >= 720) return 0;
  if (score >= 680) return 0.25;
  if (score >= 650) return 0.45;
  return 0.75;
}

function getCibilStatus(score: number) {
  if (!Number.isFinite(score) || score <= 0) return "Not added";
  if (score >= 760) return "Strong";
  if (score >= 700) return "Good";
  if (score >= 650) return "Average";
  return "Needs improvement";
}

function estimateProcessingFee(bankType: BankOffer["type"]) {
  if (bankType === "public") return 0.35;
  if (bankType === "hfc") return 0.5;
  if (bankType === "private") return 0.6;
  if (bankType === "rrb" || bankType === "cooperative") return 0.4;
  if (bankType === "small_finance") return 0.75;
  return 0.6;
}

function getApprovalChance(score: number, bankType: BankOffer["type"], employmentType: "salaried" | "business") {
  let chance = 65;

  if (score >= 800) chance += 18;
  else if (score >= 760) chance += 12;
  else if (score >= 720) chance += 6;
  else if (score < 650) chance -= 22;

  if (bankType === "public") chance += 5;
  if (bankType === "rrb" || bankType === "cooperative") chance += 8;
  if (bankType === "small_finance") chance += 4;
  if (employmentType === "business") chance -= 6;

  return clamp(Math.round(chance), 10, 95);
}

function getBankTermsNote(bankType: BankOffer["type"]) {
  if (bankType === "public") return "Usually lower ROI, stricter document verification.";
  if (bankType === "private") return "Faster processing, ROI may vary by profile.";
  if (bankType === "hfc") return "Useful for home loan and construction finance.";
  if (bankType === "rrb") return "Good for local borrowers and rural areas.";
  if (bankType === "cooperative") return "Useful for regional and relationship-based lending.";
  return "Final terms depend on lender policy and borrower profile.";
}

export default function EmiCalculatorPage() {
  const [loanAmount, setLoanAmount] = useState(2500000);
  const [interestRate, setInterestRate] = useState(8.5);
  const [tenure, setTenure] = useState(20);
  const [tenureMode, setTenureMode] = useState<TenureMode>("years");
  const [extraPayment, setExtraPayment] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(80000);
  const [existingEmi, setExistingEmi] = useState(0);
  const [monthlyRent, setMonthlyRent] = useState(12000);
  const [age, setAge] = useState(30);
  const [employmentType, setEmploymentType] = useState<"salaried" | "business">("salaried");
  const [serviceProfile, setServiceProfile] = useState<
  "normal" | "govt_60" | "govt_65" | "doctor_professor"
    >("normal");

    const [loanPurpose, setLoanPurpose] = useState<
      "home" | "construction" | "plot"
    >("home");

  const [monthlyPensionIncome, setMonthlyPensionIncome] = useState(0);
  const [monthlyAgricultureIncome, setMonthlyAgricultureIncome] = useState(0);
  const [coApplicantIncome, setCoApplicantIncome] = useState(0);
  const [selectedBankState, setSelectedBankState] = useState("West Bengal");
  const [selectedBankName, setSelectedBankName] = useState("");

  const [liveLenderOffers, setLiveLenderOffers] = useState<
    LiveLenderOffer[]
  >([]);

  const [loadingLiveOffers, setLoadingLiveOffers] =
    useState(false);

  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadEmail, setLeadEmail] = useState("");

  const [submittingLead, setSubmittingLead] =
    useState(false);

  const [leadSuccess, setLeadSuccess] =
    useState(false);
  const [cibilScore, setCibilScore] = useState(760);
  const [isWomanBorrower, setIsWomanBorrower] = useState(false);
  const [customBankRates, setCustomBankRates] = useState<Record<string, number>>({});
  const [showAllBanks, setShowAllBanks] = useState(false);
  const [bankCategory, setBankCategory] = useState<
    "best" | "public" | "private" | "hfc" | "rrb" | "small_finance"
  >("best");

  
const chartColors = ["#22c55e", "#f97316"];

const eligibility = useMemo(() => {
  const totalIncome =
    monthlyIncome +
    Math.max(0, coApplicantIncome) +
    Math.max(0, monthlyPensionIncome) +
    Math.max(0, monthlyAgricultureIncome);

  let allowedEmiRatio =
    employmentType === "business" ? 0.45 : 0.5;

  if (Number(cibilScore) >= 780 && totalIncome >= 100000) {
    allowedEmiRatio = Math.min(allowedEmiRatio + 0.05, 0.55);
  }

  if (Number(cibilScore) < 680) {
    allowedEmiRatio = Math.min(allowedEmiRatio, 0.4);
  }

  if (Number(cibilScore) < 650) {
    allowedEmiRatio = Math.min(allowedEmiRatio, 0.35);
  }

  const maxEligibleEmi = Math.max(
    totalIncome * allowedEmiRatio - Number(existingEmi || 0),
    0
  );

  const monthlyRate = interestRate / 12 / 100;

const bankMaxTenureMonths = 360;

  let ageLimit = employmentType === "business" ? 70 : 60;

  if (
    employmentType === "salaried" &&
    (serviceProfile === "govt_65" || serviceProfile === "doctor_professor")
  ) {
    ageLimit = 65;
  }

  const ageValue = clamp(Number(age), 18, ageLimit);

  const maxTenureMonthsByAge = Math.max(
    0,
    Math.floor((ageLimit - ageValue) * 12)
  );

  const effectiveMonths = Math.min(
    bankMaxTenureMonths,
    maxTenureMonthsByAge
  );

  const effectiveYears = effectiveMonths / 12;

  const maxTenureByAge = maxTenureMonthsByAge / 12;

  const months = effectiveMonths;

  let eligibleLoan = 0;

  if (monthlyRate === 0) {
    eligibleLoan = maxEligibleEmi * months;
  } else {
    eligibleLoan =
      (maxEligibleEmi *
        (Math.pow(1 + monthlyRate, months) - 1)) /
      (monthlyRate * Math.pow(1 + monthlyRate, months));
  }

  let ltvRatio = 0.8;

  if (loanPurpose === "plot") {
    ltvRatio = 0.7;
  }

  if (loanPurpose === "construction") {
    ltvRatio = 0.75;
  }

  const estimatedPropertyValue = eligibleLoan / ltvRatio;
  const annualIncome = totalIncome * 12;

  const constructionStageRelease =
    loanPurpose === "construction"
      ? [
          "Foundation Stage",
          "Lintel/Roof Stage",
          "Brickwork & Structure",
          "Finishing Stage",
        ]
      : [];
  const pmayEligible = annualIncome <= 1800000;
  const womenBenefitRateReduction = isWomanBorrower ? 0.05 : 0;

let status = "Weak";

  if (
    maxEligibleEmi >= 70000 &&
    effectiveYears >= 20
  ) {
    status = "Excellent";
  } else if (
    maxEligibleEmi >= 30000 &&
    effectiveYears >= 10
  ) {
    status = "Moderate";
  }

  return {
    totalIncome,
    maxEligibleEmi,
    allowedEmiRatio,
    eligibleLoan,
    estimatedPropertyValue,
    status,
    maxTenureByAge,
    effectiveYears,
    effectiveMonths,
    annualIncome,
    pmayEligible,
    ltvRatio,
    constructionStageRelease,
    womenBenefitRateReduction,
  };
}, [
  monthlyIncome,
  coApplicantIncome,
  monthlyPensionIncome,
  monthlyAgricultureIncome,
  existingEmi,
  interestRate,
  employmentType,
  serviceProfile,
  loanPurpose,
  age,
  cibilScore,
  isWomanBorrower,
]);

useEffect(() => {
  const eligibleLoanAmount =
    Math.round((eligibility.eligibleLoan || 0) / 1000) * 1000;

  if (eligibleLoanAmount > 0) {
    setLoanAmount(eligibleLoanAmount);
  }

  if (eligibility.effectiveMonths > 0) {
    setTenureMode("months");
    setTenure(eligibility.effectiveMonths);
  }
}, [eligibility.eligibleLoan, eligibility.effectiveMonths]);

const bankOffers = useMemo(() => {
  const regionalOffers = getBankOffersByState(selectedBankState);

  const merged = [
    ...defaultBankOffers,
    ...regionalOffers,
  ];

  const unique = new Map<string, BankOffer>();

  merged.forEach((bank) => {
    unique.set(bank.bank, bank);
  });

  return Array.from(unique.values());
}, [selectedBankState]);

const mergedLiveBankOffers = useMemo(() => {
  if (!liveLenderOffers.length) {
    return bankOffers;
  }

  return bankOffers.map((bank) => {
    const liveMatch = liveLenderOffers.find(
      (offer) =>
        offer.lender_name.toLowerCase() ===
        bank.bank.toLowerCase()
    );

    if (!liveMatch) {
      return bank;
    }

    return {
      ...bank,
      indicativeRate:
        Number(liveMatch.min_roi) || bank.indicativeRate,
      processingFeePercent:
        Number(liveMatch.processing_fee_percent) ||
        bank.processingFeePercent,
      termsNote:
        liveMatch.terms_note || bank.termsNote,
      lastUpdated:
        liveMatch.updated_at || bank.lastUpdated,
    };
  });
}, [bankOffers, liveLenderOffers]);

useEffect(() => {
  let active = true;

  async function loadLiveOffers() {
    try {
      setLoadingLiveOffers(true);

      const params = new URLSearchParams({
        state: selectedBankState,
        productType: loanPurpose,
      });

      const response = await fetch(
        `/api/finance/lender-offers?${params.toString()}`,
        {
          cache: "no-store",
        }
      );

      const json = await response.json();

      if (!active) return;

      if (json?.ok && Array.isArray(json.offers)) {
        setLiveLenderOffers(json.offers);
      }
    } catch (error) {
      console.error("Failed to load live lender offers", error);
    } finally {
      if (active) {
        setLoadingLiveOffers(false);
      }
    }
  }

  loadLiveOffers();

  return () => {
    active = false;
  };
}, [selectedBankState, loanPurpose]);

async function submitFinanceLead() {
  try {
    setSubmittingLead(true);

    const response = await fetch(
      "/api/finance/loan-leads",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: leadName,
          phone: leadPhone,
          email: leadEmail,

          loanPurpose,
          state: selectedBankState,

          monthlyIncome,
          coApplicantIncome,
          existingEmi,
          cibilScore,

          eligibleLoan:
            selectedBankComparison?.eligibleLoan || 0,

          estimatedPropertyBudget:
            eligibility.estimatedPropertyValue || 0,

          preferredBank:
            selectedBankName ||
            selectedBankComparison?.bank ||
            "",
        }),
      }
    );

    const json = await response.json();

    if (!json?.ok) {
      alert("Unable to submit lead right now.");
      return;
    }

    setLeadSuccess(true);
  } catch (error) {
    console.error(error);
    alert("Something went wrong.");
  } finally {
    setSubmittingLead(false);
  }
}

const cibilRateAdjustment = useMemo(
  () => getCibilRateAdjustment(Number(cibilScore)),
  [cibilScore]
);

const bankComparisons = useMemo(() => {
  return mergedLiveBankOffers.map((bank) => {
    const baseRate = customBankRates[bank.bank] ?? bank.indicativeRate;
    const rate = clamp(
      baseRate + cibilRateAdjustment - eligibility.womenBenefitRateReduction,
      0,
      60
    );
    const emi = calculateEmi(eligibility.eligibleLoan, rate, eligibility.effectiveMonths);
    const totalPayment = emi * eligibility.effectiveMonths;
    const totalInterest = totalPayment - eligibility.eligibleLoan;
    const processingFeePercent =
      bank.processingFeePercent ?? estimateProcessingFee(bank.type);
    const processingFee = eligibility.eligibleLoan * (processingFeePercent / 100);
    const approvalChance = getApprovalChance(
      Number(cibilScore),
      bank.type,
      employmentType
    );

    return {
      ...bank,
      baseRate,
      rate,
      emi,
      eligibleLoan: eligibility.eligibleLoan,
      totalPayment,
      totalInterest,
      processingFeePercent,
      processingFee,
      approvalChance,
      lastUpdated: bank.lastUpdated || "Demo rate",
      termsNote: bank.termsNote || getBankTermsNote(bank.type),
    };
  });
}, [
  mergedLiveBankOffers,
  customBankRates,
  cibilRateAdjustment,
  eligibility.eligibleLoan,
  eligibility.effectiveMonths,
  eligibility.womenBenefitRateReduction,
  cibilScore,
  employmentType,
]);

const sortedBankComparisons = useMemo(() => {
  return [...bankComparisons].sort((a, b) => {
    if (a.emi <= 0 && b.emi <= 0) return a.rate - b.rate;
    if (a.emi <= 0) return 1;
    if (b.emi <= 0) return -1;
    return a.emi - b.emi;
  });
}, [bankComparisons]);

const filteredBankComparisons = useMemo(() => {
  if (bankCategory === "best") return sortedBankComparisons.slice(0, 5);
  return sortedBankComparisons.filter((bank) => bank.type === bankCategory);
}, [bankCategory, sortedBankComparisons]);

const visibleBankComparisons = showAllBanks
  ? filteredBankComparisons
  : filteredBankComparisons.slice(0, 3);

const bestBank = sortedBankComparisons[0];
const selectedBankComparison =
  sortedBankComparisons.find((bank) => bank.bank === selectedBankName) || bestBank;

useEffect(() => {
  if (!selectedBankName && sortedBankComparisons[0]?.bank) {
    setSelectedBankName(sortedBankComparisons[0].bank);
  }
}, [selectedBankName, sortedBankComparisons]);

const result = useMemo(() => {
    const principal = clamp(Number(loanAmount), 0, 500000000);
    const rate = clamp(Number(interestRate), 0, 60);
    const months =
      tenureMode === "years"
        ? clamp(Number(tenure), 1, 50) * 12
        : clamp(Number(tenure), 1, 600);

    const monthlyRate = rate / 12 / 100;

    const emi =
      monthlyRate === 0
        ? principal / months
        : (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
          (Math.pow(1 + monthlyRate, months) - 1);

    const totalPayment = emi * months;
    const totalInterest = totalPayment - principal;

    let balance = principal;
    let interestWithExtra = 0;
    let payoffMonths = months;
    const extra = clamp(Number(extraPayment), 0, 10000000);

    if (extra > 0 && principal > 0) {
      let count = 0;

      while (balance > 0 && count < months && count < 2000) {
        const interest = monthlyRate === 0 ? 0 : balance * monthlyRate;
        const principalPaid = Math.min(balance, emi + extra - interest);

        if (principalPaid <= 0) break;

        balance -= principalPaid;
        interestWithExtra += interest;
        count++;
      }

      payoffMonths = count || months;
    }

    return {
      principal,
      months,
      emi,
      totalInterest,
      totalPayment,
      interestSaved: extra > 0 ? Math.max(0, totalInterest - interestWithExtra) : 0,
      payoffMonths,
      principalShare: totalPayment > 0 ? (principal / totalPayment) * 100 : 0,
      interestShare: totalPayment > 0 ? (totalInterest / totalPayment) * 100 : 0,
    };
  }, [loanAmount, interestRate, tenure, tenureMode, extraPayment]);

  const safePropertyBudget = useMemo(() => {
    const totalIncome = Number(eligibility.totalIncome || 0);
    const safeEmiLimit = Math.max(totalIncome * 0.4 - Number(existingEmi || 0), 0);
    const bankEmiLimit = Number(eligibility.maxEligibleEmi || 0);
    const recommendedEmi = Math.min(safeEmiLimit, bankEmiLimit);

    const monthlyRate = Number(interestRate || 0) / 12 / 100;
    const months = Math.max(Number(eligibility.effectiveMonths || 0), 1);

    const safeLoan =
      monthlyRate === 0
        ? recommendedEmi * months
        : (recommendedEmi * (Math.pow(1 + monthlyRate, months) - 1)) /
          (monthlyRate * Math.pow(1 + monthlyRate, months));

    const recommendedPropertyBudget = safeLoan / 0.8;
    const suggestedDownPayment = recommendedPropertyBudget * 0.2;
    const registrationCost = recommendedPropertyBudget * 0.07;
    const reserveFund = recommendedPropertyBudget * 0.05;
    const totalCashNeeded = suggestedDownPayment + registrationCost + reserveFund;

    const emiToIncomeRatio =
      totalIncome > 0 ? Number(result.emi || 0) / totalIncome : 0;

    let risk = "Low Risk";
    let message = "Your EMI appears comfortable against your income.";

    if (emiToIncomeRatio > 0.5) {
      risk = "High Risk";
      message = "EMI is taking a high share of income. Prefer lower budget or higher down payment.";
    } else if (emiToIncomeRatio > 0.4) {
      risk = "Moderate Risk";
      message = "Budget is possible, but keep emergency savings before purchase.";
    }

    return {
      recommendedEmi,
      safeLoan,
      recommendedPropertyBudget,
      suggestedDownPayment,
      registrationCost,
      reserveFund,
      totalCashNeeded,
      risk,
      message,
    };
  }, [
    eligibility.totalIncome,
    eligibility.maxEligibleEmi,
    eligibility.effectiveMonths,
    existingEmi,
    interestRate,
    result.emi,
  ]);

    const aiFinancialHealth = useMemo(() => {
    const totalIncome = Number(eligibility.totalIncome || 0);
    const currentEmi = Number(result.emi || 0);
    const currentExistingEmi = Number(existingEmi || 0);
    const emiBurdenRatio = totalIncome > 0 ? currentEmi / totalIncome : 0;
    const totalDebtRatio =
      totalIncome > 0 ? (currentEmi + currentExistingEmi) / totalIncome : 0;

    let score = 100;

    if (totalIncome <= 0) score -= 60;
    if (emiBurdenRatio > 0.5) score -= 35;
    else if (emiBurdenRatio > 0.4) score -= 22;
    else if (emiBurdenRatio > 0.3) score -= 10;

    if (totalDebtRatio > 0.6) score -= 25;
    else if (totalDebtRatio > 0.5) score -= 15;
    else if (totalDebtRatio > 0.4) score -= 8;

    if (eligibility.effectiveYears < 8) score -= 14;
    else if (eligibility.effectiveYears < 15) score -= 7;

    if (Number(age) > 50) score -= 8;
    else if (Number(age) > 45) score -= 4;

    if (safePropertyBudget.risk === "High Risk") score -= 12;
    else if (safePropertyBudget.risk === "Moderate Risk") score -= 6;

    const finalScore = Math.max(0, Math.min(100, Math.round(score)));

    let status = "Financially Healthy";
    let badge = "🟢";
    let message =
      "Your current EMI plan looks comfortable. Keep emergency savings and avoid unnecessary extra debt.";

    if (finalScore < 55) {
      status = "Risky";
      badge = "🔴";
      message =
        "This plan may create pressure on monthly income. Reduce loan amount, increase down payment, or choose a lower budget.";
    } else if (finalScore < 75) {
      status = "Moderate";
      badge = "🟡";
      message =
        "This plan is possible, but maintain reserve funds and avoid stretching your EMI too high.";
    }

    const reserveNeeded = currentEmi * 6;

    return {
      score: finalScore,
      status,
      badge,
      message,
      emiBurdenRatio,
      totalDebtRatio,
      reserveNeeded,
    };
  }, [
    eligibility.totalIncome,
    eligibility.effectiveYears,
    existingEmi,
    result.emi,
    age,
    safePropertyBudget.risk,
  ]);

    const aiRentVsEmi = useMemo(() => {
    const rent = Number(monthlyRent || 0);
    const emi = Number(result.emi || 0);
    const propertyBudget = Number(safePropertyBudget.recommendedPropertyBudget || 0);
    const yearlyRent = rent * 12;
    const yearlyEmi = emi * 12;
    const yearlyDifference = yearlyEmi - yearlyRent;
    const fiveYearRentOutflow = yearlyRent * 5;
    const fiveYearEmiOutflow = yearlyEmi * 5;
    const estimatedFiveYearAppreciation = propertyBudget * 0.25;

    let verdict = "Buying appears smarter";
    let badge = "🟢";
    let confidence = "High";
    let message =
      "Buying may be a better long-term decision if your EMI is comfortable and you plan to stay for several years.";

    if (rent <= 0) {
      verdict = "Add rent for better analysis";
      badge = "⚪";
      confidence = "Low";
      message =
        "Enter your current monthly rent to compare renting against buying more accurately.";
    } else if (emi > rent * 2.2) {
      verdict = "Renting may be safer now";
      badge = "🟡";
      confidence = "Medium";
      message =
        "Your EMI is much higher than current rent. Consider waiting, increasing down payment, or choosing a lower-budget property.";
    } else if (emi > rent * 1.6) {
      verdict = "Buying is possible with caution";
      badge = "🟡";
      confidence = "Medium";
      message =
        "Buying is possible, but EMI is significantly higher than rent. Keep emergency reserve before purchase.";
    }

    return {
      rent,
      emi,
      yearlyRent,
      yearlyEmi,
      yearlyDifference,
      fiveYearRentOutflow,
      fiveYearEmiOutflow,
      estimatedFiveYearAppreciation,
      verdict,
      badge,
      confidence,
      message,
    };
  }, [monthlyRent, result.emi, safePropertyBudget.recommendedPropertyBudget]);

    const aiDownPayment = useMemo(() => {
    const propertyBudget = Number(
      safePropertyBudget.recommendedPropertyBudget || 0
    );

    const minimumDownPayment = propertyBudget * 0.1;
    const recommendedDownPayment = propertyBudget * 0.25;
    const aggressiveDownPayment = propertyBudget * 0.4;

    const currentLoan = propertyBudget * 0.8;
    const recommendedLoan = propertyBudget - recommendedDownPayment;
    const aggressiveLoan = propertyBudget - aggressiveDownPayment;

    const monthlyRate = Number(interestRate || 0) / 12 / 100;
    const months = Math.max(Number(eligibility.effectiveMonths || 0), 1);

    const calculateEmi = (loan: number) => {
      if (monthlyRate === 0) return loan / months;

      return (
        (loan *
          monthlyRate *
          Math.pow(1 + monthlyRate, months)) /
        (Math.pow(1 + monthlyRate, months) - 1)
      );
    };

    const currentEstimatedEmi = calculateEmi(currentLoan);
    const recommendedEstimatedEmi = calculateEmi(recommendedLoan);
    const aggressiveEstimatedEmi = calculateEmi(aggressiveLoan);

    const emiSaving =
      currentEstimatedEmi - recommendedEstimatedEmi;

    let recommendation = "Recommended 25% down payment";
    let badge = "🟢";

    if (aiFinancialHealth.score < 60) {
      recommendation = "Increase down payment before purchase";
      badge = "🟡";
    }

    return {
      minimumDownPayment,
      recommendedDownPayment,
      aggressiveDownPayment,
      currentEstimatedEmi,
      recommendedEstimatedEmi,
      aggressiveEstimatedEmi,
      emiSaving,
      recommendation,
      badge,
    };
  }, [
    safePropertyBudget.recommendedPropertyBudget,
    interestRate,
    eligibility.effectiveMonths,
    aiFinancialHealth.score,
  ]);

    const aiBuyingCost = useMemo(() => {
    const propertyBudget = Number(
      safePropertyBudget.recommendedPropertyBudget || 0
    );

    const registrationCost = propertyBudget * 0.07;
    const furnishingCost = propertyBudget * 0.05;
    const modularKitchenCost = propertyBudget * 0.025;
    const electricalCost = propertyBudget * 0.018;
    const paintingCost = propertyBudget * 0.012;
    const shiftingReserve = propertyBudget * 0.01;
    const emergencyReserve = propertyBudget * 0.03;

    const totalHiddenCost =
      registrationCost +
      furnishingCost +
      modularKitchenCost +
      electricalCost +
      paintingCost +
      shiftingReserve +
      emergencyReserve;

    const totalBuyingRequirement =
      propertyBudget + totalHiddenCost;

    let warning =
      "Your overall buying cost appears manageable.";

    if (totalHiddenCost > propertyBudget * 0.18) {
      warning =
        "Hidden buying and setup costs are becoming significantly high. Keep reserve savings before final purchase.";
    }

    return {
      registrationCost,
      furnishingCost,
      modularKitchenCost,
      electricalCost,
      paintingCost,
      shiftingReserve,
      emergencyReserve,
      totalHiddenCost,
      totalBuyingRequirement,
      warning,
    };
  }, [safePropertyBudget.recommendedPropertyBudget]);

  const financeAwareLinks = useMemo(() => {
    const safeBudget = Math.round(
      Number(safePropertyBudget.recommendedPropertyBudget || 0)
    );

    const minBudget = Math.max(Math.round(safeBudget * 0.75), 0);
    const maxBudget = Math.max(Math.round(safeBudget * 1.05), 0);

    return {
      property: `/property?minBudget=${minBudget}&maxBudget=${maxBudget}`,
      projects: `/property/projects?minBudget=${minBudget}&maxBudget=${maxBudget}`,
      rfq: `/rfq/general/new?budget=${safeBudget}&source=emi-calculator`,
    };
  }, [safePropertyBudget.recommendedPropertyBudget]);

  const amortization: {
    month: number;
    emi: number;
    principal: number;
    interest: number;
    balance: number;
  }[] = [];

  let balance = result.principal;
  const monthlyRate = interestRate / 12 / 100;

  for (let month = 1; month <= Math.min(result.months, 12); month++) {
    const interest =
      monthlyRate === 0 ? 0 : balance * monthlyRate;

    const principalPaid = result.emi - interest;

    balance -= principalPaid;

    amortization.push({
      month,
      emi: result.emi,
      principal: principalPaid,
      interest,
      balance: Math.max(balance, 0),
    });
  }

  function downloadReport() {
    const lines = [
      "3Bigha EMI & Loan Eligibility Report",
      "------------------------------------",
      "Loan Eligibility Summary",
      `Monthly Income: ${formatINR(monthlyIncome)}`,
      `Co-Applicant Income: ${formatINR(coApplicantIncome)}`,
      `Total Monthly Income: ${formatINR(eligibility.totalIncome)}`,
      `Existing EMI: ${formatINR(existingEmi)}`,
      `Age: ${age} years`,
      `Employment Type: ${employmentType}`,
      `Eligible Loan Amount: ${formatINR(eligibility.eligibleLoan)}`,
      `Estimated Property Budget: ${formatINR(eligibility.estimatedPropertyValue)}`,
      `Safe EMI Capacity: ${formatINR(eligibility.maxEligibleEmi)}`,
      `Eligibility Status: ${eligibility.status}`,
      `Maximum Tenure Allowed by Age: ${eligibility.maxTenureByAge.toFixed(1)} years`,
      `Effective Tenure Used: ${eligibility.effectiveMonths} EMIs (${eligibility.effectiveYears.toFixed(1)} years)`,
      "",
      "EMI Summary",
      `Loan Amount Used for EMI: ${formatINR(result.principal)}`,
      `Rate of Interest: ${interestRate}% p.a.`,
      `Tenure: ${result.months} months`,
      `Monthly EMI: ${formatINR(result.emi)}`,
      `Total Interest: ${formatINR(result.totalInterest)}`,
      `Total Payment: ${formatINR(result.totalPayment)}`,
      `Extra Monthly Payment: ${formatINR(extraPayment)}`,
      `Estimated Interest Saved: ${formatINR(result.interestSaved)}`,
      "",
      "Amortization Schedule - First 12 Months",
      "Month | EMI | Principal | Interest | Balance",
      ...amortization.map(
        (row) =>
          `${row.month} | ${formatINR(row.emi)} | ${formatINR(row.principal)} | ${formatINR(row.interest)} | ${formatINR(row.balance)}`
      ),
      "",
      "Note: This is an estimated calculation. Final eligibility depends on bank/NBFC policy, credit score, property documents and other verification.",
      "",
      "Generated from 3Bigha.com EMI Calculator",
    ];

    const blob = new Blob([lines.join("\n")], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "3bigha-emi-report.txt";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function shareCalculation() {
    const text =
      `3Bigha EMI Calculation: Loan ${formatINR(result.principal)}, ` +
      `Rate ${interestRate}% p.a., Tenure ${result.months} months, ` +
      `EMI ${formatINR(result.emi)}.`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "3Bigha EMI Calculation",
          text,
          url: window.location.href,
        });
        return;
      }

      await navigator.clipboard.writeText(text);
      alert("EMI calculation copied to clipboard.");
    } catch {
      alert(text);
    }
  }

  return (
    <main className="emiPage">
      <section className="emiHero">
        <div className="emiHeroText">
          <span>🏦 3Bigha Finance Tool</span>
          <h1>EMI Calculator</h1>
          <p>
            Calculate monthly EMI, total interest, total payable amount and
            prepayment benefit for home loan, land purchase, construction loan
            or business finance.
          </p>
        </div>

        <div className="heroMiniCard">
          <strong>{formatINR(result.emi)}</strong>
          <span>Estimated Monthly EMI</span>
        </div>
      </section>

      <section className="financeLeadSection">
        <div className="financeLeadCard">
          <div className="financeLeadHeader">
            <div>
              <h3>Need Loan Assistance?</h3>

              <p>
                Get help for home loan, construction loan,
                plot loan, PMAY guidance and bank selection.
              </p>
            </div>

            <div className="financeLeadBadge">
              Finance Support
            </div>
          </div>

          {leadSuccess ? (
            <div className="financeLeadSuccess">
              Your request has been submitted successfully.
              Our finance assistance team can now contact you.
            </div>
          ) : (
            <>
              <div className="financeLeadGrid">
                <input
                  type="text"
                  placeholder="Your Name"
                  value={leadName}
                  onChange={(e) =>
                    setLeadName(e.target.value)
                  }
                />

                <input
                  type="tel"
                  placeholder="Mobile Number"
                  value={leadPhone}
                  onChange={(e) =>
                    setLeadPhone(e.target.value)
                  }
                />

                <input
                  type="email"
                  placeholder="Email Optional"
                  value={leadEmail}
                  onChange={(e) =>
                    setLeadEmail(e.target.value)
                  }
                />
              </div>

              <div className="financeLeadSummary">
                <div>
                  <span>Estimated Eligibility</span>
                  <strong>
                    {formatINR(
                      selectedBankComparison?.eligibleLoan || 0
                    )}
                  </strong>
                </div>

                <div>
                  <span>Preferred Bank</span>
                  <strong>
                    {selectedBankName ||
                      selectedBankComparison?.bank ||
                      "Best Match"}
                  </strong>
                </div>

                <div>
                  <span>Loan Purpose</span>
                  <strong>{loanPurpose}</strong>
                </div>
              </div>

              <button
                className="financeLeadButton"
                disabled={
                  submittingLead ||
                  !leadName.trim() ||
                  !leadPhone.trim()
                }
                onClick={submitFinanceLead}
              >
                {submittingLead
                  ? "Submitting..."
                  : "Get Loan Assistance"}
              </button>
            </>
          )}
        </div>
      </section>

      <section className="emiCard">
        <div className="emiForm">
          <div className="fieldTop">
            <label>Loan Amount</label>
            <strong>{formatINR(loanAmount)}</strong>
          </div>
          <input
            type="range"
            min="10000"
            max="50000000"
            step="10000"
            value={loanAmount}
            onChange={(e) => setLoanAmount(Number(e.target.value))}
          />
          <input
            type="number"
            value={loanAmount}
            onChange={(e) => setLoanAmount(Number(e.target.value))}
          />

          <div className="fieldTop">
            <label>Rate of Interest Bank-wise Customisable</label>
            <strong>{interestRate}% p.a.</strong>
          </div>
          <input
            type="range"
            min="1"
            max="30"
            step="0.1"
            value={interestRate}
            onChange={(e) => setInterestRate(Number(e.target.value))}
          />
          <input
            type="number"
            step="0.01"
            value={interestRate}
            onChange={(e) => setInterestRate(Number(e.target.value))}
            placeholder="Enter bank interest rate"
          />

          <div className="fieldTop">
            <label>Loan Tenure</label>
            <strong>
              {tenureMode === "years" ? `${tenure} years` : `${tenure} months`}
            </strong>
          </div>

          <div className="tenureSwitch">
            <button
              type="button"
              className={tenureMode === "years" ? "active" : ""}
              onClick={() => setTenureMode("years")}
            >
              Years
            </button>
            <button
              type="button"
              className={tenureMode === "months" ? "active" : ""}
              onClick={() => setTenureMode("months")}
            >
              Months
            </button>
          </div>

          <input
            type="range"
            min="1"
            max={tenureMode === "years" ? "40" : "480"}
            step="1"
            value={tenure}
            onChange={(e) => setTenure(Number(e.target.value))}
          />
          <input
            type="number"
            value={tenure}
            onChange={(e) => setTenure(Number(e.target.value))}
          />

          <div className="eligibilityDivider">
            <strong>Loan Eligibility Details</strong>
            <span>Check home loan eligibility based on income and age</span>
          </div>

          <div className="fieldTop">
            <label>Monthly Income</label>
            <strong>{formatINR(monthlyIncome)}</strong>
          </div>

          <input
            type="number"
            value={monthlyIncome}
            onChange={(e) => setMonthlyIncome(Number(e.target.value))}
            placeholder="Monthly income"
          />

          <div className="fieldTop">
            <label>Existing EMI</label>
            <strong>{formatINR(existingEmi)}</strong>
          </div>

          <input
            type="number"
            value={existingEmi}
            onChange={(e) => setExistingEmi(Number(e.target.value))}
            placeholder="Current EMI obligations"
          />

          <div className="fieldTop">
            <label>Current Monthly Rent Optional</label>
            <strong>{formatINR(monthlyRent)}</strong>
          </div>

          <input
            type="number"
            value={monthlyRent}
            onChange={(e) => setMonthlyRent(Number(e.target.value))}
            placeholder="Example: 12000"
          />

          <div className="fieldTop">
            <label>Age</label>
            <strong>{age} years</strong>
          </div>

          <input
            type="range"
            min="18"
            max="70"
            step="1"
            value={age}
            onChange={(e) => setAge(Number(e.target.value))}
          />

          <input
            type="number"
            value={age}
            onChange={(e) => setAge(Number(e.target.value))}
          />

          <div className="fieldTop">
            <label>Employment Type</label>
            <strong>{employmentType}</strong>
          </div>

          <div className="tenureSwitch">
            <button
              type="button"
              className={employmentType === "salaried" ? "active" : ""}
              onClick={() => setEmploymentType("salaried")}
            >
              Salaried
            </button>

            <button
              type="button"
              className={employmentType === "business" ? "active" : ""}
              onClick={() => setEmploymentType("business")}
            >
              Business
            </button>
          </div>

          {employmentType === "salaried" ? (
            <>
              <div className="fieldTop">
                <label>Service / Retirement Profile</label>
                <strong>
                  {serviceProfile === "normal"
                    ? "Normal 60"
                    : serviceProfile === "govt_60"
                      ? "Govt 60"
                      : serviceProfile === "govt_65"
                        ? "Govt 65"
                        : "Doctor / Professor"}
                </strong>
              </div>

              <div className="fieldTop">
                <label>Loan Purpose</label>
                <strong>
                  {loanPurpose === "home"
                    ? "Home Purchase"
                    : loanPurpose === "construction"
                      ? "House Construction"
                      : "Plot Purchase"}
                </strong>
              </div>

              <select
                className="stateSelect"
                value={loanPurpose}
                onChange={(e) =>
                  setLoanPurpose(
                    e.target.value as "home" | "construction" | "plot"
                  )
                }
              >
                <option value="home">Ready House / Flat Purchase</option>
                <option value="construction">House Construction Loan</option>
                <option value="plot">Plot / Land Purchase Loan</option>
              </select>

              <select
                className="stateSelect"
                value={serviceProfile}
                onChange={(e) =>
                  setServiceProfile(
                    e.target.value as
                      | "normal"
                      | "govt_60"
                      | "govt_65"
                      | "doctor_professor"
                  )
                }
              >
                <option value="normal">Normal salaried / retirement at 60</option>
                <option value="govt_60">Government service / retirement at 60</option>
                <option value="govt_65">Government service / retirement at 65</option>
                <option value="doctor_professor">Doctor / professor / professional service up to 65</option>
              </select>
            </>
          ) : null}

          <div className="fieldTop">
            <label>Co-Applicant Income Optional</label>
            <strong>{formatINR(coApplicantIncome)}</strong>
          </div>

          <label className="womanBorrowerBox">
            <input
              type="checkbox"
              checked={isWomanBorrower}
              onChange={(e) => setIsWomanBorrower(e.target.checked)}
            />

            <span>
              <strong>Woman Borrower Benefit</strong>
              <small>Some banks may offer slightly lower ROI for woman borrowers.</small>
            </span>
          </label>

          <input
            type="number"
            value={coApplicantIncome}
            onChange={(e) => setCoApplicantIncome(Number(e.target.value))}
            placeholder="Optional co-applicant income"
          />

          <div className="fieldTop">
            <label>Pension Income Optional</label>
            <strong>{formatINR(monthlyPensionIncome)}</strong>
          </div>

          <input
            type="number"
            value={monthlyPensionIncome}
            onChange={(e) => setMonthlyPensionIncome(Number(e.target.value))}
            placeholder="Monthly pension income"
          />

          <div className="fieldTop">
            <label>Agriculture Income Optional</label>
            <strong>{formatINR(monthlyAgricultureIncome)}</strong>
          </div>

          <input
            type="number"
            value={monthlyAgricultureIncome}
            onChange={(e) => setMonthlyAgricultureIncome(Number(e.target.value))}
            placeholder="Monthly agriculture income"
          />

          <div className="fieldTop">
            <label>Extra Monthly Payment Optional</label>
            <strong>{formatINR(extraPayment)}</strong>
          </div>
          <input
            type="number"
            value={extraPayment}
            onChange={(e) => setExtraPayment(Number(e.target.value))}
            placeholder="Example: 5000"
          />
        </div>

        <div className="emiResult">
          <div className="mainResult">
            <span>Monthly EMI</span>
            <strong>{formatINR(result.emi)}</strong>
            <small>
              Tenure: {result.months} months ({(result.months / 12).toFixed(1)} years)
            </small>
          </div>

          <div className="resultGrid">
            <div>
              <span>Principal</span>
              <strong>{formatINR(result.principal)}</strong>
            </div>
            <div>
              <span>Total Interest</span>
              <strong>{formatINR(result.totalInterest)}</strong>
            </div>
            <div>
              <span>Total Payment</span>
              <strong>{formatINR(result.totalPayment)}</strong>
            </div>
            <div>
              <span>Interest Saved</span>
              <strong>{formatINR(result.interestSaved)}</strong>
            </div>
          </div>

          <div className="chartSection">

            <div className="chartBox">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={[
                      {
                        name: "Principal",
                        value: result.principal,
                      },
                      {
                        name: "Interest",
                        value: result.totalInterest,
                      },
                    ]}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={46}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartColors.map((color, index) => (
                      <Cell key={index} fill={color} />
                    ))}
                  </Pie>

                  <Tooltip
                    formatter={(value) =>
                      formatINR(typeof value === "number" ? value : Number(value || 0))
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="paymentBar">
              <div
                className="principalBar"
                style={{ width: `${Math.max(result.principalShare, 2)}%` }}
              />
              <div
                className="interestBar"
                style={{ width: `${Math.max(result.interestShare, 2)}%` }}
              />
            </div>

          </div>

          <div className="legend">
            <span><b className="principalDot" /> Principal</span>
            <span><b className="interestDot" /> Interest</span>
          </div>

          <div className="eligibilityBox">
            <strong>Loan Eligibility Estimate</strong>

            <div className="eligibilityGrid">
              <div>
                <span>Eligible Loan</span>
                <strong>{formatINR(eligibility.eligibleLoan)}</strong>
              </div>

              <div>
                <span>Estimated Property Budget</span>
                <strong>{formatINR(eligibility.estimatedPropertyValue)}</strong>
              </div>

              <div>
                <span>Safe EMI Capacity</span>
                <strong>{formatINR(eligibility.maxEligibleEmi)}</strong>
                <small>
                  Deduction ratio used: {Math.round(eligibility.allowedEmiRatio * 100)}% of net monthly income
                </small>
              </div>

              <div>
                <span>Eligibility Status</span>
                <strong>{eligibility.status}</strong>
              </div>
            </div>

            <div className="eligibilityTips">
              <p>
                Maximum tenure allowed by age and service profile:
                <b> {eligibility.maxTenureByAge} years</b>
              </p>

              <p>
                Effective tenure used in eligibility:
                <b> {eligibility.effectiveMonths} EMIs ({eligibility.effectiveYears.toFixed(1)} years)</b>
              </p>

              <p>
                EMI deduction rule:
                <b> {Math.round(eligibility.allowedEmiRatio * 100)}% of monthly net income</b>{" "}
                has been used after considering employment type, CIBIL score and existing EMI.
              </p>

              <p>
                Loan-to-value ratio used:
                <b> {Math.round(eligibility.ltvRatio * 100)}%</b>
              </p>

              <p>
                PMAY income check:
                <b>
                  {eligibility.pmayEligible
                    ? " Potentially eligible under income range"
                    : " Income appears above common PMAY range"}
                </b>
              </p>

              {existingEmi > 0 ? (
                <p>
                  Reducing existing EMI obligations may improve loan eligibility.
                </p>
              ) : null}

              {coApplicantIncome === 0 ? (
                <p>
                  Adding co-applicant income can increase eligible loan amount.
                </p>
              ) : null}

              {eligibility.constructionStageRelease?.length ? (
                <div className="constructionStageBox">
                  <strong>Construction Loan Stage Disbursement</strong>

                  <ul>
                    {eligibility.constructionStageRelease.map((stage: string) => (
                      <li key={stage}>{stage}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>

          <div className="aiBudgetBox">
            <div className="aiBudgetHeader">
              <span>🤖 AI Safe Property Budget</span>
              <strong>{formatINR(safePropertyBudget.recommendedPropertyBudget)}</strong>
              <small>{safePropertyBudget.risk}</small>
            </div>

            <details>
              <summary>View recommended safe property budget</summary>
              <p>
                Based on income, existing EMI, age-based tenure and current interest rate,
                a safer buying budget is around{" "}
                <b>{formatINR(safePropertyBudget.recommendedPropertyBudget)}</b>.
              </p>
            </details>

            <details>
              <summary>View down payment and cash requirement</summary>
              <p>
                Suggested down payment:{" "}
                <b>{formatINR(safePropertyBudget.suggestedDownPayment)}</b>. Estimated
                registration and reserve fund may need around{" "}
                <b>{formatINR(safePropertyBudget.registrationCost + safePropertyBudget.reserveFund)}</b>.
              </p>
            </details>

            <details>
              <summary>View monthly income safety analysis</summary>
              <p>{safePropertyBudget.message}</p>
            </details>
          </div>

                    <div className="aiHealthBox">
            <div className="aiBudgetHeader">
              <span>🧠 AI Financial Health Score</span>
              <strong>
                {aiFinancialHealth.badge} {aiFinancialHealth.score}/100
              </strong>
              <small>{aiFinancialHealth.status}</small>
            </div>

            <details>
              <summary>View affordability risk analysis</summary>
              <p>{aiFinancialHealth.message}</p>
            </details>

            <details>
              <summary>View EMI burden and debt ratio</summary>
              <p>
                EMI burden is around{" "}
                <b>{Math.round(aiFinancialHealth.emiBurdenRatio * 100)}%</b> of
                monthly income. Total debt burden including existing EMI is around{" "}
                <b>{Math.round(aiFinancialHealth.totalDebtRatio * 100)}%</b>.
              </p>
            </details>

            <details>
              <summary>View emergency reserve suggestion</summary>
              <p>
                Recommended minimum emergency reserve before buying property:{" "}
                <b>{formatINR(aiFinancialHealth.reserveNeeded)}</b>.
              </p>
            </details>
          </div>

                    <div className="aiRentBox">
            <div className="aiBudgetHeader">
              <span>🏠 AI Rent vs EMI Decision</span>
              <strong>
                {aiRentVsEmi.badge} {aiRentVsEmi.verdict}
              </strong>
              <small>Confidence: {aiRentVsEmi.confidence}</small>
            </div>

            <details>
              <summary>View rent vs EMI comparison</summary>
              <p>
                Current monthly rent is <b>{formatINR(aiRentVsEmi.rent)}</b>.
                Estimated EMI is <b>{formatINR(aiRentVsEmi.emi)}</b>.
                Annual EMI difference against rent is around{" "}
                <b>{formatINR(aiRentVsEmi.yearlyDifference)}</b>.
              </p>
            </details>

            <details>
              <summary>View 5-year money impact</summary>
              <p>
                In 5 years, rent outflow may be around{" "}
                <b>{formatINR(aiRentVsEmi.fiveYearRentOutflow)}</b>, while EMI
                outflow may be around{" "}
                <b>{formatINR(aiRentVsEmi.fiveYearEmiOutflow)}</b>. Estimated
                property value growth may be around{" "}
                <b>{formatINR(aiRentVsEmi.estimatedFiveYearAppreciation)}</b>.
              </p>
            </details>

            <details>
              <summary>View AI recommendation</summary>
              <p>{aiRentVsEmi.message}</p>
            </details>
          </div>

                    <div className="aiDownPaymentBox">
            <div className="aiBudgetHeader">
              <span>💰 AI Down Payment Strategy</span>
              <strong>
                {aiDownPayment.badge} {aiDownPayment.recommendation}
              </strong>
              <small>
                Suggested: {formatINR(aiDownPayment.recommendedDownPayment)}
              </small>
            </div>

            <details>
              <summary>View down payment options</summary>
              <p>
                Minimum suggested down payment:{" "}
                <b>{formatINR(aiDownPayment.minimumDownPayment)}</b>.
                Safer recommended down payment:{" "}
                <b>{formatINR(aiDownPayment.recommendedDownPayment)}</b>.
                Aggressive wealth-protection down payment:{" "}
                <b>{formatINR(aiDownPayment.aggressiveDownPayment)}</b>.
              </p>
            </details>

            <details>
              <summary>View EMI reduction impact</summary>
              <p>
                Estimated EMI with safer down payment may reduce to{" "}
                <b>{formatINR(aiDownPayment.recommendedEstimatedEmi)}</b>.
                Approximate EMI reduction:{" "}
                <b>{formatINR(aiDownPayment.emiSaving)}</b> per month.
              </p>
            </details>

            <details>
              <summary>View AI recommendation</summary>
              <p>
                Larger down payment reduces EMI pressure, interest burden,
                and long-term financial stress while improving loan approval comfort.
              </p>
            </details>
          </div>

                    <div className="aiBuyingCostBox">
            <div className="aiBudgetHeader">
              <span>🏗 AI Total Buying Cost</span>

              <strong>
                {formatINR(aiBuyingCost.totalHiddenCost)}
              </strong>

              <small>
                Hidden + setup ownership cost
              </small>
            </div>

            <details>
              <summary>View registration and legal cost</summary>

              <p>
                Estimated registration/stamp duty related cost:
                <b>
                  {" "}
                  {formatINR(aiBuyingCost.registrationCost)}
                </b>
              </p>
            </details>

            <details>
              <summary>View furnishing and setup estimate</summary>

              <p>
                Furnishing:
                <b>
                  {" "}
                  {formatINR(aiBuyingCost.furnishingCost)}
                </b>
                , Modular kitchen:
                <b>
                  {" "}
                  {formatINR(aiBuyingCost.modularKitchenCost)}
                </b>
                , Electrical setup:
                <b>
                  {" "}
                  {formatINR(aiBuyingCost.electricalCost)}
                </b>
                , Painting/setup:
                <b>
                  {" "}
                  {formatINR(aiBuyingCost.paintingCost)}
                </b>
              </p>
            </details>

            <details>
              <summary>View reserve and safety recommendation</summary>

              <p>
                Suggested emergency + shifting reserve:
                <b>
                  {" "}
                  {formatINR(
                    aiBuyingCost.shiftingReserve +
                      aiBuyingCost.emergencyReserve
                  )}
                </b>
                . {aiBuyingCost.warning}
              </p>
            </details>

            <details>
              <summary>View actual estimated buying requirement</summary>

              <p>
                Estimated total real buying requirement including hidden/setup
                costs:
                <b>
                  {" "}
                  {formatINR(
                    aiBuyingCost.totalBuyingRequirement
                  )}
                </b>
              </p>
            </details>
          </div>

          <div className="summaryBox">
            <strong>Loan Summary</strong>
            <p>
              For a loan of {formatINR(result.principal)} at {interestRate}% annual
              interest for {result.months} months, estimated EMI is{" "}
              {formatINR(result.emi)}.
            </p>

            {extraPayment > 0 ? (
              <p>
                With extra monthly payment of {formatINR(extraPayment)}, loan may
                close in around {result.payoffMonths} months and save about{" "}
                {formatINR(result.interestSaved)}.
              </p>
            ) : null}
          </div>

          <div className="aiDiscoveryBridge">
            <strong>🏡 Finance-Aware Property Discovery</strong>
            <span>
              Based on your safe buying budget, 3Bigha can now guide you toward
              properties and projects that better match your EMI comfort.
            </span>
          </div>

          <div className="emiActions">
            <a href={financeAwareLinks.property}>
              View Affordable Properties
            </a>
            <a href={financeAwareLinks.projects}>
              View Projects in Budget
            </a>
            <a href={financeAwareLinks.rfq}>
              Submit Finance-Aware Requirement
            </a>
          </div>

          <div className="emiUtilityActions">
            <button type="button" onClick={downloadReport}>
              Download Report
            </button>
            <button type="button" onClick={shareCalculation}>
              Share Calculation
            </button>
          </div>
        </div>
      </section>

      <section className="bankCompareSection bg-white border border-slate-200 rounded-2xl p-4 md:p-6 mt-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                Compare Bank Offers
              </div>

              <div className="rounded-full bg-emerald-100 text-emerald-700 px-2 py-1 text-[11px] font-bold">
                {loadingLiveOffers
                  ? "Loading live ROI..."
                  : liveLenderOffers.length
                    ? "Live Verified ROI"
                    : "Demo ROI"}
              </div>
            </div>

            <h2 className="text-lg md:text-xl font-bold text-slate-900 mt-1">
              Compare EMI, Interest & Eligibility
            </h2>

            <p className="text-sm text-slate-600 mt-1">
              Compare indicative EMI, loan eligibility and total repayment across public,
              private, cooperative, gramin and housing finance institutions.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="min-w-[220px]">
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Select Bank
              </label>

              <select
                value={selectedBankName}
                onChange={(e) => setSelectedBankName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
              >
                {sortedBankComparisons.map((bank) => (
                  <option key={bank.bank} value={bank.bank}>
                    {bank.bank}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-[180px]">
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                CIBIL Score
              </label>

              <input
                type="number"
                min={300}
                max={900}
                value={cibilScore}
                onChange={(e) => setCibilScore(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />

              <div className="text-[11px] text-slate-500 mt-1">
                Status: {getCibilStatus(cibilScore)}
              </div>
            </div>

            <div className="min-w-[220px]">
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Regional / Gramin Banks
              </label>

              <select
                value={selectedBankState}
                onChange={(e) => setSelectedBankState(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
              >
                {indianStatesWithRegionalBanks.map((state) => (
                  <option key={state} value={state}>
                    {state} Regional Banks
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 border border-emerald-200 bg-emerald-50 rounded-2xl p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Lowest Indicative Interest
            </div>

            <div className="mt-2 text-lg font-bold text-slate-900">
              {bestBank?.bank}
            </div>

            <div className="mt-1 text-sm text-slate-700">
              Estimated ROI: <span className="font-semibold">{bestBank?.rate.toFixed(2)}%</span>
            </div>

            <div className="mt-1 text-sm text-slate-700">
              Estimated EMI: <span className="font-semibold">{formatINR(bestBank?.emi || 0)}</span>
            </div>

            <div className="mt-1 text-sm text-slate-700">
              Estimated Total Interest:{" "}
              <span className="font-semibold">
                {formatINR(bestBank?.totalInterest || 0)}
              </span>
            </div>

            <div className="mt-3 text-xs text-slate-600 leading-relaxed">
              Estimated rate adjusted using your CIBIL score and indicative market lending trends.
              Final sanction depends on bank policy, income proof, property verification,
              employer profile, LTV ratio and repayment history.
            </div>
          </div>

          <div className="border border-blue-200 bg-blue-50 rounded-2xl p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">
              Selected Bank Snapshot
            </div>

            <div className="mt-2 text-base font-bold text-slate-900">
              {selectedBankComparison?.bank}
            </div>

            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-slate-600">Indicative ROI</span>
                <span className="font-semibold">
                  {selectedBankComparison?.rate.toFixed(2)}%
                </span>
              </div>

              <div className="flex justify-between gap-3">
                <span className="text-slate-600">Estimated EMI</span>
                <span className="font-semibold">
                  {formatINR(selectedBankComparison?.emi || 0)}
                </span>
              </div>

              <div className="flex justify-between gap-3">
                <span className="text-slate-600">Total Interest</span>
                <span className="font-semibold">
                  {formatINR(selectedBankComparison?.totalInterest || 0)}
                </span>
              </div>

              <div className="flex justify-between gap-3">
                <span className="text-slate-600">Total Payment</span>
                <span className="font-semibold">
                  {formatINR(selectedBankComparison?.totalPayment || 0)}
                </span>
              </div>
            </div>

            <div className="mt-4 text-xs text-slate-600 leading-relaxed">
              Better CIBIL score and lower existing EMI can improve final sanctioned rate.
              <br />
              Approval chance: <b>{selectedBankComparison?.approvalChance}%</b>
              <br />
              Processing fee estimate:{" "}
              <b>{formatINR(selectedBankComparison?.processingFee || 0)}</b>
              <br />
              Terms: {selectedBankComparison?.termsNote}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto mt-5">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr className="bg-slate-100 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-slate-700">Bank</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-700">Type</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-700">ROI</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-700">EMI</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-700">Eligible Loan</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-700">Total Interest</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-700">Processing Fee</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-700">Approval Chance</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-700">Updated</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-700">Total Payment</th>
              </tr>
            </thead>

            <tbody>
              {sortedBankComparisons
                .slice(0, showAllBanks ? sortedBankComparisons.length : 8)
                .map((bank) => (
                  <tr
                    key={bank.bank}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{bank.bank}</div>

                      {bank.bank === bestBank?.bank ? (
                        <div className="text-[11px] text-emerald-600 font-semibold mt-1">
                          Lowest estimated ROI
                        </div>
                      ) : null}
                    </td>

                    <td className="px-4 py-3 text-sm uppercase text-slate-600">
                      {bank.type}
                    </td>

                    <td className="px-4 py-3 text-sm font-semibold">
                      {bank.rate.toFixed(2)}%
                    </td>

                    <td className="px-4 py-3 text-sm font-semibold">
                      {formatINR(bank.emi)}
                    </td>

                    <td className="px-4 py-3 text-sm">
                      {formatINR(bank.eligibleLoan)}
                    </td>

                    <td className="px-4 py-3 text-sm">
                      {formatINR(bank.totalInterest)}
                    </td>

                    <td className="px-4 py-3 text-sm">
                      {formatINR(bank.processingFee)}
                    </td>

                    <td className="px-4 py-3 text-sm font-semibold">
                      {bank.approvalChance}%
                    </td>

                    <td className="px-4 py-3 text-xs text-slate-500">
                      {bank.lastUpdated}
                    </td>

                    <td className="px-4 py-3 text-sm font-semibold">
                      {formatINR(bank.totalPayment)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {sortedBankComparisons.length > 8 ? (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => setShowAllBanks((prev) => !prev)}
              className="rounded-full border border-blue-300 bg-white px-5 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
            >
              {showAllBanks ? "Show Less Banks" : `See More Banks (${sortedBankComparisons.length - 8}+ more)`}
            </button>
          </div>
        ) : null}

        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
          <button className="rounded-xl bg-blue-600 text-white px-4 py-3 text-sm font-semibold hover:bg-blue-700">
            View Affordable Properties
          </button>

          <button className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold hover:bg-slate-50">
            Request Bank Assistance
          </button>

          <button className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold hover:bg-slate-50">
            Request Construction Loan Help
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm font-semibold text-amber-900">
            For Banks & Financial Institutions
          </div>

          <div className="text-xs text-amber-800 mt-1 leading-relaxed">
            Banker login will allow banks, NBFCs, LIC Housing Finance,
            cooperative banks and gramin banks to update latest ROI, eligibility rules,
            processing fees, offers and loan terms directly from their dashboard.
            This EMI page is now ready for database-controlled lender offers in the next phase.
          </div>
        </div>
      </section>

      <section className="scheduleSection">
        <div className="sectionHeading">
          <h2>Amortization Schedule</h2>
          <span>First 12 months repayment breakdown</span>
        </div>

        <div className="scheduleTableWrap">
          <table className="scheduleTable">
            <thead>
              <tr>
                <th>Month</th>
                <th>EMI</th>
                <th>Principal</th>
                <th>Interest</th>
                <th>Balance</th>
              </tr>
            </thead>

            <tbody>
              {amortization.map((row) => (
                <tr key={row.month}>
                  <td>{row.month}</td>
                  <td>{formatINR(row.emi)}</td>
                  <td>{formatINR(row.principal)}</td>
                  <td>{formatINR(row.interest)}</td>
                  <td>{formatINR(row.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="emiInfo">
        <h2>How EMI is calculated</h2>
        <p>
          EMI depends on loan amount, annual interest rate and repayment tenure.
          Lower interest or longer tenure reduces monthly EMI, but longer tenure
          usually increases total interest.
        </p>

        <div className="infoGrid">
          <div>
            <strong>Home Loan</strong>
            <span>Estimate monthly payment before buying property.</span>
          </div>
          <div>
            <strong>Construction Loan</strong>
            <span>Plan house construction finance and cash flow.</span>
          </div>
          <div>
            <strong>Business Loan</strong>
            <span>Check repayment capacity before borrowing.</span>
          </div>
        </div>
      </section>

      <style jsx>{`
        .emiPage {
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
          min-height: 100vh;
          padding: 24px 16px 64px;
          background:
            radial-gradient(circle at 12% 10%, rgba(37,99,235,0.10), transparent 30%),
            linear-gradient(180deg, #f8fbff, #ffffff);
        }

        .emiHero,
        .emiCard,
        .bankCompareSection,
        .scheduleSection,
        .emiInfo {
          width: 100%;
          max-width: 1160px;
          margin: 22px auto 0;
          border-radius: 24px;
          background: #ffffff;
          border: 1px solid rgba(15,23,42,0.08);
          box-shadow: 0 14px 34px rgba(15,23,42,0.06);
          padding: 22px;
          overflow: hidden;
        }

        .emiHero {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 280px;
          gap: 10px;
          align-items: end;
        }

        .emiHeroText {
          min-width: 0;
        }

        .emiHeroText span {
          display: inline-flex;
          border-radius: 999px;
          background: #eef4ff;
          color: #2563eb;
          padding: 8px 14px;
          font-size: 13px;
          font-weight: 900;
        }

        .emiHero h1 {
          margin: 16px 0 0;
          font-size: clamp(36px, 5vw, 62px);
          line-height: 1;
          letter-spacing: -0.06em;
          color: #0f172a;
          font-weight: 1000;
        }

        .emiHero p {
          max-width: 720px;
          margin: 14px 0 0;
          color: #475569;
          font-size: 16px;
          line-height: 1.65;
          font-weight: 700;
        }

        .heroMiniCard {
          width: 100%;
          border-radius: 22px;
          background: linear-gradient(135deg, #0f172a, #2563eb);
          color: #ffffff;
          padding: 14px;
          box-shadow: 0 18px 44px rgba(37,99,235,0.18);
        }

        .heroMiniCard strong {
          display: block;
          font-size: 32px;
          line-height: 1;
          font-weight: 1000;
        }

        .heroMiniCard span {
          display: block;
          margin-top: 8px;
          color: rgba(255,255,255,0.78);
          font-size: 13px;
          font-weight: 800;
        }

        .emiCard {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 0.95fr);
          gap: 22px;
          background: rgba(255,255,255,0.94);
          border-radius: 28px;
          backdrop-filter: blur(18px);
        }

        .emiForm,
        .emiResult {
          min-width: 0;
        }

        .emiForm {
          display: grid;
          gap: 10px;
        }

        .fieldTop {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 4px;
        }

        .fieldTop label {
          color: #0f172a;
          font-size: 14px;
          font-weight: 950;
        }

        .fieldTop strong {
          color: #2563eb;
          font-size: 14px;
          font-weight: 1000;
          text-align: right;
        }

        input[type="number"] {
          width: 100%;
          min-height: 44px;
          border: 1px solid rgba(15,23,42,0.12);
          border-radius: 14px;
          padding: 10px 12px;
          font-size: 14px;
          font-weight: 850;
          outline: none;
          color: #0f172a;
          background: #ffffff;
        }

        input[type="number"]:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 4px rgba(37,99,235,0.10);
        }

        input[type="range"] {
          width: 100%;
          accent-color: #2563eb;
        }

        .tenureSwitch {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .tenureSwitch button {
          border: 1px solid rgba(15,23,42,0.1);
          border-radius: 14px;
          background: #ffffff;
          padding: 12px;
          font-weight: 1000;
          cursor: pointer;
        }

        .tenureSwitch button.active {
          background: #2563eb;
          color: #ffffff;
          border-color: #2563eb;
        }

        .womanBorrowerBox {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          border-radius: 16px;
          border: 1px solid rgba(236,72,153,0.22);
          background: #fdf2f8;
          padding: 12px;
          cursor: pointer;
        }

        .womanBorrowerBox input {
          margin-top: 4px;
        }

        .womanBorrowerBox strong {
          display: block;
          color: #831843;
          font-size: 14px;
          font-weight: 1000;
        }

        .womanBorrowerBox small {
          display: block;
          margin-top: 4px;
          color: #9d174d;
          font-size: 12px;
          line-height: 1.45;
          font-weight: 800;
        }

        .constructionStageBox {
          margin-top: 14px;
          border-radius: 16px;
          background: #eff6ff;
          border: 1px solid rgba(37,99,235,0.18);
          padding: 14px;
        }

        .constructionStageBox strong {
          display: block;
          color: #1e3a8a;
          margin-bottom: 8px;
          font-size: 14px;
        }

        .constructionStageBox ul {
          margin: 0;
          padding-left: 18px;
          color: #1e40af;
          font-size: 13px;
          line-height: 1.7;
        }

        .eligibilityDivider {
          margin-top: 8px;
          padding: 12px;
          border-radius: 16px;
          background: #eff6ff;
          border: 1px solid rgba(37,99,235,0.12);
        }

        .eligibilityDivider strong {
          display: block;
          color: #1d4ed8;
          font-size: 15px;
          font-weight: 1000;
        }

        .eligibilityDivider span {
          display: block;
          margin-top: 6px;
          color: #64748b;
          font-size: 12px;
          font-weight: 800;
        }

        .emiResult {
          display: grid;
          gap: 14px;
          border-radius: 24px;
          background: linear-gradient(135deg, #0f172a, #1d4ed8);
          padding: 22px;
          color: #ffffff;
          overflow: hidden;
        }

        .mainResult,
        .resultGrid div,
        .summaryBox,
        .eligibilityBox,
        .aiBudgetBox,
        .aiHealthBox,
        .aiRentBox,
        .aiDownPaymentBox,
        .aiBuyingCostBox,
        .aiDiscoveryBridge {
          border-radius: 18px;
          background: rgba(255,255,255,0.10);
          padding: 12px;
          min-width: 0;
        }

        .mainResult span,
        .resultGrid span,
        .eligibilityGrid span,
        .aiBudgetHeader span {
          display: block;
          color: rgba(255,255,255,0.74);
          font-size: 13px;
          font-weight: 800;
        }

        .mainResult strong {
          display: block;
          margin-top: 8px;
          font-size: clamp(32px, 5vw, 52px);
          line-height: 1;
          font-weight: 1000;
          overflow-wrap: anywhere;
        }

        .mainResult small {
          display: block;
          margin-top: 10px;
          color: rgba(255,255,255,0.70);
          font-size: 12px;
          font-weight: 800;
        }

        .resultGrid,
        .eligibilityGrid,
        .emiActions,
        .emiUtilityActions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .resultGrid strong,
        .eligibilityGrid strong {
          display: block;
          margin-top: 7px;
          font-size: 18px;
          font-weight: 1000;
          overflow-wrap: anywhere;
        }

        .chartBox {
          width: 100%;
          height: 240px;
          border-radius: 18px;
          background: rgba(255,255,255,0.08);
          padding: 10px;
        }

        .paymentBar {
          height: 14px;
          border-radius: 999px;
          overflow: hidden;
          display: flex;
          background: rgba(255,255,255,0.14);
          margin-top: 10px;
        }

        .principalBar { background: #22c55e; }
        .interestBar { background: #f97316; }

        .legend {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          color: rgba(255,255,255,0.78);
          font-size: 12px;
          font-weight: 900;
        }

        .legend span {
          display: inline-flex;
          align-items: center;
          gap: 7px;
        }

        .legend b {
          width: 10px;
          height: 10px;
          border-radius: 99px;
          display: inline-block;
        }

        .principalDot { background: #22c55e; }
        .interestDot { background: #f97316; }

        .eligibilityTips p,
        .summaryBox p,
        .aiDiscoveryBridge span,
        .aiBudgetBox p,
        .aiHealthBox p,
        .aiRentBox p,
        .aiDownPaymentBox p,
        .aiBuyingCostBox p {
          margin: 8px 0 0;
          color: rgba(255,255,255,0.76);
          font-size: 13px;
          line-height: 1.6;
          font-weight: 700;
        }

        .aiBudgetHeader strong,
        .summaryBox strong,
        .aiDiscoveryBridge strong {
          display: block;
          color: #ffffff;
          font-size: 16px;
          line-height: 1.25;
          font-weight: 1000;
          overflow-wrap: anywhere;
        }

        .aiBudgetHeader small {
          display: inline-flex;
          margin-top: 8px;
          border-radius: 999px;
          background: rgba(255,255,255,0.14);
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 1000;
        }

        .aiBudgetBox details,
        .aiHealthBox details,
        .aiRentBox details,
        .aiDownPaymentBox details,
        .aiBuyingCostBox details {
          margin-top: 8px;
          border-radius: 12px;
          background: rgba(255,255,255,0.08);
          padding: 8px 10px;
        }

        .aiBudgetBox summary,
        .aiHealthBox summary,
        .aiRentBox summary,
        .aiDownPaymentBox summary,
        .aiBuyingCostBox summary {
          cursor: pointer;
          font-size: 13px;
          font-weight: 1000;
        }

        .aiHealthBox {
          background: linear-gradient(135deg, rgba(34,197,94,0.16), rgba(59,130,246,0.14));
        }

        .aiRentBox {
          background: linear-gradient(135deg, rgba(14,165,233,0.16), rgba(168,85,247,0.14));
        }

        .aiDownPaymentBox {
          background: linear-gradient(135deg, rgba(234,179,8,0.18), rgba(249,115,22,0.16));
        }

        .aiBuyingCostBox {
          background: linear-gradient(135deg, rgba(236,72,153,0.16), rgba(99,102,241,0.16));
        }

        .emiActions a,
        .emiUtilityActions button {
          border-radius: 15px;
          background: #ffffff;
          color: #1d4ed8;
          padding: 14px;
          text-align: center;
          text-decoration: none;
          font-size: 14px;
          font-weight: 1000;
          border: 0;
          cursor: pointer;
        }

        .emiUtilityActions button {
          background: rgba(255,255,255,0.12);
          color: #ffffff;
          border: 1px solid rgba(255,255,255,0.18);
        }

        .sectionHeading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .sectionHeading h2 {
          margin: 0;
          color: #0f172a;
          font-size: 26px;
          font-weight: 1000;
          letter-spacing: -0.04em;
        }

        .sectionHeading span {
          color: #64748b;
          font-size: 13px;
          font-weight: 800;
        }

        .stateSelect {
          max-width: 100%;
          border: 1px solid rgba(15,23,42,0.12);
          border-radius: 14px;
          background: #ffffff;
          color: #0f172a;
          padding: 12px 14px;
          font-size: 13px;
          font-weight: 900;
          outline: none;
        }

        .bankTabs {
          margin-top: 16px;
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 4px;
        }

        .bankTabs button {
          flex: 0 0 auto;
          border: 1px solid rgba(37,99,235,0.14);
          border-radius: 999px;
          background: #ffffff;
          color: #1e293b;
          padding: 9px 13px;
          font-size: 12px;
          font-weight: 1000;
          cursor: pointer;
        }

        .bankTabs button.active {
          background: #2563eb;
          color: #ffffff;
          border-color: #2563eb;
        }

        .bestBankCard {
          margin-top: 16px;
          border-radius: 18px;
          background: linear-gradient(135deg, #ecfdf5, #ffffff);
          border: 1px solid #bbf7d0;
          padding: 12px;
        }

        .bestBankCard strong {
          display: block;
          color: #047857;
          font-size: 15px;
          font-weight: 1000;
        }

        .bestBankCard span {
          display: block;
          margin-top: 6px;
          color: #334155;
          font-size: 14px;
          font-weight: 800;
        }

        .bankTableWrap,
        .scheduleTableWrap {
          margin-top: 18px;
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .bankTable,
        .scheduleTable {
          width: 100%;
          border-collapse: collapse;
        }

        .bankTable {
          min-width: 860px;
        }

        .scheduleTable {
          min-width: 720px;
        }

        .bankTable th,
        .scheduleTable th {
          background: #eff6ff;
          color: #1d4ed8;
          font-size: 13px;
          font-weight: 1000;
          text-align: left;
          padding: 14px;
        }

        .bankTable td,
        .scheduleTable td {
          padding: 13px 14px;
          border-top: 1px solid rgba(15,23,42,0.06);
          color: #334155;
          font-size: 13px;
          font-weight: 800;
          vertical-align: middle;
        }

        .bankTable td strong {
          display: block;
          color: #0f172a;
          font-size: 13px;
          font-weight: 1000;
        }

        .bankTable td span {
          display: block;
          margin-top: 4px;
          color: #64748b;
          font-size: 12px;
          font-weight: 800;
        }

        .bankRateInput {
          width: 82px;
          border: 1px solid rgba(15,23,42,0.12);
          border-radius: 10px;
          padding: 8px;
          font-size: 13px;
          font-weight: 900;
          color: #0f172a;
        }

        .seeMoreBanksButton {
          margin-top: 14px;
          width: 100%;
          border: 1px solid rgba(37,99,235,0.18);
          border-radius: 14px;
          background: linear-gradient(135deg, #eff6ff, #ffffff);
          color: #1d4ed8;
          padding: 13px 16px;
          font-size: 13px;
          font-weight: 1000;
          cursor: pointer;
        }

        .bankDisclaimer {
          margin: 14px 0 0;
          color: #64748b;
          font-size: 13px;
          font-weight: 750;
          line-height: 1.6;
        }

        .emiInfo h2 {
          margin: 0;
          color: #0f172a;
          font-size: 26px;
          font-weight: 1000;
          letter-spacing: -0.035em;
        }

        .emiInfo p {
          margin-top: 10px;
          color: #475569;
          font-size: 15px;
          line-height: 1.7;
          font-weight: 700;
        }

        .infoGrid {
          margin-top: 16px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .infoGrid div {
          border-radius: 16px;
          background: #f8fafc;
          padding: 15px;
        }

        .infoGrid strong {
          display: block;
          color: #0f172a;
          font-size: 15px;
          font-weight: 1000;
        }

        .infoGrid span {
          display: block;
          margin-top: 6px;
          color: #64748b;
          font-size: 13px;
          line-height: 1.5;
          font-weight: 750;
        }

        @media (max-width: 860px) {
          .emiHero,
          .emiCard {
            grid-template-columns: 1fr;
          }

          .heroMiniCard {
            width: 100%;
          }

          .infoGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .emiPage {
            padding: 14px 10px 44px;
          }

          .emiHero,
          .emiCard,
          .bankCompareSection,
          .scheduleSection,
          .emiInfo {
            margin-top: 14px;
            border-radius: 20px;
            padding: 14px;
          }

          .emiHero {
            gap: 12px;
          }

          .emiHero h1 {
            font-size: 34px;
          }

          .emiHero p {
            font-size: 14px;
            line-height: 1.55;
          }

          .heroMiniCard {
            padding: 12px;
          }

          .heroMiniCard strong {
            font-size: 28px;
          }

          .emiResult {
            border-radius: 18px;
            padding: 14px;
          }

          .fieldTop {
            align-items: flex-start;
          }

          .fieldTop label,
          .fieldTop strong {
            font-size: 13px;
          }

          .resultGrid,
          .eligibilityGrid,
          .emiActions,
          .emiUtilityActions {
            grid-template-columns: 1fr;
          }

          .mainResult strong {
            font-size: 32px;
          }

          .chartBox {
            height: 210px;
          }

          .sectionHeading {
            display: grid;
            gap: 8px;
          }

          .sectionHeading h2 {
            font-size: 22px;
          }

          .bankCompareSection,
          .scheduleSection {
            overflow: hidden;
          }

          .bankTableWrap,
          .scheduleTableWrap {
            border-radius: 14px;
            border: 1px solid rgba(15,23,42,0.08);
          }
        }

        .financeLeadSection {
            margin-top: 28px;
          }

          .financeLeadCard {
            border-radius: 24px;
            padding: 22px;
            background: linear-gradient(
              135deg,
              #eff6ff,
              #ffffff
            );

            border: 1px solid rgba(37,99,235,0.15);
          }

          .financeLeadHeader {
            display: flex;
            justify-content: space-between;
            gap: 14px;
            flex-wrap: wrap;
          }

          .financeLeadHeader h3 {
            margin: 0;
            font-size: 22px;
            color: #0f172a;
          }

          .financeLeadHeader p {
            margin-top: 6px;
            color: #475569;
            line-height: 1.6;
            font-size: 14px;
          }

          .financeLeadBadge {
            border-radius: 999px;
            background: #dbeafe;
            color: #1d4ed8;
            padding: 10px 14px;
            font-size: 12px;
            font-weight: 900;
            height: fit-content;
          }

          .financeLeadGrid {
            margin-top: 18px;
            display: grid;
            grid-template-columns: repeat(
              auto-fit,
              minmax(220px, 1fr)
            );
            gap: 12px;
          }

          .financeLeadGrid input {
            width: 100%;
            border-radius: 14px;
            border: 1px solid rgba(148,163,184,0.35);
            padding: 12px 14px;
            font-size: 14px;
            outline: none;
          }

          .financeLeadSummary {
            margin-top: 18px;
            display: grid;
            grid-template-columns: repeat(
              auto-fit,
              minmax(160px, 1fr)
            );
            gap: 14px;
          }

          .financeLeadSummary div {
            border-radius: 16px;
            background: #ffffff;
            border: 1px solid rgba(148,163,184,0.18);
            padding: 14px;
          }

          .financeLeadSummary span {
            display: block;
            font-size: 12px;
            color: #64748b;
            margin-bottom: 6px;
          }

          .financeLeadSummary strong {
            color: #0f172a;
            font-size: 15px;
          }

          .financeLeadButton {
            margin-top: 20px;
            width: 100%;
            border: none;
            border-radius: 18px;
            background: #2563eb;
            color: white;
            font-weight: 900;
            padding: 15px;
            font-size: 15px;
            cursor: pointer;
          }

          .financeLeadButton:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .financeLeadSuccess {
            margin-top: 18px;
            border-radius: 18px;
            background: #ecfdf5;
            border: 1px solid rgba(16,185,129,0.2);
            color: #065f46;
            padding: 16px;
            line-height: 1.7;
            font-size: 14px;
            font-weight: 700;
          }
      `}</style>
    </main>
  );
}
