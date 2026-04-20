export class AppError extends Error {
  constructor(
    message: string,
    readonly code = "APP_ERROR",
    readonly status = 500,
  ) {
    super(message);
    this.name = "AppError";
  }
}
