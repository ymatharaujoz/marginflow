import { getWebEnv } from "@/lib/env";
import type { ApiContractSchema } from "./contract";
import { ApiContractError, parseApiContract } from "./contract";
export { ApiContractError } from "./contract";

type PrimitiveBody = BodyInit | null | undefined;

export class ApiClientError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(message: string, options: { status: number; payload: unknown }) {
    super(message);
    this.name = "ApiClientError";
    this.status = options.status;
    this.payload = options.payload;
  }
}

export type ApiRequestOptions = Omit<RequestInit, "body" | "method"> & {
  body?: PrimitiveBody | Record<string, unknown>;
};

export type ApiClientConfig = {
  baseUrl: string;
  fetchFn?: typeof fetch;
  credentials?: RequestCredentials;
  defaultHeaders?: HeadersInit;
};

async function parseResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  if (contentType.includes("text/")) {
    return response.text();
  }

  return null;
}

function extractApiErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload === "object" && payload !== null) {
    const base = payload as Record<string, unknown>;
    if (typeof base.message === "string") return base.message;
    if (Array.isArray(base.message)) {
      return base.message.map((part) => String(part)).join(", ");
    }

    if (typeof base.error === "object" && base.error !== null) {
      const nested = base.error as Record<string, unknown>;
      if (typeof nested.message === "string") return nested.message;
      if (Array.isArray(nested.message)) return nested.message.map((part) => String(part)).join(", ");
    }
  }

  return fallback;
}

function normalizeBody(body: ApiRequestOptions["body"]) {
  if (!body || body instanceof FormData || body instanceof URLSearchParams || typeof body === "string" || body instanceof Blob || body instanceof ArrayBuffer) {
    return { body, contentType: undefined };
  }

  return {
    body: JSON.stringify(body),
    contentType: "application/json",
  };
}

function normalizePath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

export function createApiClient({
  baseUrl,
  fetchFn = fetch,
  credentials = "include",
  defaultHeaders,
}: ApiClientConfig) {
  async function request<T>(
    method: "GET" | "POST" | "PATCH",
    path: string,
    options: ApiRequestOptions = {},
  ): Promise<T> {
    const { body, contentType } = normalizeBody(options.body);
    const headers = new Headers(defaultHeaders);

    if (options.headers) {
      new Headers(options.headers).forEach((value, key) => headers.set(key, value));
    }

    if (contentType && !headers.has("content-type")) {
      headers.set("content-type", contentType);
    }

    const response = await fetchFn(`${baseUrl}${normalizePath(path)}`, {
      ...options,
      method,
      headers,
      body,
      credentials,
    });

    const payload = await parseResponse(response);

    if (!response.ok) {
      throw new ApiClientError(extractApiErrorMessage(payload, `API request failed with status ${response.status}`), {
        status: response.status,
        payload,
      });
    }

    return payload as T;
  }

  return {
    get<T>(path: string, options?: Omit<ApiRequestOptions, "body">) {
      return request<T>("GET", path, options);
    },
    async getValidatedData<T>(
      path: string,
      schema: ApiContractSchema<{ data: T; error: null }>,
      options?: Omit<ApiRequestOptions, "body">,
    ) {
      const payload = await request<unknown>("GET", path, options);
      return parseApiContract(path, payload, schema).data;
    },
    post<T>(path: string, options?: ApiRequestOptions) {
      return request<T>("POST", path, options);
    },
    patch<T>(path: string, options?: ApiRequestOptions) {
      return request<T>("PATCH", path, options);
    },
  };
}

let cachedApiClient: ReturnType<typeof createApiClient> | undefined;

function getDefaultApiClient() {
  if (!cachedApiClient) {
    cachedApiClient = createApiClient({
      baseUrl: getWebEnv().NEXT_PUBLIC_API_BASE_URL,
    });
  }

  return cachedApiClient;
}

export const apiClient = {
  get<T>(path: string, options?: Omit<ApiRequestOptions, "body">) {
    return getDefaultApiClient().get<T>(path, options);
  },
  getValidatedData<T>(
    path: string,
    schema: ApiContractSchema<{ data: T; error: null }>,
    options?: Omit<ApiRequestOptions, "body">,
  ) {
    return getDefaultApiClient().getValidatedData(path, schema, options);
  },
  post<T>(path: string, options?: ApiRequestOptions) {
    return getDefaultApiClient().post<T>(path, options);
  },
  patch<T>(path: string, options?: ApiRequestOptions) {
    return getDefaultApiClient().patch<T>(path, options);
  },
};
