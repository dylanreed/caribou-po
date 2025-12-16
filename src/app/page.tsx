import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { ImportPOButton } from '@/components/ImportPOButton'
import { RetailInventoryWidget } from '@/components/RetailInventoryWidget'

export const dynamic = 'force-dynamic'

async function getStats() {
  const [
    totalPOs,
    totalSuppliers,
    totalProducts,
    releasedCount,
    // Get POs by status with details for the pipeline view
    prototypePOsList,
    approvedPOsList,
    orderedPOsList,
    inProductionPOsList,
    shippedPOsList,
    receivedPOsList,
    packagedPOsList,
  ] = await Promise.all([
    prisma.purchaseOrder.count(),
    prisma.supplier.count(),
    prisma.product.count(),
    prisma.purchaseOrder.count({ where: { status: 'RELEASED' } }),
    prisma.purchaseOrder.findMany({
      where: { status: 'PROTOTYPE' },
      orderBy: { createdAt: 'desc' },
      include: { supplier: true, lineItems: true },
    }),
    prisma.purchaseOrder.findMany({
      where: { status: 'APPROVED' },
      orderBy: { updatedAt: 'desc' },
      include: { supplier: true, lineItems: true },
    }),
    prisma.purchaseOrder.findMany({
      where: { status: 'ORDERED' },
      orderBy: { sentAt: 'desc' },
      include: { supplier: true, lineItems: true },
    }),
    prisma.purchaseOrder.findMany({
      where: { status: 'IN_PRODUCTION' },
      orderBy: { updatedAt: 'desc' },
      include: { supplier: true, lineItems: true },
    }),
    prisma.purchaseOrder.findMany({
      where: { status: 'SHIPPED' },
      orderBy: { shippedAt: 'desc' },
      include: { supplier: true, lineItems: true },
    }),
    prisma.purchaseOrder.findMany({
      where: { status: 'RECEIVED' },
      orderBy: { receivedAt: 'desc' },
      include: { supplier: true, lineItems: true },
    }),
    prisma.purchaseOrder.findMany({
      where: { status: 'PACKAGED' },
      orderBy: { packagedAt: 'desc' },
      include: { supplier: true, lineItems: true },
    }),
  ])

  // Fetch retail inventory data separately - wrapped in try-catch for resilience
  type RetailInventoryItem = {
    id: string
    productId: string
    retailerId: string
    productUrl: string
    productHandle: string | null
    isActive: boolean
    createdAt: Date
    updatedAt: Date
    product: { id: string; name: string; sku: string; lastReleasedAt: Date | null }
    retailer: { id: string; name: string; sortOrder: number }
    snapshots: { totalInventory: number; variantData: string; fetchedAt: Date }[]
  }
  let retailInventory: RetailInventoryItem[] = []
  try {
    retailInventory = await prisma.retailProduct.findMany({
      where: { isActive: true },
      include: {
        product: { select: { id: true, name: true, sku: true, lastReleasedAt: true } },
        retailer: { select: { id: true, name: true, sortOrder: true } },
        snapshots: {
          orderBy: { fetchedAt: 'desc' },
          take: 1,
        },
      },
    }) as RetailInventoryItem[]
  } catch (e) {
    console.error('Failed to fetch retail inventory:', e)
  }

  return {
    totalPOs,
    totalSuppliers,
    totalProducts,
    releasedCount,
    prototypePOsList,
    approvedPOsList,
    orderedPOsList,
    inProductionPOsList,
    shippedPOsList,
    receivedPOsList,
    packagedPOsList,
    retailInventory,
  }
}

function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

// Calculate days since a date
function daysSince(date: Date | null): number | null {
  if (!date) return null
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

// Get time indicator color based on age
function getAgeColor(days: number | null): string {
  if (days === null) return 'text-gray-400'
  if (days <= 7) return 'text-green-600'
  if (days <= 14) return 'text-yellow-600'
  if (days <= 30) return 'text-orange-600'
  return 'text-red-600'
}

export default async function DashboardPage() {
  const stats = await getStats()

  const stages = [
    {
      id: 'PROTOTYPE',
      title: 'Prototype',
      subtitle: 'Awaiting sample',
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-300',
      pos: stats.prototypePOsList,
      dateField: 'createdAt' as const,
      dateLabel: 'Created',
    },
    {
      id: 'APPROVED',
      title: 'Approved',
      subtitle: 'Ready to order',
      color: 'bg-indigo-500',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-300',
      pos: stats.approvedPOsList,
      dateField: 'updatedAt' as const,
      dateLabel: 'Approved',
    },
    {
      id: 'ORDERED',
      title: 'Ordered',
      subtitle: 'Sent to factory',
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-300',
      pos: stats.orderedPOsList,
      dateField: 'sentAt' as const,
      dateLabel: 'Sent',
    },
    {
      id: 'IN_PRODUCTION',
      title: 'In Production',
      subtitle: 'Being manufactured',
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-300',
      pos: stats.inProductionPOsList,
      dateField: 'updatedAt' as const,
      dateLabel: 'Updated',
    },
    {
      id: 'SHIPPED',
      title: 'Shipped',
      subtitle: 'In transit',
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-300',
      pos: stats.shippedPOsList,
      dateField: 'shippedAt' as const,
      dateLabel: 'Shipped',
    },
    {
      id: 'RECEIVED',
      title: 'Received',
      subtitle: 'At warehouse',
      color: 'bg-teal-500',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-300',
      pos: stats.receivedPOsList,
      dateField: 'receivedAt' as const,
      dateLabel: 'Received',
    },
    {
      id: 'PACKAGED',
      title: 'Packaged',
      subtitle: 'Ready to sell',
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-300',
      pos: stats.packagedPOsList,
      dateField: 'packagedAt' as const,
      dateLabel: 'Packaged',
    },
  ]

  return (
    <div>
      {/* Quick Actions */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/purchase-orders/new"
            className="bg-maroon-800 hover:bg-maroon-900 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
          >
            Create New PO
          </Link>
          <Link
            href="/suppliers/new"
            className="bg-white hover:bg-gray-50 text-gray-700 px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm border border-gray-300"
          >
            Add Supplier
          </Link>
          <Link
            href="/products/new"
            className="bg-white hover:bg-gray-50 text-gray-700 px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm border border-gray-300"
          >
            Add Product
          </Link>
          <ImportPOButton />
        </div>
      </div>

      {/* Production Pipeline - Status Cards */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Production Pipeline</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {stages.map((stage, index) => (
            <div key={stage.id} className="relative">
              {/* Connector arrow between cards (desktop only) */}
              {index < stages.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-2 transform -translate-y-1/2 z-10">
                  <div className="w-4 h-4 border-t-2 border-r-2 border-gray-300 transform rotate-45"></div>
                </div>
              )}

              <div className={`${stage.bgColor} border-2 ${stage.borderColor} rounded-lg overflow-hidden h-full`}>
                {/* Stage Header */}
                <div className={`${stage.color} px-4 py-2 flex items-center justify-between`}>
                  <div className="text-white">
                    <div className="font-semibold">{stage.title}</div>
                    <div className="text-xs text-white/80">{stage.subtitle}</div>
                  </div>
                  <div className="bg-white/20 text-white text-xl font-bold px-3 py-1 rounded-full">
                    {stage.pos.length}
                  </div>
                </div>

                {/* PO List */}
                <div className="p-3 max-h-64 overflow-y-auto">
                  {stage.pos.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-4">No orders</p>
                  ) : (
                    <div className="space-y-2">
                      {stage.pos.map((po) => {
                        const stageDate = po[stage.dateField]
                        const days = daysSince(stageDate)
                        return (
                          <Link
                            key={po.id}
                            href={`/purchase-orders/${po.id}`}
                            className="block bg-white rounded-md p-2.5 shadow-sm hover:shadow-md transition-shadow border border-gray-100"
                          >
                            <div className="flex justify-between items-start">
                              <div className="font-medium text-gray-900 text-sm">
                                {po.poNumber}
                              </div>
                              <div className={`text-xs ${getAgeColor(days)}`}>
                                {days !== null ? (days === 0 ? 'Today' : `${days}d`) : '-'}
                              </div>
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {po.supplier.displayName || po.supplier.name}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {po.lineItems.length} item{po.lineItems.length !== 1 ? 's' : ''}
                              {stageDate && (
                                <span className="ml-2">
                                  {stage.dateLabel}: {formatDate(stageDate)}
                                </span>
                              )}
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* View All Link */}
                <div className="px-3 pb-3">
                  <Link
                    href={`/purchase-orders?status=${stage.id}`}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    View all {stage.title.toLowerCase()} &rarr;
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Archived/Released Link */}
        {stats.releasedCount > 0 && (
          <div className="mt-4 text-center">
            <Link
              href="/purchase-orders?status=RELEASED"
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
            >
              <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs font-medium">
                {stats.releasedCount}
              </span>
              Released (Archived) orders
              <span>&rarr;</span>
            </Link>
          </div>
        )}
      </div>

      {/* Summary Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500">Total POs</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {stats.totalPOs}
              </div>
            </div>
            <Link
              href="/purchase-orders"
              className="text-maroon-800 hover:text-maroon-900 text-sm"
            >
              View all &rarr;
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500">Suppliers</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {stats.totalSuppliers}
              </div>
            </div>
            <Link
              href="/suppliers"
              className="text-maroon-800 hover:text-maroon-900 text-sm"
            >
              Manage &rarr;
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500">Products</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {stats.totalProducts}
              </div>
            </div>
            <Link
              href="/products"
              className="text-maroon-800 hover:text-maroon-900 text-sm"
            >
              Manage &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Retail Inventory Tracking */}
      {stats.retailInventory.length > 0 && (
        <RetailInventoryWidget
          retailInventory={stats.retailInventory.map(ri => ({
            id: ri.id,
            productId: ri.product.id,
            productName: ri.product.name,
            productSku: ri.product.sku,
            productLastReleasedAt: ri.product.lastReleasedAt?.toISOString() ?? null,
            retailerId: ri.retailer.id,
            retailerName: ri.retailer.name,
            totalInventory: ri.snapshots[0]?.totalInventory ?? null,
            variantData: ri.snapshots[0]?.variantData ?? null,
            fetchedAt: ri.snapshots[0]?.fetchedAt?.toISOString() ?? null,
          }))}
        />
      )}
    </div>
  )
}
