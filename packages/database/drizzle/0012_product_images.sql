CREATE TABLE IF NOT EXISTS "product_images" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "url" text NOT NULL,
  "position" integer DEFAULT 0 NOT NULL,
  "source" varchar(32) NOT NULL,
  "external_identifier" varchar(255),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "product_images_organization_id_organizations_id_fk"
    FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "product_images_product_id_products_id_fk"
    FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "product_images_position_non_negative" CHECK ("product_images"."position" >= 0)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_images_organization_id_idx"
  ON "product_images" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_images_product_id_idx"
  ON "product_images" USING btree ("product_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "product_images_product_source_position_key"
  ON "product_images" USING btree ("product_id", "source", "position");
