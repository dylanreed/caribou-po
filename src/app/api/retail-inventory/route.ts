import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

interface ShopifyVariant {
  id: number
  title: string
  inventory_quantity: number
  available: boolean
  price: string
  sku: string
}

interface ShopifyProduct {
  product: {
    id: number
    title: string
    variants: ShopifyVariant[]
  }
}

interface VariantInventory {
  id: number
  title: string
  quantity: number
  available: boolean
  price: string
  sku: string
}

// Fetch inventory from a Shopify store
async function fetchShopifyInventory(productUrl: string, productHandle: string | null): Promise<{
  totalInventory: number
  variants: VariantInventory[]
} | null> {
  try {
    // Extract base URL and construct JSON endpoint
    const urlObj = new URL(productUrl)
    const handle = productHandle || urlObj.pathname.split('/products/')[1]?.split('/')[0]

    if (!handle) {
      console.error('Could not extract product handle from URL:', productUrl)
      return null
    }

    const jsonUrl = `${urlObj.origin}/products/${handle}.json`

    const response = await fetch(jsonUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; InventoryTracker/1.0)',
      },
      next: { revalidate: 0 }, // Don't cache
    })

    if (!response.ok) {
      console.error(`Failed to fetch ${jsonUrl}: ${response.status}`)
      return null
    }

    const data: ShopifyProduct = await response.json()

    const variants: VariantInventory[] = data.product.variants.map((v) => ({
      id: v.id,
      title: v.title,
      quantity: v.inventory_quantity ?? 0,
      available: v.available ?? false,
      price: v.price,
      sku: v.sku || '',
    }))

    const totalInventory = variants.reduce((sum, v) => sum + Math.max(0, v.quantity), 0)

    return { totalInventory, variants }
  } catch (error) {
    console.error('Error fetching Shopify inventory:', error)
    return null
  }
}

// GET: Fetch latest inventory for a product or all products
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const productId = searchParams.get('productId')

  const where: { isActive: boolean; productId?: string } = { isActive: true }
  if (productId) {
    where.productId = productId
  }

  const retailProducts = await prisma.retailProduct.findMany({
    where,
    include: {
      product: { select: { id: true, name: true, sku: true } },
      retailer: true,
      snapshots: {
        orderBy: { fetchedAt: 'desc' },
        take: 10, // Last 10 snapshots for trend data
      },
    },
  })

  return NextResponse.json(retailProducts)
}

// POST: Refresh inventory for specified retail products
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { retailProductIds } = body as { retailProductIds?: string[] }

  // If no IDs specified, refresh all active retail products
  const where: { isActive: boolean; id?: { in: string[] } } = { isActive: true }
  if (retailProductIds && retailProductIds.length > 0) {
    where.id = { in: retailProductIds }
  }

  const retailProducts = await prisma.retailProduct.findMany({
    where,
    include: {
      retailer: true,
      product: { select: { name: true } },
    },
  })

  const results = []

  for (const rp of retailProducts) {
    const inventory = await fetchShopifyInventory(rp.productUrl, rp.productHandle)

    if (inventory) {
      // Create a new snapshot
      const snapshot = await prisma.inventorySnapshot.create({
        data: {
          retailProductId: rp.id,
          totalInventory: inventory.totalInventory,
          variantData: JSON.stringify(inventory.variants),
        },
      })

      results.push({
        retailProductId: rp.id,
        retailer: rp.retailer.name,
        product: rp.product.name,
        success: true,
        totalInventory: inventory.totalInventory,
        variants: inventory.variants,
        snapshotId: snapshot.id,
      })
    } else {
      results.push({
        retailProductId: rp.id,
        retailer: rp.retailer.name,
        product: rp.product.name,
        success: false,
        error: 'Failed to fetch inventory',
      })
    }
  }

  return NextResponse.json({
    refreshed: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  })
}
