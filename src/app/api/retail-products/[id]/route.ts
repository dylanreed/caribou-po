import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  await prisma.retailProduct.delete({
    where: { id: params.id },
  })

  return NextResponse.json({ success: true })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json()

  const retailProduct = await prisma.retailProduct.update({
    where: { id: params.id },
    data: {
      productUrl: body.productUrl,
      isActive: body.isActive,
    },
  })

  return NextResponse.json(retailProduct)
}
