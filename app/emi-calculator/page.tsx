"use client";

import { useMemo, useState } from "react";
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
  const [age, setAge] = useState(30);
  const [employmentType, setEmploymentType] = useState<"salaried" | "business">("salaried");
  const [coApplicantIncome, setCoApplicantIncome] = useState(0);

  
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

  const months =
    tenureMode === "years"
      ? clamp(Number(tenure), 1, 50) * 12
      : clamp(Number(tenure), 1, 600);

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

  if (maxEligibleEmi >= 60000) {
    status = "Excellent";
  } else if (maxEligibleEmi >= 25000) {
    status = "Moderate";
  }

  const ageLimit =
    employmentType === "business" ? 70 : 60;

  const maxTenureByAge = Math.max(ageLimit - age, 5);

  return {
    totalIncome,
    maxEligibleEmi,
    eligibleLoan,
    estimatedPropertyValue,
    status,
    maxTenureByAge,
  };
}, [
  monthlyIncome,
  coApplicantIncome,
  existingEmi,
  interestRate,
  tenure,
  tenureMode,
  employmentType,
  age,
]);

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

  const amortization = [];

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
      "3Bigha EMI Calculator Report",
      "-----------------------------",
      `Loan Amount: ${formatINR(result.principal)}`,
      `Interest Rate: ${interestRate}% p.a.`,
      `Tenure: ${result.months} months`,
      `Monthly EMI: ${formatINR(result.emi)}`,
      `Total Interest: ${formatINR(result.totalInterest)}`,
      `Total Payment: ${formatINR(result.totalPayment)}`,
      `Extra Monthly Payment: ${formatINR(extraPayment)}`,
      `Estimated Interest Saved: ${formatINR(result.interestSaved)}`,
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
            <label>Interest Rate</label>
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
            step="0.1"
            value={interestRate}
            onChange={(e) => setInterestRate(Number(e.target.value))}
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
                Maximum recommended tenure by age:
                <b> {eligibility.maxTenureByAge} years</b>
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

          <div className="emiActions">
            <a href="/property">Search Property</a>
            <a href="/rfq/general/new">Submit Requirement</a>
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
          min-height: 100vh;
          padding: 28px 18px 70px;
          background:
            radial-gradient(circle at 12% 10%, rgba(37, 99, 235, 0.12), transparent 30%),
            radial-gradient(circle at 88% 12%, rgba(16, 185, 129, 0.10), transparent 28%),
            linear-gradient(180deg, #f8fbff, #ffffff);
        }

        .emiHero,
        .emiCard,
        
        .scheduleSection {
          max-width: 1160px;
          margin: 24px auto 0;
          border-radius: 24px;
          background: #ffffff;
          border: 1px solid rgba(15, 23, 42, 0.08);
          box-shadow: 0 14px 34px rgba(15, 23, 42, 0.06);
          padding: 22px;
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

        .scheduleTableWrap {
          overflow-x: auto;
          margin-top: 18px;
        }

        .scheduleTable {
          width: 100%;
          border-collapse: collapse;
          min-width: 760px;
        }

        .scheduleTable th {
          background: #eff6ff;
          color: #1d4ed8;
          font-size: 13px;
          font-weight: 1000;
          text-align: left;
          padding: 14px;
        }

        .scheduleTable td {
          padding: 14px;
          border-top: 1px solid rgba(15,23,42,0.06);
          color: #334155;
          font-size: 14px;
          font-weight: 700;
        }

        .scheduleTable tr:hover td {
          background: #f8fbff;
        }

        .emiUtilityActions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .emiUtilityActions button {
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 15px;
          background: rgba(255,255,255,0.10);
          color: #ffffff;
          padding: 13px;
          text-align: center;
          font-size: 13px;
          font-weight: 1000;
          cursor: pointer;
        }

        .emiUtilityActions button:hover {
          background: rgba(255,255,255,0.16);
        }

        .emiInfo {

          max-width: 1160px;
          margin: 0 auto;
        }

        .emiHero {
          padding: 34px 0 24px;
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 18px;
          align-items: end;
        }

        .emiHero span {
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
          font-size: clamp(38px, 5vw, 68px);
          line-height: 1;
          letter-spacing: -0.06em;
          color: #0f172a;
          font-weight: 1000;
        }

        .emiHero p {
          max-width: 740px;
          margin-top: 14px;
          color: #475569;
          font-size: 17px;
          line-height: 1.7;
          font-weight: 700;
        }

        .heroMiniCard {
          min-width: 260px;
          border-radius: 24px;
          background: linear-gradient(135deg, #0f172a, #2563eb);
          color: white;
          padding: 22px;
          box-shadow: 0 18px 44px rgba(37, 99, 235, 0.18);
        }

        .heroMiniCard strong {
          display: block;
          font-size: 32px;
          font-weight: 1000;
        }

        .heroMiniCard span {
          margin-top: 8px;
          background: transparent;
          color: rgba(255,255,255,0.75);
          padding: 0;
        }

        .emiCard {
          display: grid;
          grid-template-columns: 1fr 0.95fr;
          gap: 22px;
          background: rgba(255, 255, 255, 0.94);
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 30px;
          padding: 24px;
          box-shadow: 0 24px 70px rgba(15, 23, 42, 0.09);
          backdrop-filter: blur(18px);
        }

        .emiForm {
          display: grid;
          gap: 12px;
        }

        .fieldTop {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 6px;
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
        }

        input[type="number"] {
          width: 100%;
          border: 1px solid rgba(15, 23, 42, 0.12);
          border-radius: 15px;
          padding: 14px 15px;
          font-size: 15px;
          font-weight: 850;
          outline: none;
          color: #0f172a;
          background: #ffffff;
        }

        input[type="number"]:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
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
          border: 1px solid rgba(15, 23, 42, 0.1);
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

        .emiResult {
          display: grid;
          gap: 14px;
          border-radius: 24px;
          background: linear-gradient(135deg, #0f172a, #1d4ed8);
          padding: 22px;
          color: white;
        }

        .mainResult,
        .resultGrid div,
        .summaryBox {
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.1);
          padding: 16px;
        }

        .mainResult span,
        .resultGrid span {
          display: block;
          color: rgba(255, 255, 255, 0.74);
          font-size: 13px;
          font-weight: 800;
        }

        .mainResult strong {
          display: block;
          margin-top: 8px;
          font-size: clamp(34px, 5vw, 52px);
          line-height: 1;
          font-weight: 1000;
        }

        .mainResult small {
          display: block;
          margin-top: 10px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 12px;
          font-weight: 800;
        }

        .resultGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .resultGrid strong {
          display: block;
          margin-top: 7px;
          font-size: 18px;
          font-weight: 1000;
        }

        
        .chartSection {
          display: grid;
          gap: 10px;
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
        }

        .principalBar {
          background: #22c55e;
        }

        .interestBar {
          background: #f97316;
        }

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

        .principalDot {
          background: #22c55e;
        }

        .interestDot {
          background: #f97316;
        }

        .eligibilityDivider {
          margin-top: 10px;
          padding: 14px;
          border-radius: 16px;
          background: #eef4ff;
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

        .eligibilityBox {
          border-radius: 18px;
          background: rgba(255,255,255,0.10);
          padding: 16px;
        }

        .eligibilityBox > strong {
          display: block;
          font-size: 15px;
          font-weight: 1000;
        }

        .eligibilityGrid {
          margin-top: 14px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .eligibilityGrid div {
          border-radius: 14px;
          background: rgba(255,255,255,0.08);
          padding: 14px;
        }

        .eligibilityGrid span {
          display: block;
          color: rgba(255,255,255,0.7);
          font-size: 12px;
          font-weight: 800;
        }

        .eligibilityGrid strong {
          display: block;
          margin-top: 6px;
          font-size: 18px;
          font-weight: 1000;
        }

        .eligibilityTips {
          margin-top: 14px;
        }

        .eligibilityTips p {
          margin: 8px 0 0;
          color: rgba(255,255,255,0.75);
          font-size: 13px;
          line-height: 1.6;
          font-weight: 700;
        }

        .summaryBox strong {
          display: block;
          font-size: 15px;
          font-weight: 1000;
        }

        .summaryBox p {
          margin: 8px 0 0;
          color: rgba(255,255,255,0.76);
          font-size: 13px;
          line-height: 1.6;
          font-weight: 700;
        }

        .emiActions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .emiActions a {
          border-radius: 15px;
          background: white;
          color: #1d4ed8;
          padding: 14px;
          text-align: center;
          text-decoration: none;
          font-size: 14px;
          font-weight: 1000;
        }

        
        .scheduleSection {
          max-width: 1160px;
          margin: 24px auto 0;
          border-radius: 24px;
          background: #ffffff;
          border: 1px solid rgba(15, 23, 42, 0.08);
          box-shadow: 0 14px 34px rgba(15, 23, 42, 0.06);
          padding: 22px;
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

        .scheduleTableWrap {
          overflow-x: auto;
          margin-top: 18px;
        }

        .scheduleTable {
          width: 100%;
          border-collapse: collapse;
          min-width: 760px;
        }

        .scheduleTable th {
          background: #eff6ff;
          color: #1d4ed8;
          font-size: 13px;
          font-weight: 1000;
          text-align: left;
          padding: 14px;
        }

        .scheduleTable td {
          padding: 14px;
          border-top: 1px solid rgba(15,23,42,0.06);
          color: #334155;
          font-size: 14px;
          font-weight: 700;
        }

        .scheduleTable tr:hover td {
          background: #f8fbff;
        }

        .emiInfo {

          margin-top: 24px;
          background: #ffffff;
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 24px;
          padding: 22px;
          box-shadow: 0 14px 34px rgba(15, 23, 42, 0.06);
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
            min-width: 0;
          }

          .infoGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .emiPage {
            padding: 18px 10px 50px;
          }

          .emiHero {
            padding: 24px 0 16px;
          }

          .emiHero h1 {
            font-size: 38px;
          }

          .emiHero p {
            font-size: 14px;
          }

          .emiCard {
            border-radius: 20px;
            padding: 14px;
          }

          .emiResult {
            border-radius: 18px;
            padding: 14px;
          }

          .resultGrid,
          .emiActions,
          .emiUtilityActions {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
