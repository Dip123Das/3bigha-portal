import type { Metadata } from "next";
import { siteConfig } from "@/lib/seo/site";
import { VendorOpportunitySeoPage } from "@/lib/seo/vendor-opportunity-page";

export async function generateMetadata({ params }: { params: Promise<{ state: string }> }): Promise<Metadata> {
  const { state } = await params;
  const title = `Vendor opportunities in ${state.replace(/-/g, " ")} | 3Bigha`;
  const description = "Find active vendor requirements for property, materials, services and rentals on 3Bigha.";
  return {
    title,
    description,
    alternates: { canonical: `${siteConfig.url}/vendor-opportunities/${state}` },
    openGraph: { title, description, url: `${siteConfig.url}/vendor-opportunities/${state}`, type: "website" },
  };
}

export default async function Page({ params }: { params: Promise<{ state: string }> }) {
  const { state } = await params;
  return <VendorOpportunitySeoPage state={state} />;
}
