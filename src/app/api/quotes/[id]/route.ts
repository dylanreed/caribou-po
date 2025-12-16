import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const quote = await prisma.quote.findUnique({
    where: { id: params.id },
    include: {
      supplier: true,
      purchaseOrder: {
        select: { id: true, poNumber: true },
      },
      lineItems: {
        include: {
          product: true,
        },
      },
    },
  })

  if (!quote) {
    return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
  }

  return NextResponse.json(quote)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { quoteNumber, quoteDate, quoteType, supplierId, purchaseOrderId, pdfUrl, shippingCost, notes, lineItems } = body

    // Update the quote
    await prisma.quote.update({
      where: { id: params.id },
      data: {
        quoteNumber: quoteNumber || null,
        quoteDate: new Date(quoteDate),
        quoteType: quoteType || 'production',
        supplierId: supplierId || null,
        purchaseOrderId: purchaseOrderId || null,
        pdfUrl: pdfUrl || null,
        shippingCost: shippingCost ? parseFloat(shippingCost) : null,
        notes: notes || null,
      },
    })

    // Delete existing line items and recreate
    await prisma.quoteLineItem.deleteMany({
      where: { quoteId: params.id },
    })

    // Create new line items
    if (lineItems && lineItems.length > 0) {
      const isProduction = (quoteType || 'production') === 'production'

      for (const item of lineItems) {
        await prisma.quoteLineItem.create({
          data: {
            quoteId: params.id,
            productId: item.productId,
            quantity: item.quantity,
            unitCost: item.unitCost,
            totalCost: item.totalCost,
            notes: item.notes || null,
          },
        })

        // Only update product price for production quotes
        if (isProduction) {
          const calculatedUnitCost = (item.totalCost + (shippingCost ? parseFloat(shippingCost) / lineItems.length : 0)) / item.quantity
          await prisma.product.update({
            where: { id: item.productId },
            data: { unitPrice: calculatedUnitCost },
          })
        }
      }
    }

    // Fetch updated quote with relations
    const updatedQuote = await prisma.quote.findUnique({
      where: { id: params.id },
      include: {
        supplier: true,
        purchaseOrder: {
          select: { id: true, poNumber: true },
        },
        lineItems: {
          include: {
            product: true,
          },
        },
      },
    })

    return NextResponse.json(updatedQuote)
  } catch (error) {
    console.error('Error updating quote:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  await prisma.quote.delete({
    where: { id: params.id },
  })
  return NextResponse.json({ success: true })
}
