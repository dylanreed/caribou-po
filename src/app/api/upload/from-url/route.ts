import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { uploadFromUrlSchema } from '@/lib/validations'
import { handleApiError, isAllowedUrl, ALLOWED_CONTENT_TYPES } from '@/lib/api-utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Timeout for fetching images (5 seconds)
const FETCH_TIMEOUT = 5000

// Max file size for URL uploads (10MB)
const MAX_URL_FILE_SIZE = 10 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = uploadFromUrlSchema.parse(body)
    const { url, folder } = validated

    // SSRF Protection: Validate URL is from allowed domains
    if (!isAllowedUrl(url)) {
      return NextResponse.json(
        {
          error: {
            message: 'URL domain not allowed. Only approved image hosts are permitted.',
            code: 'FORBIDDEN_DOMAIN'
          }
        },
        { status: 403 }
      )
    }

    // Fetch the image with timeout
    let fetchUrl = url
    if (!fetchUrl.includes('ssl=')) {
      fetchUrl = fetchUrl.includes('?') ? `${fetchUrl}&ssl=1` : `${fetchUrl}?ssl=1`
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT)

    let response: Response
    try {
      response = await fetch(fetchUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Caribou-PO-ImageFetcher/1.0',
        },
      })
    } catch (fetchError) {
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return NextResponse.json(
          { error: { message: 'Image fetch timed out', code: 'FETCH_TIMEOUT' } },
          { status: 408 }
        )
      }
      throw fetchError
    } finally {
      clearTimeout(timeoutId)
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error: {
            message: `Failed to fetch image: ${response.status} ${response.statusText}`,
            code: 'FETCH_FAILED'
          }
        },
        { status: 400 }
      )
    }

    // Check content length if available
    const contentLength = response.headers.get('content-length')
    if (contentLength && parseInt(contentLength, 10) > MAX_URL_FILE_SIZE) {
      return NextResponse.json(
        {
          error: {
            message: `File too large. Maximum size is ${MAX_URL_FILE_SIZE / 1024 / 1024}MB`,
            code: 'FILE_TOO_LARGE'
          }
        },
        { status: 413 }
      )
    }

    const contentType = response.headers.get('content-type') || ''

    // Validate content type
    const baseContentType = contentType.split(';')[0].trim()
    if (baseContentType && !ALLOWED_CONTENT_TYPES.includes(baseContentType)) {
      return NextResponse.json(
        {
          error: {
            message: 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP, PDF',
            code: 'INVALID_FILE_TYPE'
          }
        },
        { status: 400 }
      )
    }

    // Determine file extension from content type or URL
    let ext = '.png'
    if (contentType.includes('jpeg') || contentType.includes('jpg')) {
      ext = '.jpg'
    } else if (contentType.includes('gif')) {
      ext = '.gif'
    } else if (contentType.includes('webp')) {
      ext = '.webp'
    } else if (contentType.includes('png')) {
      ext = '.png'
    } else if (contentType.includes('pdf')) {
      ext = '.pdf'
    } else {
      // Try to get extension from URL
      const urlExt = url.match(/\.(jpe?g|png|gif|webp|pdf)/i)?.[0]
      if (urlExt) {
        ext = urlExt.toLowerCase()
      }
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const filename = `${folder}/url-image-${timestamp}-${randomStr}${ext}`

    // Get file data and verify size
    const arrayBuffer = await response.arrayBuffer()
    if (arrayBuffer.byteLength > MAX_URL_FILE_SIZE) {
      return NextResponse.json(
        {
          error: {
            message: `File too large. Maximum size is ${MAX_URL_FILE_SIZE / 1024 / 1024}MB`,
            code: 'FILE_TOO_LARGE'
          }
        },
        { status: 413 }
      )
    }

    // Upload to Vercel Blob
    const blob = await put(filename, arrayBuffer, {
      access: 'public',
      contentType: baseContentType || 'image/png',
    })

    return NextResponse.json({
      success: true,
      url: blob.url,
      filename: blob.pathname,
      originalUrl: url,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
