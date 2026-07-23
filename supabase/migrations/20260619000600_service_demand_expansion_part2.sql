-- Additional service SEO mass expansion superseded by controlled SEO architecture.
--
-- The original migration attempted to cross join the complete national
-- geo_places dataset with multiple opportunity categories, producing
-- millions of permanent SEO rows in one transaction.
--
-- Existing curated vendor_opportunity_seo records are intentionally
-- preserved. National SEO expansion must use a controlled, normalized,
-- demand-led or dynamic projection architecture instead.

do $$
begin
  raise notice 'Additional service SEO mass expansion superseded by controlled SEO architecture.';
end
$$;
