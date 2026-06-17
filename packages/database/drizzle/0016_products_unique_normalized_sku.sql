-- Pre-migration audit:
-- If this query returns rows, production data must be deduplicated before rollout.
-- select organization_id, upper(trim(sku)) as normalized_sku, count(*)
-- from products
-- where sku is not null and char_length(trim(sku)) > 0
-- group by organization_id, upper(trim(sku))
-- having count(*) > 1;

CREATE UNIQUE INDEX IF NOT EXISTS "products_org_normalized_sku_key"
  ON "products" ("organization_id", upper(trim("sku")))
  WHERE "sku" IS NOT NULL
    AND char_length(trim("sku")) > 0;
