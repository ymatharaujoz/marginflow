"use client";

import { createAuthClient } from "better-auth/react";

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export const authClient = createAuthClient({
  baseURL,
  fetchOptions: {
    credentials: "include",
  },
});

export const { signIn, signOut, useSession } = authClient;

export type WebSession = typeof authClient.$Infer.Session;
