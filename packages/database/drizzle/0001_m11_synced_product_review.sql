ALTER TABLE "external_products"
  ADD COLUMN "linked_product_id" uuid,
  ADD COLUMN "review_status" varchar(48) DEFAULT 'unreviewed' NOT NULL;

ALTER TABLE "external_products"
  ADD CONSTRAINT "external_products_linked_product_id_products_id_fk"
  FOREIGN KEY ("linked_product_id")
  REFERENCES "products"("id")
  ON DELETE SET NULL;

CREATE INDEX "external_products_linked_product_id_idx"
  ON "external_products" ("linked_product_id");
