import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

import { createMetadata } from "@/lib/seo/metadata";
import BlogPostClient, {
  type BlogRow,
} from "./BlogPostClient";

type PageProps = {
  params: {
    slug: string;
  };
};

export const dynamic = "force-dynamic";

function clean(value: unknown) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeSlug(value: string) {
  try {
    return clean(
      decodeURIComponent(value || "")
    ).toLowerCase();
  } catch {
    return "";
  }
}

function validSlug(value: string) {
  return (
    value.length >= 3 &&
    value.length <= 180 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
  );
}

function getSupabase() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function getPublishedPost(
  rawSlug: string
): Promise<BlogRow | null> {
  const slug = decodeSlug(rawSlug);

  if (!validSlug(slug)) {
    return null;
  }

  const supabase = getSupabase();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("blog_posts")
    .select(
      [
        "id",
        "author_id",
        "title",
        "slug",
        "excerpt",
        "content",
        "status",
        "published_at",
      ].join(",")
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as unknown as BlogRow;
}

function descriptionFor(post: BlogRow) {
  const excerpt = clean(post.excerpt);

  if (excerpt) {
    return excerpt.slice(0, 170);
  }

  const content = clean(post.content);

  if (content) {
    return content.slice(0, 170);
  }

  return "Read this property and construction guide from 3BIGHA.";
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const post = await getPublishedPost(
    params.slug
  );

  if (!post) {
    notFound();
  }

  const title =
    clean(post.title) ||
    "3BIGHA Property and Construction Guide";

  return createMetadata({
    title,
    description: descriptionFor(post),
    path:
      "/blog/" +
      encodeURIComponent(post.slug),
    image: "/og/blog.png",
    keywords: [
      title,
      "3BIGHA blog",
      "property guide India",
      "construction guide India",
      "real estate information",
    ],
  });
}

export default async function BlogPostPage({
  params,
}: PageProps) {
  const post = await getPublishedPost(
    params.slug
  );

  if (!post) {
    notFound();
  }

  return <BlogPostClient post={post} />;
}
