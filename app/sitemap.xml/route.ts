import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

export async function GET() {
  const supabase = getSupabaseBrowser();

  const { data } = await supabase
    .from("blog_posts")
    .select("slug,updated_at")
    .eq("status", "published");

  const urls = (data ?? []).map(
    (p) => `
    <url>
      <loc>https://3bigha.com/blog/${p.slug}</loc>
      <lastmod>${p.updated_at}</lastmod>
    </url>`
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls.join("")}
</urlset>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml" },
  });
}
