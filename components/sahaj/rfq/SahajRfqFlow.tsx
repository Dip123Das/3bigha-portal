"use client";

import Link from "next/link";

export default function SahajRfqFlow() {
  return (
    <main className="sahaj-rfq-flow">
      <section className="sahaj-rfq-card">
        <div className="sahaj-rfq-badge">Human First. AI Second. Precision Always.</div>

        <h1>Tell us what you need</h1>
        <p>
          Start with simple details. 3Bigha will prepare the professional RFQ,
          location matching and vendor discovery in the background.
        </p>

        <div className="sahaj-rfq-steps">
          <div>
            <b>1. What do you need?</b>
            <span>Title, description, quantity and date.</span>
          </div>
          <div>
            <b>2. Where do you need it?</b>
            <span>LGD location, PIN and exact address.</span>
          </div>
          <div>
            <b>3. Review and submit</b>
            <span>AI helps only where useful.</span>
          </div>
        </div>

        <div className="sahaj-rfq-actions">
          <Link href="/rfq/general/new" className="primary">
            Continue with current RFQ form
          </Link>
          <Link href="/rfq/start" className="secondary">
            Change requirement type
          </Link>
        </div>
      </section>

      <style jsx>{`
        .sahaj-rfq-flow {
          width: 100%;
          padding: 24px 14px;
          background: linear-gradient(180deg, #f8fbff, #ffffff);
        }

        .sahaj-rfq-card {
          width: 100%;
          max-width: 1120px;
          margin: 0 auto;
          border: 1px solid rgba(37, 99, 235, 0.16);
          border-radius: 24px;
          padding: 22px;
          background: #fff;
          box-shadow: 0 14px 36px rgba(15, 23, 42, 0.06);
        }

        .sahaj-rfq-badge {
          display: inline-flex;
          border-radius: 999px;
          background: #dbeafe;
          color: #1d4ed8;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 1000;
        }

        h1 {
          margin: 14px 0 0;
          font-size: clamp(28px, 4vw, 48px);
          line-height: 1.08;
          letter-spacing: -0.04em;
          font-weight: 1000;
          color: #0f172a;
        }

        p {
          max-width: 760px;
          margin: 10px 0 0;
          color: #475569;
          font-size: 15px;
          line-height: 1.6;
          font-weight: 700;
        }

        .sahaj-rfq-steps {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-top: 18px;
        }

        .sahaj-rfq-steps div {
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 16px;
          padding: 14px;
          background: #f8fafc;
        }

        .sahaj-rfq-steps b {
          display: block;
          color: #0f172a;
          font-weight: 1000;
        }

        .sahaj-rfq-steps span {
          display: block;
          margin-top: 5px;
          color: #64748b;
          font-size: 13px;
          font-weight: 700;
          line-height: 1.45;
        }

        .sahaj-rfq-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 18px;
        }

        .sahaj-rfq-actions a {
          border-radius: 14px;
          padding: 12px 16px;
          font-weight: 1000;
          text-decoration: none;
        }

        .primary {
          background: #2563eb;
          color: #fff;
        }

        .secondary {
          background: #eff6ff;
          color: #1d4ed8;
        }

        @media (max-width: 760px) {
          .sahaj-rfq-steps {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
