// app/rfq/start/page.tsx
"use client";

import Link from "next/link";
import { Suspense } from "react";
import { SectionSkeleton } from "@/components/ui/Skeleton";

const rfqJourneys = [
  {
    icon: "🏠",
    title: "I want to build a house",
    text: "Estimate, materials, contractor, equipment and service requirements.",
    href: "/rfq/general/new?intent=build",
    primary: true,
  },
  {
    icon: "🧱",
    title: "I need construction materials",
    text: "Cement, steel, sand, bricks, tiles, fittings and other materials.",
    href: "/rfq/new?intent=materials",
  },
  {
    icon: "👷",
    title: "I need workers or contractors",
    text: "Mason, electrician, plumber, painter, labour, engineer or contractor.",
    href: "/rfq/general/new?intent=hire",
  },
  {
    icon: "🚜",
    title: "I need machines or equipment",
    text: "JCB, excavator, tractor, mixer, scaffolding and rental equipment.",
    href: "/rfq/general/new?intent=rent",
  },
  {
    icon: "🛠️",
    title: "I need a construction service",
    text: "Design, survey, repair, borewell, roofing, interiors or turnkey work.",
    href: "/rfq/general/new?intent=service",
  },
  {
    icon: "💬",
    title: "My requirement is different",
    text: "Write what you need. 3Bigha will prepare the right request.",
    href: "/rfq/general/new?intent=custom",
  },
];

function UnifiedRfqStartPageInner() {
  return (
    <main className="sahajRfqStart">
      <section className="sahajRfqHero">
        <div className="sahajRfqBadge">Human First. AI Second. Precision Always.</div>
        <h1>What do you need today?</h1>
        <p>
          Choose your real need. 3Bigha will prepare the right request, location,
          vendor matching and professional RFQ in the background.
        </p>
      </section>

      <section className="sahajRfqGrid" aria-label="Choose requirement type">
        {rfqJourneys.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className={`sahajRfqCard ${item.primary ? "isPrimary" : ""}`}
          >
            <span className="sahajRfqIcon">{item.icon}</span>
            <strong>{item.title}</strong>
            <p>{item.text}</p>
            <b>Start →</b>
          </Link>
        ))}
      </section>

      <section className="sahajRfqNote">
        <div>
          <strong>You do not need to know RFQ or procurement terms.</strong>
          <p>
            Tell us what you need. AI will assist silently. LGD geography and vendor
            intelligence will work behind the scenes.
          </p>
        </div>
        <Link href="/rfq">Open existing RFQ page</Link>
      </section>

      <style jsx>{`
        .sahajRfqStart {
          min-height: 100vh;
          padding: 28px 14px 40px;
          background:
            radial-gradient(circle at 12% 8%, #dbeafe 0, transparent 32%),
            radial-gradient(circle at 90% 10%, #dcfce7 0, transparent 28%),
            linear-gradient(180deg, #f8fbff, #ffffff);
          color: #0f172a;
        }

        .sahajRfqHero {
          width: 100%;
          max-width: 1120px;
          margin: 0 auto 22px;
          padding: 28px 0 8px;
        }

        .sahajRfqBadge {
          display: inline-flex;
          border-radius: 999px;
          background: #eef4ff;
          color: #1d4ed8;
          padding: 9px 14px;
          font-size: 13px;
          font-weight: 950;
        }

        .sahajRfqHero h1 {
          margin: 18px 0 0;
          font-size: clamp(34px, 5vw, 64px);
          line-height: 1.02;
          letter-spacing: -0.055em;
          font-weight: 1000;
        }

        .sahajRfqHero p {
          max-width: 760px;
          margin: 16px 0 0;
          color: #475569;
          font-size: 18px;
          line-height: 1.65;
          font-weight: 650;
        }

        .sahajRfqGrid {
          width: 100%;
          max-width: 1120px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .sahajRfqCard {
          min-height: 210px;
          display: grid;
          align-content: start;
          gap: 10px;
          padding: 18px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.96);
          color: #0f172a;
          text-decoration: none;
          box-shadow: 0 12px 34px rgba(15, 23, 42, 0.06);
          transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
        }

        .sahajRfqCard:hover {
          transform: translateY(-2px);
          border-color: rgba(37, 99, 235, 0.3);
          box-shadow: 0 18px 44px rgba(37, 99, 235, 0.12);
        }

        .sahajRfqCard.isPrimary {
          background: linear-gradient(135deg, #1d4ed8, #2563eb);
          color: #fff;
        }

        .sahajRfqIcon {
          display: grid;
          place-items: center;
          width: 46px;
          height: 46px;
          border-radius: 16px;
          background: #eff6ff;
          font-size: 24px;
        }

        .sahajRfqCard.isPrimary .sahajRfqIcon {
          background: rgba(255, 255, 255, 0.18);
        }

        .sahajRfqCard strong {
          font-size: 20px;
          line-height: 1.15;
          font-weight: 1000;
          letter-spacing: -0.025em;
        }

        .sahajRfqCard p {
          margin: 0;
          color: #64748b;
          font-size: 14px;
          line-height: 1.5;
          font-weight: 700;
        }

        .sahajRfqCard.isPrimary p {
          color: rgba(255, 255, 255, 0.84);
        }

        .sahajRfqCard b {
          margin-top: auto;
          color: #1d4ed8;
          font-size: 14px;
          font-weight: 1000;
        }

        .sahajRfqCard.isPrimary b {
          color: #fff;
        }

        .sahajRfqNote {
          width: 100%;
          max-width: 1120px;
          margin: 18px auto 0;
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: center;
          padding: 16px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 20px;
          background: #fff;
        }

        .sahajRfqNote p {
          margin: 5px 0 0;
          color: #64748b;
          line-height: 1.5;
          font-weight: 700;
        }

        .sahajRfqNote a {
          flex: 0 0 auto;
          color: #1d4ed8;
          font-weight: 950;
          text-decoration: none;
        }

        @media (max-width: 900px) {
          .sahajRfqGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 600px) {
          .sahajRfqStart {
            padding: 18px 12px 30px;
          }

          .sahajRfqGrid {
            grid-template-columns: 1fr;
          }

          .sahajRfqCard {
            min-height: auto;
          }

          .sahajRfqNote {
            display: grid;
          }
        }
      `}</style>
    </main>
  );
}

export default function UnifiedRfqStartPage() {
  return (
    <Suspense
      fallback={
        <div className="container pageBody" style={{ paddingTop: 16 }}>
          <SectionSkeleton cards={2} />
        </div>
      }
    >
      <UnifiedRfqStartPageInner />
    </Suspense>
  );
}
