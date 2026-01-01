import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { productUpdateSchema, idParamSchema } from '@/lib/validations'
import { handleApiError } from '@/lib/api-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = idParamSchema.parse(params)

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        engravingArt: {
          orderBy: { position: 'asc' },
        },
        quotes: {
          orderBy: { quoteDate: 'desc' },
        },
      },
    })

    if (!product) {
      return NextResponse.json(
        { error: { message: 'Product not found', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    return NextResponse.json(product)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = idParamSchema.parse(params)
    const body = await request.json()
    const validated = productUpdateSchema.parse(body)

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(validated.sku !== undefined && { sku: validated.sku }),
        ...(validated.name !== undefined && { name: validated.name }),
        ...(validated.description !== undefined && { description: validated.description || null }),
        ...(validated.imageUrl !== undefined && { imageUrl: validated.imageUrl || null }),
        ...(validated.unitPrice !== undefined && { unitPrice: validated.unitPrice }),
        ...(validated.unit !== undefined && { unit: validated.unit }),
        ...(validated.category !== undefined && { category: validated.category || null }),
        ...(validated.material !== undefined && { material: validated.material || null }),
        ...(validated.isActive !== undefined && { isActive: validated.isActive }),
      },
      include: {
        engravingArt: {
          orderBy: { position: 'asc' },
        },
        quotes: {
          orderBy: { quoteDate: 'desc' },
        },
      },
    })

    return NextResponse.json(product)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = idParamSchema.parse(params)

    await prisma.product.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
