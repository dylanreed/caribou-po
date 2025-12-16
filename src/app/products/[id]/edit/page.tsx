import { prisma } from '@/lib/prisma'
import { ProductForm } from '@/components/ProductForm'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface EditProductPageProps {
  params: { id: string }
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const [product, retailers, suppliers] = await Promise.all([
    prisma.product.findUnique({
      where: { id: params.id },
      include: {
        engravingArt: {
          orderBy: { position: 'asc' },
        },
        quotes: {
          orderBy: { quoteDate: 'desc' },
        },
        retailProducts: {
          include: {
            retailer: true,
            snapshots: {
              orderBy: { fetchedAt: 'desc' },
              take: 1,
            },
          },
        },
        suppliers: {
          include: {
            supplier: true,
          },
          orderBy: { isPrimary: 'desc' },
        },
      },
    }),
    prisma.retailer.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.supplier.findMany({
      orderBy: { name: 'asc' },
    }),
  ])

  if (!product) {
    notFound()
  }

  const formData = {
    id: product.id,
    sku: product.sku,
    name: product.name,
    description: product.description || '',
    imageUrl: product.imageUrl || '',
    unitPrice: product.unitPrice.toString(),
    unit: product.unit,
    category: product.category || '',
    material: product.material || '',
    isActive: product.isActive,
    lastReleasedAt: product.lastReleasedAt?.toISOString() || null,
    engravingArt: product.engravingArt,
    quotes: product.quotes.map(q => ({
      id: q.id,
      quoteDate: q.quoteDate.toISOString(),
      quoteType: q.quoteType,
      unitPrice: q.unitPrice,
      notes: q.notes,
    })),
    retailProducts: product.retailProducts.map(rp => ({
      id: rp.id,
      retailerId: rp.retailerId,
      retailerName: rp.retailer.name,
      productUrl: rp.productUrl,
      latestSnapshot: rp.snapshots[0] ? {
        totalInventory: rp.snapshots[0].totalInventory,
        variantData: rp.snapshots[0].variantData,
        fetchedAt: rp.snapshots[0].fetchedAt.toISOString(),
      } : null,
    })),
    retailers: retailers.map(r => ({
      id: r.id,
      name: r.name,
      baseUrl: r.baseUrl,
    })),
    productSuppliers: product.suppliers.map(ps => ({
      id: ps.id,
      supplierId: ps.supplierId,
      supplierName: ps.supplier.displayName || ps.supplier.name,
      supplierFullName: ps.supplier.name,
      isPrimary: ps.isPrimary,
    })),
    allSuppliers: suppliers.map(s => ({
      id: s.id,
      name: s.name,
      displayName: s.displayName,
    })),
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/products"
          className="text-maroon-800 hover:text-maroon-900 text-sm"
        >
          &larr; Back to Products
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-2">Edit Product</h1>
      </div>
      <ProductForm initialData={formData} />
    </div>
  )
}
