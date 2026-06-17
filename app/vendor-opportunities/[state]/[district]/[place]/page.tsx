import type { Metadata } from "next";
import { siteConfig } from "@/lib/seo/site";
import { VendorOpportunitySeoPage } from "@/lib/seo/vendor-opportunity-page";

export async function generateMetadata({ params }: { params: { state: string; district: string; place: string } }): Promise<Metadata> {
  const title = `Need vendors in ${params.place.replace(/-/g, " ")} | 3Bigha`;
  const description = "See active vendor demand for suppliers, services, rentals and property businesses on 3Bigha.";
  return {
    title,
    description,
    alternates: { canonical: `${siteConfig.url}/vendor-opportunities/${params.state}/${params.district}/${params.place}` },
    openGraph: { title, description, url: `${siteConfig.url}/vendor-opportunities/${params.state}/${params.district}/${params.place}`, type: "website" },
  };
}

export default function Page({ params }: { params: { state: string; district: string; place: string } }) {
  return <VendorOpportunitySeoPage state={params.state} district={params.district} place={params.place} />;
}
