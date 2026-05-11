type SafeParseSuccess<T> = {
  success: true;
  data: T;
};

type SafeParseFailure = {
  success: false;
  error: {
    issues?: Array<{
      message: string;
      path: PropertyKey[];
    }>;
    message: string;
  };
};

export type ApiContractSchema<T> = {
  safeParse(input: unknown): SafeParseSuccess<T> | SafeParseFailure;
};

export class ApiContractError extends Error {
  readonly path: string;
  readonly payload: unknown;

  constructor(message: string, options: { path: string; payload: unknown }) {
    super(message);
    this.name = "ApiContractError";
    this.path = options.path;
    this.payload = options.payload;
  }
}

function formatIssues(error: SafeParseFailure["error"]) {
  if (!error.issues || error.issues.length === 0) {
    return error.message;
  }

  return error.issues
    .map((issue) => {
      const path =
        issue.path.length > 0 ? issue.path.map((part) => String(part)).join(".") : "root";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
}

export function parseApiContract<T>(path: string, payload: unknown, schema: ApiContractSchema<T>) {
  const result = schema.safeParse(payload);

  if (!result.success) {
    throw new ApiContractError(`Invalid API contract for ${path}: ${formatIssues(result.error)}`, {
      path,
      payload,
    });
  }

  return result.data;
}
