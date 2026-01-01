import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'

/**
 * Standard API error response format
 */
export interface ApiErrorResponse {
  error: {
    message: string
    code?: string
    details?: unknown
  }
}

/**
 * Handle API errors and return appropriate responses
 */
export function handleApiError(error: unknown): NextResponse<ApiErrorResponse> {
  console.error('API Error:', error)

  // Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
      },
      { status: 400 }
    )
  }

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return NextResponse.json(
          {
            error: {
              message: 'A record with this value already exists',
              code: 'DUPLICATE_RECORD',
            },
          },
          { status: 409 }
        )
      case 'P2025':
        return NextResponse.json(
          {
            error: {
              message: 'Record not found',
              code: 'NOT_FOUND',
            },
          },
          { status: 404 }
        )
      case 'P2003':
        return NextResponse.json(
          {
            error: {
              message: 'Related record not found',
              code: 'FOREIGN_KEY_VIOLATION',
            },
          },
          { status: 400 }
        )
      default:
        return NextResponse.json(
          {
            error: {
              message: 'Database error',
              code: 'DATABASE_ERROR',
            },
          },
          { status: 500 }
        )
    }
  }

  // Prisma validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    return NextResponse.json(
      {
        error: {
          message: 'Invalid data provided',
          code: 'INVALID_DATA',
        },
      },
      { status: 400 }
    )
  }

  // Generic errors
  if (error instanceof Error) {
    return NextResponse.json(
      {
        error: {
          message: error.message || 'An unexpected error occurred',
          code: 'INTERNAL_ERROR',
        },
      },
      { status: 500 }
    )
  }

  // Unknown errors
  return NextResponse.json(
    {
      error: {
        message: 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR',
      },
    },
    { status: 500 }
  )
}

/**
 * Parse and validate request body
 */
export async function parseBody<T>(
  request: Request,
  schema: { parse: (data: unknown) => T }
): Promise<T> {
  const body = await request.json()
  return schema.parse(body)
}

/**
 * Safe number parsing with default fallback
 */
export function safeParseFloat(value: unknown, defaultValue: number = 0): number {
  const parsed = parseFloat(String(value))
  return isNaN(parsed) ? defaultValue : parsed
}

/**
 * Safe integer parsing with default fallback
 */
export function safeParseInt(value: unknown, defaultValue: number = 0): number {
  const parsed = parseInt(String(value), 10)
  return isNaN(parsed) ? defaultValue : parsed
}

/**
 * Validate URL is from allowed domains (SSRF protection)
 */
const ALLOWED_UPLOAD_DOMAINS = [
  'vercel-storage.com',
  'blob.vercel-storage.com',
  'i0.wp.com',
  'yoyofactory.com',
  'shop.yoyofactory.com',
  'cdn.shopify.com',
  'localhost',
]

export function isAllowedUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()

    // Block private/internal networks
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.16.') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal')
    ) {
      // Allow localhost only in development
      if (process.env.NODE_ENV !== 'development') {
        return false
      }
    }

    // Check against allowed domains
    return ALLOWED_UPLOAD_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
    )
  } catch {
    return false
  }
}

/**
 * Allowed content types for uploads
 */
export const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
]

/**
 * Maximum file size in bytes (10MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024
