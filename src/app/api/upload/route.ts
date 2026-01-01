import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { handleApiError, ALLOWED_CONTENT_TYPES, MAX_FILE_SIZE } from '@/lib/api-utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_FOLDERS = ['colors', 'products', 'engraving', 'quotes']

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const folder = (formData.get('folder') as string) || 'colors'

    if (!file) {
      return NextResponse.json(
        { error: { message: 'No file provided', code: 'NO_FILE' } },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: {
            message: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
            code: 'FILE_TOO_LARGE'
          }
        },
        { status: 413 }
      )
    }

    // Validate file type
    if (!ALLOWED_CONTENT_TYPES.includes(file.type)) {
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

    // Validate folder
    if (!VALID_FOLDERS.includes(folder)) {
      return NextResponse.json(
        {
          error: {
            message: `Invalid folder. Allowed: ${VALID_FOLDERS.join(', ')}`,
            code: 'INVALID_FOLDER'
          }
        },
        { status: 400 }
      )
    }

    // Generate unique filename - preserve original extension
    const timestamp = Date.now()
    const ext = file.name.match(/\.[^/.]+$/)?.[0] || '.png'
    const safeName = file.name
      .replace(/\.[^/.]+$/, '') // Remove extension
      .replace(/[^a-zA-Z0-9-_]/g, '-') // Replace special chars
      .substring(0, 50) // Limit length

    const filename = `${folder}/${safeName}-${timestamp}${ext}`

    // Upload to Vercel Blob
    const blob = await put(filename, file, {
      access: 'public',
    })

    return NextResponse.json({
      success: true,
      url: blob.url,
      filename: blob.pathname,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
