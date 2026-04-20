import { NextResponse } from "next/server";
import type { ApiFailure, ApiSuccess } from "@/types";

export function ok<T>(data: T, init?: ResponseInit) {
  const body: ApiSuccess<T> = {
    data,
    error: null,
  };

  return NextResponse.json(body, init);
}

export function fail(code: string, message: string, init?: ResponseInit) {
  const body: ApiFailure = {
    data: null,
    error: {
      code,
      message,
    },
  };

  return NextResponse.json(body, {
    status: init?.status ?? 400,
    ...init,
  });
}
