import type { ApiResponse } from "@marginflow/types";
import { uiPackage } from "@marginflow/ui";
import { validateClientEnv } from "@marginflow/validation/env";

const clientEnv = validateClientEnv({
  NEXT_PUBLIC_APP_URL: "https://marginflow.local",
});

const response: ApiResponse<{ surface: string }> = {
  data: {
    surface: uiPackage.name,
  },
  error: null,
};

export const webStub = {
  clientEnv,
  response,
  workspace: "web",
} as const;
