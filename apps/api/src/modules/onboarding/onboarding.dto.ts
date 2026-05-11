import { z } from "zod";

export class CreateOrganizationOnboardingDto {
  static schema = z.object({
    name: z.string().trim().min(2).max(255),
    slug: z.string().trim().min(2).max(120).nullable().optional(),
  });

  name!: string;
  slug?: string | null;
}
