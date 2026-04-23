import { getWebEnv } from "@/lib/env";

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
      throw new ApiClientError(
        typeof payload === "object" && payload !== null && "message" in payload
          ? String(payload.message)
          : `API request failed with status ${response.status}`,
        {
          status: response.status,
          payload,
        },
      );
    }

    return payload as T;
  }

  return {
    get<T>(path: string, options?: Omit<ApiRequestOptions, "body">) {
      return request<T>("GET", path, options);
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
  post<T>(path: string, options?: ApiRequestOptions) {
    return getDefaultApiClient().post<T>(path, options);
  },
  patch<T>(path: string, options?: ApiRequestOptions) {
    return getDefaultApiClient().patch<T>(path, options);
  },
};
