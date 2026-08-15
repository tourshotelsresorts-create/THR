export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export function validationError(message: string, details?: unknown): ApiError {
  return new ApiError(400, message, "VALIDATION_ERROR", details);
}
