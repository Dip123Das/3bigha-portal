import type { Metadata } from "next";
import { siteConfig } from "@/lib/seo/site";
import { VendorOpportunitySeoPage } from "@/lib/seo/vendor-opportunity-page";

export async function generateMetadata({ params }: { params: Promise<{ state: string; district: string; place: string }> }): Promise<Metadata> {
  const { state, district, place } = await params;
  const title = `Need vendors in ${place.replace(/-/g, " ")} | 3Bigha`;
  const description = "See active vendor demand for suppliers, services, rentals and property businesses on 3Bigha.";
  return {
    title,
    description,
    alternates: { canonical: `${siteConfig.url}/vendor-opportunities/${state}/${district}/${place}` },
    openGraph: { title, description, url: `${siteConfig.url}/vendor-opportunities/${state}/${district}/${place}`, type: "website" },
  };
}

export default async function Page({ params }: { params: Promise<{ state: string; district: string; place: string }> }) {
  const { state, district, place } = await params;
  return <VendorOpportunitySeoPage state={state} district={district} place={place} />;
}
