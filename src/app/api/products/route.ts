import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { productCreateSchema } from '@/lib/validations'
import { handleApiError } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const activeOnly = searchParams.get('activeOnly') === 'true'

    const products = await prisma.product.findMany({
      where: {
        AND: [
          search
            ? {
                OR: [
                  { name: { contains: search } },
                  { sku: { contains: search } },
                ],
              }
            : {},
          activeOnly ? { isActive: true } : {},
        ],
      },
      include: {
        engravingArt: {
          where: { isActive: true },
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(products)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = productCreateSchema.parse(body)

    const product = await prisma.product.create({
      data: {
        sku: validated.sku,
        name: validated.name,
        description: validated.description || null,
        imageUrl: validated.imageUrl || null,
        unitPrice: validated.unitPrice,
        unit: validated.unit,
        category: validated.category || null,
        material: validated.material || null,
        isActive: validated.isActive,
      },
      include: {
        engravingArt: true,
      },
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
