export interface ErrorDetail {
  code: string;
  field?: string;
  message: string;
  details?: unknown;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errors: ErrorDetail[];

  constructor(
    message: string,
    statusCode: number = 500,
    errors: ErrorDetail[] = [{ code: "internal_error", message }],
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = "Bad Request", errors?: ErrorDetail[]) {
    super(
      message,
      400,
      errors || [{ code: "bad_request", message }],
    );
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource Not Found") {
    super(message, 404, [{ code: "not_found", message }]);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized") {
    super(message, 401, [{ code: "unauthorized", message }]);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden") {
    super(message, 403, [{ code: "forbidden", message }]);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = "Conflict occurred") {
    super(message, 409, [{ code: "conflict", message }]);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message: string = "Too many requests. Please slow down.") {
    super(message, 429, [{ code: "too_many_requests", message }]);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string = "The service is temporarily unavailable. Please try again later.") {
    super(message, 503, [{ code: "service_unavailable", message }]);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = "Rate limit exceeded") {
    super(message, 429, [{ code: "rate_limit_exceeded", message }]);
  }
}
