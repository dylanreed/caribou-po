import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const suppliers = await prisma.productSupplier.findMany({
    where: { productId: params.id },
    include: { supplier: true },
    orderBy: { isPrimary: 'desc' },
  })

  return NextResponse.json(suppliers)
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json()

  // If setting as primary, unset any existing primary
  if (body.isPrimary) {
    await prisma.productSupplier.updateMany({
      where: { productId: params.id },
      data: { isPrimary: false },
    })
  }

  const productSupplier = await prisma.productSupplier.create({
    data: {
      productId: params.id,
      supplierId: body.supplierId,
      isPrimary: body.isPrimary || false,
    },
    include: { supplier: true },
  })

  return NextResponse.json(productSupplier)
}
