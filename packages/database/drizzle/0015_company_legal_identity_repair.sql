DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'companies'
      AND column_name = 'name'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'companies'
      AND column_name = 'razao_social'
  ) THEN
    ALTER TABLE "companies" RENAME COLUMN "name" TO "razao_social";
  END IF;
END $$;

ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "cnpj" varchar(14);

UPDATE "companies"
SET "cnpj" = '00000000000000'
WHERE "cnpj" IS NULL;

ALTER TABLE "companies" ALTER COLUMN "cnpj" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'companies_razao_social_length'
  ) THEN
    ALTER TABLE "companies"
      ADD CONSTRAINT "companies_razao_social_length"
      CHECK (char_length(trim("companies"."razao_social")) >= 2);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'companies_cnpj_length'
  ) THEN
    ALTER TABLE "companies"
      ADD CONSTRAINT "companies_cnpj_length"
      CHECK (char_length(trim("companies"."cnpj")) = 14);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'companies_cnpj_digits'
  ) THEN
    ALTER TABLE "companies"
      ADD CONSTRAINT "companies_cnpj_digits"
      CHECK ("companies"."cnpj" ~ '^[0-9]{14}$');
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "companies_org_cnpj_key" ON "companies" USING btree ("organization_id","cnpj");
