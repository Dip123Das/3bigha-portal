import type { Metadata } from "next";
import { siteConfig } from "@/lib/seo/site";
import { VendorOpportunitySeoPage } from "@/lib/seo/vendor-opportunity-page";

export async function generateMetadata({ params }: { params: { state: string; district: string } }): Promise<Metadata> {
  const title = `Vendor opportunities in ${params.district.replace(/-/g, " ")} | 3Bigha`;
  const description = "Find active local vendor requirements and business gaps on 3Bigha.";
  return {
    title,
    description,
    alternates: { canonical: `${siteConfig.url}/vendor-opportunities/${params.state}/${params.district}` },
    openGraph: { title, description, url: `${siteConfig.url}/vendor-opportunities/${params.state}/${params.district}`, type: "website" },
  };
}

export default function Page({ params }: { params: { state: string; district: string } }) {
  return <VendorOpportunitySeoPage state={params.state} district={params.district} />;
}
