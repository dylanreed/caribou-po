import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { purchaseOrderCreateSchema } from '@/lib/validations'
import { handleApiError } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const supplierId = searchParams.get('supplierId') || ''

    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: {
        AND: [
          search
            ? {
                OR: [
                  { poNumber: { contains: search } },
                  { supplier: { name: { contains: search } } },
                ],
              }
            : {},
          status ? { status } : {},
          supplierId ? { supplierId } : {},
        ],
      },
      include: {
        supplier: true,
        lineItems: {
          include: {
            product: {
              include: {
                engravingArt: {
                  where: { isActive: true },
                  orderBy: { position: 'asc' },
                },
              },
            },
            color: {
              include: {
                pantoneChips: {
                  include: { pantone: true },
                  orderBy: { orderIndex: 'asc' },
                },
              },
            },
            engravings: {
              include: {
                engravingArt: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(purchaseOrders)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = purchaseOrderCreateSchema.parse(body)

    // Generate PO number atomically and create PO in same transaction
    const purchaseOrder = await prisma.$transaction(async (tx) => {
      const poNumber = await (async () => {
        const now = new Date()
        const year = now.getFullYear()
        const month = (now.getMonth() + 1).toString().padStart(2, '0')
        const prefix = `PO-${year}-${month}-`

        const existingPOs = await tx.purchaseOrder.findMany({
          where: { poNumber: { startsWith: prefix } },
          select: { poNumber: true },
          orderBy: { poNumber: 'desc' },
          take: 1,
        })

        let counter = 1
        if (existingPOs.length > 0) {
          const lastNum = existingPOs[0].poNumber.replace(prefix, '')
          const parsed = parseInt(lastNum, 10)
          if (!isNaN(parsed)) {
            counter = parsed + 1
          }
        }

        return `${prefix}${counter.toString().padStart(3, '0')}`
      })()

      return tx.purchaseOrder.create({
        data: {
          poNumber,
          supplierId: validated.supplierId,
          status: 'PROTOTYPE',
          notes: validated.notes || null,
          lineItems: {
            create: validated.lineItems.map((item) => ({
              productId: item.productId,
              colorId: item.colorId || null,
              ringColor: item.ringColor || null,
              quantity: item.quantity,
              engravings: item.engravings?.length ? {
                create: item.engravings.map((eng) => ({
                  engravingArtId: eng.engravingArtId,
                })),
              } : undefined,
            })),
          },
        },
        include: {
          supplier: true,
          lineItems: {
            include: {
              product: {
                include: {
                  engravingArt: {
                    where: { isActive: true },
                    orderBy: { position: 'asc' },
                  },
                },
              },
              color: {
                include: {
                  pantoneChips: {
                    include: { pantone: true },
                    orderBy: { orderIndex: 'asc' },
                  },
                },
              },
              engravings: {
                include: {
                  engravingArt: true,
                },
              },
            },
          },
        },
      })
    })

    return NextResponse.json(purchaseOrder, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
