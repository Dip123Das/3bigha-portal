import type { Metadata } from "next";
import { siteConfig } from "@/lib/seo/site";
import { VendorOpportunitySeoPage } from "@/lib/seo/vendor-opportunity-page";

export async function generateMetadata({ params }: { params: { state: string } }): Promise<Metadata> {
  const title = `Vendor opportunities in ${params.state.replace(/-/g, " ")} | 3Bigha`;
  const description = "Find active vendor requirements for property, materials, services and rentals on 3Bigha.";
  return {
    title,
    description,
    alternates: { canonical: `${siteConfig.url}/vendor-opportunities/${params.state}` },
    openGraph: { title, description, url: `${siteConfig.url}/vendor-opportunities/${params.state}`, type: "website" },
  };
}

export default function Page({ params }: { params: { state: string } }) {
  return <VendorOpportunitySeoPage state={params.state} />;
}
