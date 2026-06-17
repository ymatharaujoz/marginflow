ALTER TABLE "companies" RENAME COLUMN "name" TO "razao_social";
ALTER TABLE "companies" ADD COLUMN "cnpj" varchar(14) NOT NULL;

ALTER TABLE "companies"
  ADD CONSTRAINT "companies_razao_social_length"
  CHECK (char_length(trim("companies"."razao_social")) >= 2);

ALTER TABLE "companies"
  ADD CONSTRAINT "companies_cnpj_length"
  CHECK (char_length(trim("companies"."cnpj")) = 14);

ALTER TABLE "companies"
  ADD CONSTRAINT "companies_cnpj_digits"
  CHECK ("companies"."cnpj" ~ '^[0-9]{14}$');

CREATE UNIQUE INDEX "companies_org_cnpj_key" ON "companies" USING btree ("organization_id","cnpj");
