import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; supplierId: string } }
) {
  const body = await request.json()

  // If setting as primary, unset any existing primary first
  if (body.isPrimary) {
    await prisma.productSupplier.updateMany({
      where: { productId: params.id },
      data: { isPrimary: false },
    })
  }

  const productSupplier = await prisma.productSupplier.update({
    where: {
      productId_supplierId: {
        productId: params.id,
        supplierId: params.supplierId,
      },
    },
    data: {
      isPrimary: body.isPrimary,
    },
    include: { supplier: true },
  })

  return NextResponse.json(productSupplier)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; supplierId: string } }
) {
  await prisma.productSupplier.delete({
    where: {
      productId_supplierId: {
        productId: params.id,
        supplierId: params.supplierId,
      },
    },
  })

  return NextResponse.json({ success: true })
}
