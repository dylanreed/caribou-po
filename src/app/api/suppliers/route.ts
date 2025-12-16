import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const search = searchParams.get('search') || ''

  const suppliers = await prisma.supplier.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : undefined,
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(suppliers)
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  const supplier = await prisma.supplier.create({
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

  return NextResponse.json(supplier, { status: 201 })
}
