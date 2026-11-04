import type { Metadata } from "next";
import { siteConfig } from "@/lib/seo/site";
import { VendorOpportunitySeoPage } from "@/lib/seo/vendor-opportunity-page";

export async function generateMetadata({ params }: { params: Promise<{ state: string; district: string }> }): Promise<Metadata> {
  const { state, district } = await params;
  const title = `Vendor opportunities in ${district.replace(/-/g, " ")} | 3Bigha`;
  const description = "Find active local vendor requirements and business gaps on 3Bigha.";
  return {
    title,
    description,
    alternates: { canonical: `${siteConfig.url}/vendor-opportunities/${state}/${district}` },
    openGraph: { title, description, url: `${siteConfig.url}/vendor-opportunities/${state}/${district}`, type: "website" },
  };
}

export default async function Page({ params }: { params: Promise<{ state: string; district: string }> }) {
  const { state, district } = await params;
  return <VendorOpportunitySeoPage state={state} district={district} />;
}
