import { prisma } from '@/lib/prisma'
import { PurchaseOrderForm } from '@/components/PurchaseOrderForm'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface EditPurchaseOrderPageProps {
  params: { id: string }
}

export default async function EditPurchaseOrderPage({
  params,
}: EditPurchaseOrderPageProps) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: params.id },
    include: {
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
          color: true,
          engravings: true,
        },
      },
    },
  })

  if (!po) {
    notFound()
  }

  const formData = {
    id: po.id,
    poNumber: po.poNumber,
    createdAt: po.createdAt.toISOString(),
    supplierId: po.supplierId,
    notes: po.notes || '',
    lineItems: po.lineItems.map((item) => ({
      productId: item.productId,
      colorId: item.colorId,
      ringColor: item.ringColor || '',
      quantity: item.quantity,
      product: item.product,
      color: item.color,
      engravings: item.engravings.map((e) => ({
        engravingArtId: e.engravingArtId,
      })),
    })),
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/purchase-orders/${po.id}`}
          className="text-maroon-800 hover:text-maroon-900 text-sm"
        >
          &larr; Back to {po.poNumber}
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-2">
          Edit {po.poNumber}
        </h1>
      </div>
      <PurchaseOrderForm initialData={formData} />
    </div>
  )
}
