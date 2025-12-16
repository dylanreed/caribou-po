import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const quotes = await prisma.quote.findMany({
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
    orderBy: { quoteDate: 'desc' },
  })
  return NextResponse.json(quotes)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { quoteNumber, quoteDate, quoteType, supplierId, pdfUrl, totalCost, shippingCost, notes, lineItems } = body

    const quote = await prisma.quote.create({
      data: {
        quoteNumber,
        quoteDate: new Date(quoteDate),
        quoteType: quoteType || 'production',
        supplierId: supplierId || null,
        pdfUrl,
        totalCost: totalCost ? parseFloat(totalCost) : null,
        shippingCost: shippingCost ? parseFloat(shippingCost) : null,
        notes,
        lineItems: lineItems ? {
          create: lineItems.map((item: { productId: string; quantity: number; unitCost: number; totalCost: number; notes?: string }) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitCost: item.unitCost,
            totalCost: item.totalCost,
            notes: item.notes,
          })),
        } : undefined,
      },
      include: {
        supplier: true,
        lineItems: {
          include: {
            product: true,
          },
        },
      },
    })

    // Update product quotes for each line item
    if (lineItems && lineItems.length > 0) {
      const isProduction = (quoteType || 'production') === 'production'

      for (const item of lineItems) {
        const calculatedUnitCost = (item.totalCost + (shippingCost ? parseFloat(shippingCost) / lineItems.length : 0)) / item.quantity

        await prisma.productQuote.create({
          data: {
            productId: item.productId,
            quoteDate: new Date(quoteDate),
            quoteType: quoteType || 'production',
            unitPrice: calculatedUnitCost,
            totalCost: item.totalCost,
            shippingCost: shippingCost ? parseFloat(shippingCost) / lineItems.length : null,
            quantity: item.quantity,
            pdfUrl,
            notes: item.notes,
          },
        })

        // Only update product's current price for production quotes
        if (isProduction) {
          await prisma.product.update({
            where: { id: item.productId },
            data: { unitPrice: calculatedUnitCost },
          })
        }
      }
    }

    return NextResponse.json(quote)
  } catch (error) {
    console.error('Error creating quote:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
