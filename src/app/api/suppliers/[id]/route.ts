import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { supplierUpdateSchema, idParamSchema } from '@/lib/validations'
import { handleApiError } from '@/lib/api-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = idParamSchema.parse(params)

    const supplier = await prisma.supplier.findUnique({
      where: { id },
    })

    if (!supplier) {
      return NextResponse.json(
        { error: { message: 'Supplier not found', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    return NextResponse.json(supplier)
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
    const validated = supplierUpdateSchema.parse(body)

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        ...(validated.name !== undefined && { name: validated.name }),
        ...(validated.displayName !== undefined && { displayName: validated.displayName || null }),
        ...(validated.email !== undefined && { email: validated.email || null }),
        ...(validated.phone !== undefined && { phone: validated.phone || null }),
        ...(validated.address !== undefined && { address: validated.address || null }),
        ...(validated.city !== undefined && { city: validated.city || null }),
        ...(validated.state !== undefined && { state: validated.state || null }),
        ...(validated.zip !== undefined && { zip: validated.zip || null }),
        ...(validated.country !== undefined && { country: validated.country || null }),
        ...(validated.paymentTerms !== undefined && { paymentTerms: validated.paymentTerms || null }),
        ...(validated.notes !== undefined && { notes: validated.notes || null }),
      },
    })

    return NextResponse.json(supplier)
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

    await prisma.supplier.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
