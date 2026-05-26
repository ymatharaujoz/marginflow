declare module "@better-auth/infra" {
  import type { BetterAuthPlugin } from "better-auth";

  export type DashOptions = {
    apiKey?: string;
    apiUrl?: string;
    kvUrl?: string;
    apiTimeout?: number;
    kvTimeout?: number;
    activityTracking?: {
      enabled?: boolean;
      updateInterval?: number;
    };
  };

  export function dash(options: DashOptions): BetterAuthPlugin;
}
