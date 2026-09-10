const BLOG_PLACEHOLDER_PATTERN =
  /\b(?:demo|dummy|placeholder|sample)\b/i;

function clean(value: unknown) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

export function isValidBlogSlug(
  value: unknown
) {
  const slug = clean(value);

  return (
    slug.length >= 3 &&
    slug.length <= 180 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
  );
}

export function isIndexableBlogPost(
  row: Record<string, unknown>
) {
  const title = clean(row.title);
  const slug = clean(row.slug);
  const content = clean(row.content);
  const status =
    clean(row.status).toLowerCase();

  const identityText =
    [title, slug].join(" ");

  return (
    status === "published" &&
    isValidBlogSlug(slug) &&
    title.length >= 12 &&
    content.length >= 250 &&
    !BLOG_PLACEHOLDER_PATTERN.test(
      identityText
    )
  );
}
