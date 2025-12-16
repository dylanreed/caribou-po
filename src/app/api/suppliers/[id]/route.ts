import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supplier = await prisma.supplier.findUnique({
    where: { id: params.id },
  })

  if (!supplier) {
    return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
  }

  return NextResponse.json(supplier)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json()

  const supplier = await prisma.supplier.update({
    where: { id: params.id },
    data: {
      name: body.name,
      displayName: body.displayName || null,
      email: body.email || null,
      phone: body.phone || null,
      address: body.address || null,
      city: body.city || null,
      state: body.state || null,
      zip: body.zip || null,
      country: body.country || null,
      paymentTerms: body.paymentTerms || null,
      notes: body.notes || null,
    },
  })

  return NextResponse.json(supplier)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  await prisma.supplier.delete({
    where: { id: params.id },
  })

  return NextResponse.json({ success: true })
}
