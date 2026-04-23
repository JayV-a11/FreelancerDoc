/**
 * AppError — structured application error.
 *
 * All modules throw AppError (or subclasses) so the global Fastify error
 * handler can serialize them consistently and never leak stack traces.
 */
export class AppError extends Error {
  public readonly statusCode: number
  public readonly isOperational: boolean

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.isOperational = isOperational

    // Restore prototype chain broken by extending Error in TypeScript
    Object.setPrototypeOf(this, new.target.prototype)

    Error.captureStackTrace(this, this.constructor)
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404)
    this.name = 'NotFoundError'
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403)
    this.name = 'ForbiddenError'
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, 409)
    this.name = 'ConflictError'
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation error') {
    super(message, 422)
    this.name = 'ValidationError'
  }
}

export class UnprocessableEntityError extends AppError {
  constructor(message = 'Unprocessable entity') {
    super(message, 422)
    this.name = 'UnprocessableEntityError'
  }
}
