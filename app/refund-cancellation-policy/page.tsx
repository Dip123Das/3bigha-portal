import Link from "next/link";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Refund & Cancellation | 3Bigha",
  alternates: { canonical: "/refund-cancellation-policy" },
};
export default function RefundPolicy() {
  return (
    <main
      style={{
        maxWidth: 800,
        margin: "auto",
        padding: "32px 20px",
        lineHeight: 1.8,
      }}
    >
      <h1>Refund and cancellation policy</h1>
      <p>
        Effective for website subscriptions and optional services launched with
        Razorpay.
      </p>
      <h2>Monthly access and renewal</h2>
      <p>
        Each purchase provides one calendar month of the specified service.
        Prices shown at checkout are the complete customer total, including
        applicable tax. Renewal is manual: no automatic recurring debit is
        created. Choosing not to renew stops future charges. Same-service
        renewal preserves your remaining paid time.
      </p>
      <h2>Optional services</h2>
      <p>
        Property packs, manufacturing costing and individual
        construction-project costing are shown and purchased separately.
        Completing or archiving a project does not create another charge. Access
        ends at its paid-through date. Historical cost records remain readable;
        ongoing paid edits require renewal.
      </p>
      <h2>Failed, pending or duplicate payments</h2>
      <p>
        If your bank has debited a payment but confirmation is pending, do not
        pay again. Contact support with your purchase reference. We reconcile
        captured payments and investigate duplicates or a service that was not
        delivered. Failed or unverified payments do not activate paid access.
      </p>
      <h2>Refund requests</h2>
      <p>
        Contact support promptly with the purchase reference, payment date and
        reason. Verified duplicate collections and payments for services we
        cannot provide are eligible for correction or refund. Other requests are
        reviewed according to service delivery and applicable consumer rights;
        cancellation does not automatically refund used access. Approved refunds
        return through the payment provider to the original payment method.
        Processing time depends on the provider and bank; support will provide
        the available status. A full refund revokes the access purchased by that
        payment. Partial refunds are recorded separately and do not silently
        cancel the entire service.
      </p>
      <h2>Property purchase advances</h2>
      <p>
        This policy covers 3Bigha platform subscriptions and add-ons. Property
        purchase money and vendor/customer transactions have separate agreements
        and payment arrangements.
      </p>
      <p>
        <Link href="/contact">Contact support →</Link> ·{" "}
        <Link href="/dashboard/subscription">
          View plans and payment history →
        </Link>
      </p>
    </main>
  );
}
