import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { quoteCreateSchema } from '@/lib/validations'
import { handleApiError } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
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
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = quoteCreateSchema.parse(body)

    const { quoteNumber, quoteDate, quoteType, supplierId, pdfUrl, totalCost, shippingCost, notes, lineItems } = validated

    // Use transaction to create quote and update products atomically
    const quote = await prisma.$transaction(async (tx) => {
      // Create the quote with line items
      const newQuote = await tx.quote.create({
        data: {
          quoteNumber,
          quoteDate: new Date(quoteDate),
          quoteType: quoteType || 'production',
          supplierId: supplierId || null,
          pdfUrl: pdfUrl || null,
          totalCost: totalCost ?? null,
          shippingCost: shippingCost ?? null,
          notes: notes || null,
          lineItems: lineItems ? {
            create: lineItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitCost: item.unitCost,
              totalCost: item.totalCost,
              notes: item.notes || null,
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

      // Batch create ProductQuotes and update products
      if (lineItems && lineItems.length > 0) {
        const isProduction = (quoteType || 'production') === 'production'
        const shippingPerItem = shippingCost ? shippingCost / lineItems.length : 0

        // Create all ProductQuotes in batch
        await tx.productQuote.createMany({
          data: lineItems.map((item) => {
            const calculatedUnitCost = item.quantity > 0
              ? (item.totalCost + shippingPerItem) / item.quantity
              : 0
            return {
              productId: item.productId,
              quoteDate: new Date(quoteDate),
              quoteType: quoteType || 'production',
              unitPrice: calculatedUnitCost,
              totalCost: item.totalCost,
              shippingCost: shippingPerItem || null,
              quantity: item.quantity,
              pdfUrl: pdfUrl || null,
              notes: item.notes || null,
            }
          }),
        })

        // Only update product prices for production quotes
        if (isProduction) {
          // Update all products in parallel within the transaction
          await Promise.all(
            lineItems.map((item) => {
              const calculatedUnitCost = item.quantity > 0
                ? (item.totalCost + shippingPerItem) / item.quantity
                : 0
              return tx.product.update({
                where: { id: item.productId },
                data: { unitPrice: calculatedUnitCost },
              })
            })
          )
        }
      }

      return newQuote
    })

    return NextResponse.json(quote)
  } catch (error) {
    return handleApiError(error)
  }
}
