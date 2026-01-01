import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { supplierCreateSchema } from '@/lib/validations'
import { handleApiError } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  try {
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
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = supplierCreateSchema.parse(body)

    const supplier = await prisma.supplier.create({
      data: {
        name: validated.name,
        displayName: validated.displayName || null,
        email: validated.email || null,
        phone: validated.phone || null,
        address: validated.address || null,
        city: validated.city || null,
        state: validated.state || null,
        zip: validated.zip || null,
        country: validated.country || null,
        paymentTerms: validated.paymentTerms || null,
        notes: validated.notes || null,
      },
    })

    return NextResponse.json(supplier, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
