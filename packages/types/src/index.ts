export type ApiSuccess<T> = {
  data: T;
  error: null;
};

export type ApiFailure = {
  data: null;
  error: {
    code: string;
    message: string;
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export * from "./finance";
export * from "./finance-inputs";
export * from "./integrations";
export * from "./products";
export * from "./protected-app";
export * from "./sync";
