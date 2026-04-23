import { describe, it, expect } from 'vitest'
import {
  AppError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  ValidationError,
  UnprocessableEntityError,
} from '@/shared/errors/AppError'

describe('AppError', () => {
  it('creates an error with default status 500', () => {
    const err = new AppError('Something went wrong')
    expect(err.message).toBe('Something went wrong')
    expect(err.statusCode).toBe(500)
    expect(err.isOperational).toBe(true)
    expect(err.name).toBe('AppError')
  })

  it('creates an error with a custom status code', () => {
    const err = new AppError('Custom error', 422)
    expect(err.statusCode).toBe(422)
  })

  it('is an instance of Error', () => {
    const err = new AppError('test')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(AppError)
  })

  it('captures stack trace', () => {
    const err = new AppError('test')
    expect(err.stack).toBeDefined()
  })
})

describe('NotFoundError', () => {
  it('returns 404 with default message', () => {
    const err = new NotFoundError()
    expect(err.statusCode).toBe(404)
    expect(err.message).toBe('Resource not found')
    expect(err.name).toBe('NotFoundError')
  })

  it('returns 404 with custom resource name', () => {
    const err = new NotFoundError('Document')
    expect(err.message).toBe('Document not found')
  })
})

describe('UnauthorizedError', () => {
  it('returns 401 with default message', () => {
    const err = new UnauthorizedError()
    expect(err.statusCode).toBe(401)
    expect(err.message).toBe('Unauthorized')
    expect(err.name).toBe('UnauthorizedError')
  })
})

describe('ForbiddenError', () => {
  it('returns 403', () => {
    const err = new ForbiddenError()
    expect(err.statusCode).toBe(403)
    expect(err.name).toBe('ForbiddenError')
  })
})

describe('ConflictError', () => {
  it('returns 409', () => {
    const err = new ConflictError()
    expect(err.statusCode).toBe(409)
    expect(err.name).toBe('ConflictError')
  })
})

describe('ValidationError', () => {
  it('returns 422', () => {
    const err = new ValidationError()
    expect(err.statusCode).toBe(422)
    expect(err.name).toBe('ValidationError')
  })
})

describe('UnprocessableEntityError', () => {
  it('returns 422', () => {
    const err = new UnprocessableEntityError()
    expect(err.statusCode).toBe(422)
  })
})
