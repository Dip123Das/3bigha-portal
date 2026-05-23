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
  const [coApplicantIncome, setCoApplicantIncome] = useState(0);
  const [selectedBankState, setSelectedBankState] = useState("West Bengal");
  const [customBankRates, setCustomBankRates] = useState<Record<string, number>>({});
  const [showAllBanks, setShowAllBanks] = useState(false);
  const [bankCategory, setBankCategory] = useState<
    "best" | "public" | "private" | "hfc" | "rrb" | "small_finance"
  >("best");

  
const chartColors = ["#22c55e", "#f97316"];

const eligibility = useMemo(() => {
  const totalIncome =
    Number(monthlyIncome || 0) + Number(coApplicantIncome || 0);

  const allowedEmiRatio =
    employmentType === "business" ? 0.45 : 0.5;

  const maxEligibleEmi = Math.max(
    totalIncome * allowedEmiRatio - Number(existingEmi || 0),
    0
  );

  const monthlyRate = interestRate / 12 / 100;

const bankMaxTenureMonths = 360;

  const ageLimit =
    employmentType === "business" ? 70 : 60;

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

  const estimatedPropertyValue = eligibleLoan / 0.8;

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
    eligibleLoan,
    estimatedPropertyValue,
    status,
    maxTenureByAge,
    effectiveYears,
    effectiveMonths,
  };
}, [
  monthlyIncome,
  coApplicantIncome,
  existingEmi,
  interestRate,
  employmentType,
  age,
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

const bankComparisons = useMemo(() => {
  return bankOffers.map((bank) => {
    const rate = customBankRates[bank.bank] ?? bank.indicativeRate;
    const emi = calculateEmi(eligibility.eligibleLoan, rate, eligibility.effectiveMonths);
    const totalPayment = emi * eligibility.effectiveMonths;

    return {
      ...bank,
      rate,
      emi,
      eligibleLoan: eligibility.eligibleLoan,
      totalPayment,
    };
  });
}, [
  bankOffers,
  customBankRates,
  eligibility.eligibleLoan,
  eligibility.effectiveMonths,
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

          <div className="fieldTop">
            <label>Co-Applicant Income Optional</label>
            <strong>{formatINR(coApplicantIncome)}</strong>
          </div>

          <input
            type="number"
            value={coApplicantIncome}
            onChange={(e) => setCoApplicantIncome(Number(e.target.value))}
            placeholder="Optional co-applicant income"
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
              </div>

              <div>
                <span>Eligibility Status</span>
                <strong>{eligibility.status}</strong>
              </div>
            </div>

            <div className="eligibilityTips">
              <p>
                Maximum tenure allowed by age:
                <b> {eligibility.maxTenureByAge} years</b>
              </p>

              <p>
                Effective tenure used in eligibility:
                <b> {eligibility.effectiveMonths} EMIs ({eligibility.effectiveYears.toFixed(1)} years)</b>
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

            <section className="bankCompareSection">
        <div className="sectionHeading">
          <div>
            <h2>Compare Bank Offers</h2>
            <span>
              Indicative bank-wise EMI, eligibility and total payment comparison
            </span>
          </div>

          <select
            className="stateSelect"
            value={selectedBankState}
            onChange={(e) => setSelectedBankState(e.target.value)}
          >
            {indianStatesWithRegionalBanks.map((state) => (
              <option key={state} value={state}>
                {state} Regional Banks
              </option>
            ))}
          </select>
        </div>

        <div className="bankTabs">
          {[
            ["best", "Best Offers"],
            ["public", "Public"],
            ["private", "Private"],
            ["hfc", "Housing Finance"],
            ["rrb", "Regional/RRB"],
            ["small_finance", "Small Finance"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={bankCategory === value ? "active" : ""}
              onClick={() => {
                setBankCategory(value as typeof bankCategory);
                setShowAllBanks(false);
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="bestBankCard">
          <strong>Best Indicative EMI</strong>
          <span>
            {bestBank?.bank || "—"} at {bestBank?.rate || "—"}% p.a. —
            EMI {formatINR(bestBank?.emi || 0)}
          </span>
        </div>

        <div className="bankTableWrap">
          <table className="bankTable">
            <thead>
              <tr>
                <th>Bank</th>
                <th>Type</th>
                <th>Interest Rate</th>
                <th>EMI</th>
                <th>Eligible Loan</th>
                <th>Total Payment</th>
              </tr>
            </thead>

            <tbody>
              {visibleBankComparisons.map((bank) => (
                <tr key={bank.bank}>
                  <td>
                    <strong>{bank.bank}</strong>
                    <span>{bank.shortName}</span>
                  </td>
                  <td>{bank.type.toUpperCase()}</td>
                  <td>
                    <input
                      className="bankRateInput"
                      type="number"
                      step="0.01"
                      value={bank.rate}
                      onChange={(e) =>
                        setCustomBankRates((prev) => ({
                          ...prev,
                          [bank.bank]: Number(e.target.value),
                        }))
                      }
                    />
                    <b>%</b>
                  </td>
                  <td>{formatINR(bank.emi)}</td>
                  <td>{formatINR(bank.eligibleLoan)}</td>
                  <td>{formatINR(bank.totalPayment)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredBankComparisons.length > 3 ? (
          <button
            type="button"
            className="seeMoreBanksButton"
            onClick={() => setShowAllBanks((prev) => !prev)}
          >
            {showAllBanks
              ? "Show Top 3 Banks Only"
              : `See More (${filteredBankComparisons.length - 3}+ more)`}
          </button>
        ) : null}

        <p className="bankDisclaimer">
          Rates are indicative and user-editable. Actual bank/NBFC loan rate and eligibility
          depend on CIBIL score, income documents, property papers, LTV ratio, employer profile,
          age, tenure and lender policy.
        </p>
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
      `}</style>
    </main>
  );
}
