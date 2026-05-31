import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return {
    title: "Search page not indexed",
    robots: {
      index: false,
      follow: true,
      googleBot: {
        index: false,
        follow: true,
      },
    },
  };
}

export default function SearchSlugPage() {
  notFound();
}
