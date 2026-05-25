import Link from "next/link";
import JsonLd from "@/components/seo/JsonLd";
import { createMetadata } from "@/lib/seo/metadata";
import { absoluteUrl } from "@/lib/seo/site";

export const dynamic = "force-static";

export const metadata = createMetadata({
  title:
    "Banking & Finance Assistance in India | Home Loan, EMI & Construction Finance",
  description:
    "Get banking and finance assistance on 3Bigha for home loans, construction loans, property loans, EMI planning, CIBIL-aware eligibility, verified banker support and lender comparison across India.",
  path: "/banking-finance-assistance",
  keywords: [
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
  ],
});

const financeSchema = {
  "@context": "https://schema.org",
  "@type": "FinancialService",
  name: "3Bigha Banking & Finance Assistance",
  url: absoluteUrl("/banking-finance-assistance"),
  areaServed: {
    "@type": "Country",
    name: "India",
  },
  serviceType: [
    "Home Loan Assistance",
    "Construction Loan Assistance",
    "Property Loan Assistance",
    "EMI Calculation",
    "Loan Eligibility Guidance",
    "Verified Banker Assistance",
  ],
  provider: {
    "@type": "Organization",
    name: "3Bigha",
    url: absoluteUrl("/"),
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Does 3Bigha provide banking finance assistance?",
      acceptedAnswer: {
        "@type": "Answer",
        text:
          "Yes. 3Bigha provides finance assistance for home loans, property loans, construction loans, EMI planning, eligibility guidance and verified banker support.",
      },
    },
    {
      "@type": "Question",
      name: "Can I compare loan eligibility and EMI on 3Bigha?",
      acceptedAnswer: {
        "@type": "Answer",
        text:
          "Yes. 3Bigha offers EMI calculation, CIBIL-aware eligibility guidance, FOIR-based loan assessment and lender comparison support.",
      },
    },
    {
      "@type": "Question",
      name: "Is banker verification available on 3Bigha?",
      acceptedAnswer: {
        "@type": "Answer",
        text:
          "3Bigha supports banker onboarding and manual verification so finance leads can be handled through verified banker workflows.",
      },
    },
  ],
};

export default function BankingFinanceAssistancePage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <JsonLd data={financeSchema} />
      <JsonLd data={faqSchema} />

      <section className="mx-auto max-w-6xl">
        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-blue-600">
            Banking Finance Assistance
          </p>

          <h1 className="mt-3 text-3xl font-black leading-tight text-slate-900 md:text-5xl">
            Banking & Finance Assistance for Property, Home Loan and Construction
          </h1>

          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
            3Bigha helps property buyers, builders and families plan loans with
            EMI calculation, CIBIL-aware eligibility, FOIR logic, verified banker
            support and lender comparison workflows across India.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/emi-calculator"
              className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white"
            >
              Calculate EMI
            </Link>

            <Link
              href="/banker/apply"
              className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-black text-blue-700"
            >
              Apply as Banker
            </Link>

            <Link
              href="/property"
              className="rounded-2xl border bg-white px-5 py-3 text-sm font-black text-slate-700"
            >
              Explore Property
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Home Loan Assistance",
              text:
                "Plan home loan EMI, eligibility, CIBIL requirement and repayment capacity before buying property.",
            },
            {
              title: "Construction Loan Support",
              text:
                "Estimate construction finance requirements for house building, materials, BOQ and staged funding.",
            },
            {
              title: "Verified Banker Workflow",
              text:
                "Connect finance leads with verified banker workflows, lender offers and admin-approved finance operations.",
            },
          ].map((item) => (
            <article
              key={item.title}
              className="rounded-3xl border bg-white p-5 shadow-sm"
            >
              <h2 className="text-xl font-black text-slate-900">
                {item.title}
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                {item.text}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-6 rounded-3xl border bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-slate-900">
            Finance services highlighted on 3Bigha
          </h2>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {[
              "Banking finance assistance",
              "Home loan assistance",
              "Construction loan assistance",
              "Property loan assistance",
              "EMI calculator India",
              "Loan eligibility guidance",
              "CIBIL-aware loan planning",
              "Verified banker assistance",
              "Lender offer comparison",
              "Finance lead support",
            ].map((text) => (
              <div
                key={text}
                className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700"
              >
                {text}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}